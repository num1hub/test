import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { execFileSync, spawn } from 'child_process';
import { z } from 'zod';
import { logActivity } from '@/lib/activity';
import { getLocalCodexAvailability, runLocalCodexStructuredTask } from '@/lib/agents/localCodex';
import {
  generateTextWithAiProvider,
  getResolvedAiProviderCatalog,
  type AiProviderCatalogEntry,
} from '@/lib/ai/providerRuntime';
import { type AiWalletProviderId, aiWalletProviderIdSchema } from '@/lib/aiWalletSchema';
import { readCapsulesFromDisk } from '@/lib/capsuleVault';
import { dataPath } from '@/lib/dataPath';
import { readBranchManifest, readOverlayCapsule, writeOverlayCapsule } from '@/lib/diff/branch-manager';
import { computeIntegrityHash, stableHash } from '@/lib/validator/utils';
import type { SovereignCapsule } from '@/types/capsule';

const AGENTS_DIR = dataPath('private', 'agents');
const VAULT_STEWARD_CONFIG_PATH = path.join(AGENTS_DIR, 'vault-steward.config.json');
const VAULT_STEWARD_RUNTIME_PATH = path.join(AGENTS_DIR, 'vault-steward.runtime.json');
const VAULT_STEWARD_HISTORY_PATH = path.join(AGENTS_DIR, 'vault-steward.history.jsonl');
const VAULT_STEWARD_QUEUE_PATH = path.join(AGENTS_DIR, 'vault-steward.queue.json');
const VAULT_STEWARD_LATEST_PATH = path.join(AGENTS_DIR, 'vault-steward.latest.json');
const VAULT_STEWARD_LOG_PATH = path.join(AGENTS_DIR, 'vault-steward.log');
const VAULT_STEWARD_SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'vault-steward.ts');
const TSX_CLI_PATH = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');

type VaultStewardProcessEntry = {
  pid: number;
  ppid: number | null;
  pgid: number | null;
  command: string;
};

const vaultStewardModeSchema = z.enum(['continuous', 'nightly']);
const vaultStewardWorkstreamSchema = z.enum(['decomposition', 'markup', 'graph_refactor', 'mixed']);
const vaultStewardPrioritySchema = z.enum(['high', 'medium', 'low']);
const MAX_AUTONOMOUS_EXECUTOR_JOBS_PER_RUN = 2;
const CODEX_FOREMAN_TIMEOUT_COOLDOWN_MS = 30 * 60 * 1000;
const CODEX_FOREMAN_MIN_INTERVAL_MS = 20 * 60 * 1000;
const CAPSULE_RECENT_ACTIVITY_WINDOW_MS = 12 * 60 * 60 * 1000;
const CAPSULE_RECENT_ACTIVITY_MAX_COMPLETED = 2;
const CODEX_FOREMAN_MAX_SCOUT_OBSERVATIONS = 5;
const CODEX_FOREMAN_MAX_SCOUT_ACTIONS = 5;
const CODEX_FOREMAN_MAX_SCOUT_TARGETS = 4;
const CODEX_FOREMAN_MAX_SCOUT_JOBS = 4;
const CODEX_FOREMAN_MAX_QUEUE_CONTEXT = 4;
const SWARM_API_PROVIDER_EXCLUSIONS = new Set<AiWalletProviderId>([
  'codex_subscription',
  'claude_subscription',
  'n1_subscription',
]);

const vaultStewardConfigSchema = z.object({
  version: z.literal(1),
  enabled: z.boolean(),
  provider: aiWalletProviderIdSchema.nullable(),
  model: z.string().trim().max(160).nullable(),
  mode: vaultStewardModeSchema,
  interval_minutes: z.number().int().min(1).max(1440),
  night_start_hour: z.number().int().min(0).max(23),
  night_end_hour: z.number().int().min(0).max(23),
  timezone: z.string().trim().max(120).nullable(),
  max_targets_per_run: z.number().int().min(1).max(12),
  updated_at: z.string().datetime(),
});

const vaultStewardRuntimeSchema = z.object({
  version: z.literal(1),
  pid: z.number().int().positive().nullable(),
  status: z.enum(['stopped', 'starting', 'running']),
  started_at: z.string().datetime().nullable(),
  last_heartbeat_at: z.string().datetime().nullable(),
  last_run_at: z.string().datetime().nullable(),
  last_exit_at: z.string().datetime().nullable(),
  latest_run_id: z.string().trim().nullable(),
  loop_count: z.number().int().min(0),
  idle_streak: z.number().int().min(0).default(0),
  next_scheduled_at: z.string().datetime().nullable().default(null),
  last_error: z.string().trim().nullable(),
  updated_at: z.string().datetime(),
});

const vaultStewardTargetSchema = z.object({
  capsule_id: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  priority: vaultStewardPrioritySchema.default('medium'),
});

const vaultStewardDraftJobSchema = z.object({
  label: z.string().trim().min(1),
  goal: z.string().trim().min(1),
  workstream: vaultStewardWorkstreamSchema.default('mixed'),
  capsule_ids: z.array(z.string().trim().min(1)).min(1).max(12),
  suggested_branch: z.enum(['dream', 'real']).default('dream'),
  needs_human_confirmation: z.boolean().default(true),
});

const vaultStewardJobSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  goal: z.string().trim().min(1),
  workstream: vaultStewardWorkstreamSchema,
  capsule_ids: z.array(z.string().trim().min(1)).min(1).max(12),
  suggested_branch: z.enum(['dream', 'real']).default('dream'),
  needs_human_confirmation: z.boolean().default(true),
  created_at: z.string().datetime(),
  source_run_id: z.string().trim().min(1),
  status: z.enum(['queued', 'accepted', 'completed', 'dismissed']).default('queued'),
});

const vaultStewardLaneReportSchema = z.object({
  id: z.enum(['scout', 'foreman', 'reviewer', 'maintainer']),
  label: z.string().trim().min(1),
  engine: z.enum(['provider', 'local_codex']),
  status: z.enum(['completed', 'failed', 'skipped']),
  provider: z.string().trim().nullable(),
  model: z.string().trim().nullable(),
  summary: z.string().trim().min(1),
  error: z.string().trim().nullable().default(null),
});

const vaultStewardLaneStateSchema = z.object({
  id: z.enum(['scout', 'foreman', 'reviewer', 'maintainer']),
  label: z.string().trim().min(1),
  engine: z.enum(['provider', 'local_codex']),
  state: z.enum(['ready', 'cooldown', 'unavailable']),
  available: z.boolean(),
  provider: z.string().trim().nullable(),
  model: z.string().trim().nullable(),
  plan_type: z.string().trim().nullable().default(null),
  detail: z.string().trim().min(1),
  cooldown_until: z.string().datetime().nullable().default(null),
});

const vaultStewardSwarmSchema = z.object({
  mode: z.enum(['unavailable', 'provider_only', 'hybrid_ready', 'hybrid_active']),
  summary: z.string().trim().min(1),
  ready_provider_count: z.number().int().min(0),
  default_provider: z.string().trim().nullable(),
  codex_available: z.boolean(),
  codex_plan_type: z.string().trim().nullable().default(null),
  lanes: z.array(vaultStewardLaneStateSchema).max(4),
});

const vaultStewardRunSchema = z.object({
  run_id: z.string().trim().min(1),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
  status: z.enum(['completed', 'failed', 'skipped']),
  reason: z.string().trim().min(1),
  provider: aiWalletProviderIdSchema.nullable(),
  model: z.string().trim().nullable(),
  overview: z.string().trim().min(1),
  workstream: vaultStewardWorkstreamSchema,
  observations: z.array(z.string().trim().min(1)).max(12),
  suggested_actions: z.array(z.string().trim().min(1)).max(12),
  targets: z.array(vaultStewardTargetSchema).max(12),
  proposed_jobs: z.array(vaultStewardJobSchema).max(12),
  executed_jobs: z.array(vaultStewardJobSchema).max(12).default([]),
  lane_reports: z.array(vaultStewardLaneReportSchema).max(5).default([]),
  raw_text: z.string().nullable(),
  graph_snapshot: z.object({
    total_capsules: z.number().int().min(0),
    orphaned_capsules: z.number().int().min(0),
    by_type: z.record(z.string(), z.number().int().min(0)),
  }),
});

const vaultStewardQueueSchema = z.object({
  version: z.literal(1),
  updated_at: z.string().datetime(),
  jobs: z.array(vaultStewardJobSchema),
});

const vaultStewardUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  provider: aiWalletProviderIdSchema.or(z.literal('auto')).nullable().optional(),
  model: z.string().trim().max(160).optional(),
  mode: vaultStewardModeSchema.optional(),
  interval_minutes: z.number().int().min(1).max(1440).optional(),
  night_start_hour: z.number().int().min(0).max(23).optional(),
  night_end_hour: z.number().int().min(0).max(23).optional(),
  timezone: z.string().trim().max(120).nullable().optional(),
  max_targets_per_run: z.number().int().min(1).max(12).optional(),
});

const aiOutputSchema = z.object({
  overview: z.string().trim().min(1),
  workstream: vaultStewardWorkstreamSchema.default('mixed'),
  observations: z.array(z.string().trim().min(1)).max(12).default([]),
    suggested_actions: z.array(z.string().trim().min(1)).max(12).default([]),
    targets: z.array(vaultStewardTargetSchema).max(12).default([]),
    proposed_jobs: z.array(vaultStewardDraftJobSchema).max(12).default([]),
  });

const codexSupervisorOutputSchema = z.object({
  overview: z.string().trim().min(1),
  workstream: vaultStewardWorkstreamSchema.default('mixed'),
  observations: z.array(z.string().trim().min(1)).max(12).default([]),
  suggested_actions: z.array(z.string().trim().min(1)).max(12).default([]),
  targets: z.array(vaultStewardTargetSchema).max(12).default([]),
  proposed_jobs: z.array(vaultStewardDraftJobSchema).max(12).default([]),
  supervisor_summary: z.string().trim().min(1),
});

const codexReviewerOutputSchema = z.object({
  review_summary: z.string().trim().min(1),
  operator_focus: z.array(z.string().trim().min(1)).max(8).default([]),
  risk_flags: z.array(z.string().trim().min(1)).max(8).default([]),
  cancel_job_ids: z.array(z.string().trim().min(1)).max(12).default([]),
});

const executorOutputSchema = z.object({
  updates: z
    .array(
      z.object({
        capsule_id: z.string().trim().min(1),
        updated_summary: z.string().trim().min(1),
        added_keywords: z
          .array(z.string().trim().min(1))
          .default([])
          .transform((values) => values.slice(0, 8)),
        maintenance_note: z.string().trim().min(1),
        rationale: z.string().trim().min(1),
      }),
    )
    .max(12)
    .default([]),
});

export type VaultStewardConfig = z.infer<typeof vaultStewardConfigSchema>;
export type VaultStewardRuntime = z.infer<typeof vaultStewardRuntimeSchema>;
export type VaultStewardRun = z.infer<typeof vaultStewardRunSchema>;
export type VaultStewardJob = z.infer<typeof vaultStewardJobSchema>;
export type VaultStewardQueue = z.infer<typeof vaultStewardQueueSchema>;
export type VaultStewardUpdateInput = z.infer<typeof vaultStewardUpdateSchema>;

export interface VaultStewardState {
  config: VaultStewardConfig;
  runtime: VaultStewardRuntime;
  latest_run: VaultStewardRun | null;
  queue: VaultStewardQueue;
  swarm: z.infer<typeof vaultStewardSwarmSchema>;
}

interface CapsuleSignal {
  capsule_id: string;
  name: string;
  type: string;
  subtype: string;
  status: string;
  outbound_links: number;
  inbound_links: number;
  summary_length: number;
  keyword_count: number;
  progress: number | null;
  reasons: string[];
}

interface VaultSignalSummary {
  total_capsules: number;
  orphaned_capsules: number;
  by_type: Record<string, number>;
  inventory: Array<{
    capsule_id: string;
    type: string;
    subtype: string;
    status: string;
    progress: number | null;
    outbound_links: number;
    inbound_links: number;
    summary_length: number;
    keyword_count: number;
  }>;
  candidates: CapsuleSignal[];
}

interface CapsuleQueueHistory {
  queuedOrAccepted: number;
  recentCompleted: number;
  completedWorkstreams: Set<string>;
  lastCompletedAtMs: number | null;
}

type AiOutput = z.infer<typeof aiOutputSchema>;

interface VaultStewardScoutResult {
  normalized: AiOutput;
  provider: AiWalletProviderId | null;
  model: string | null;
  rawText: string | null;
  reason: string;
  lane: z.infer<typeof vaultStewardLaneReportSchema>;
}

const DEFAULT_CONFIG = (): VaultStewardConfig => ({
  version: 1,
  enabled: false,
  provider: null,
  model: null,
  mode: 'nightly',
  interval_minutes: 30,
  night_start_hour: 1,
  night_end_hour: 6,
  timezone: null,
  max_targets_per_run: 6,
  updated_at: new Date(0).toISOString(),
});

const DEFAULT_RUNTIME = (): VaultStewardRuntime => ({
  version: 1,
  pid: null,
  status: 'stopped',
  started_at: null,
  last_heartbeat_at: null,
  last_run_at: null,
  last_exit_at: null,
  latest_run_id: null,
  loop_count: 0,
  idle_streak: 0,
  next_scheduled_at: null,
  last_error: null,
  updated_at: new Date(0).toISOString(),
});

const DEFAULT_QUEUE = (): VaultStewardQueue => ({
  version: 1,
  updated_at: new Date(0).toISOString(),
  jobs: [],
});

function nowIso(): string {
  return new Date().toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSwarmApiProvider(provider: AiWalletProviderId): boolean {
  return !SWARM_API_PROVIDER_EXCLUSIONS.has(provider);
}

export function rankSwarmApiProviders(
  catalog: Array<Pick<AiProviderCatalogEntry, 'provider' | 'available' | 'selectedByDefault'>>,
  preferredProvider?: AiWalletProviderId | null,
): AiWalletProviderId[] {
  const readyProviders = catalog
    .filter((entry) => entry.available && isSwarmApiProvider(entry.provider))
    .map((entry) => entry.provider);
  const selectedDefault = catalog.find(
    (entry) => entry.available && entry.selectedByDefault && isSwarmApiProvider(entry.provider),
  )?.provider;
  const primary =
    (preferredProvider && readyProviders.includes(preferredProvider) ? preferredProvider : null) ??
    selectedDefault ??
    readyProviders[0] ??
    null;

  return uniqueBy(
    [primary, ...readyProviders].filter((provider): provider is AiWalletProviderId => Boolean(provider)),
    (provider) => provider,
  );
}

async function getSwarmApiProviderOrder(
  preferredProvider?: AiWalletProviderId | null,
): Promise<AiWalletProviderId[]> {
  const catalog = await getResolvedAiProviderCatalog();
  return rankSwarmApiProviders(catalog, preferredProvider);
}

function isIdleMonitoringRun(run: VaultStewardRun): boolean {
  return (
    run.status === 'completed' &&
    run.targets.length === 0 &&
    run.proposed_jobs.length === 0 &&
    run.executed_jobs.length === 0
  );
}

export function computeAdaptiveDaemonDelay(
  config: VaultStewardConfig,
  run: VaultStewardRun,
  previousIdleStreak: number,
): { delayMs: number; idleStreak: number } {
  const baseDelayMs = Math.max(config.interval_minutes, 1) * 60 * 1000;
  if (!isIdleMonitoringRun(run)) {
    return {
      delayMs: baseDelayMs,
      idleStreak: 0,
    };
  }

  const idleStreak = previousIdleStreak + 1;
  const multiplier = Math.min(idleStreak + 1, 4);
  const maxDelayMs = Math.max(baseDelayMs, 2 * 60 * 60 * 1000);
  return {
    delayMs: Math.min(baseDelayMs * multiplier, maxDelayMs),
    idleStreak,
  };
}

function extractRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toNumberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function extractAffordableMaxTokens(message: string): number | null {
  const match = message.match(/can only afford (\d+)/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getBudgetRetryMaxTokens(message: string, requested: number): number | null {
  const affordable = extractAffordableMaxTokens(message);
  if (!affordable) return null;
  const bounded = Math.min(requested - 1, Math.max(200, affordable - 32));
  return bounded > 0 ? bounded : null;
}

async function ensureAgentsDir(): Promise<void> {
  await fsp.mkdir(AGENTS_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  try {
    const raw = JSON.parse(await fsp.readFile(filePath, 'utf-8')) as unknown;
    return schema.parse(raw);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback;
    }
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureAgentsDir();
  const directory = path.dirname(filePath);
  const tempPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  await fsp.writeFile(tempPath, JSON.stringify(value, null, 2), 'utf-8');
  await fsp.rename(tempPath, filePath);
}

function isProcessAlive(pid: number | null): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function isVaultStewardProcessCommand(command: string): boolean {
  return (
    command.includes('scripts/vault-steward.ts') ||
    command.includes(VAULT_STEWARD_SCRIPT_PATH) ||
    command.includes(TSX_CLI_PATH) ||
    command.includes('tsx/dist/cli.mjs') ||
    command.includes('tsx/dist/loader.mjs') ||
    command.includes('timeout 12h npm run vault-steward') ||
    command.includes('npm run vault-steward')
  );
}

function listVaultStewardProcesses(): VaultStewardProcessEntry[] {
  try {
    const raw = execFileSync('ps', ['-ww', '-eo', 'pid=,ppid=,pgid=,args='], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return uniqueBy(
      raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .flatMap((line) => {
          const match = line.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
          if (!match) return [];
          const [, pidText, ppidText, pgidText, command] = match;
          const pid = Number(pidText);
          const ppid = Number(ppidText);
          const pgid = Number(pgidText);
          if (!Number.isInteger(pid) || pid <= 0) return [];
          if (pid === process.pid) return [];
          return isVaultStewardProcessCommand(command)
            ? [
                {
                  pid,
                  ppid: Number.isInteger(ppid) && ppid > 0 ? ppid : null,
                  pgid: Number.isInteger(pgid) && pgid > 0 ? pgid : null,
                  command,
                },
              ]
            : [];
        }),
      (entry) => String(entry.pid),
    );
  } catch {
    return [];
  }
}

function listVaultStewardProcessIds(): number[] {
  return listVaultStewardProcesses().map((entry) => entry.pid);
}

async function terminateVaultStewardProcesses(excludePids: number[] = []): Promise<void> {
  const entries = listVaultStewardProcesses();
  const excluded = new Set(excludePids.filter((pid) => Number.isInteger(pid) && pid > 0));
  const excludedPgids = new Set(
    entries
      .filter((entry) => excluded.has(entry.pid) && entry.pgid)
      .map((entry) => entry.pgid as number),
  );
  const targetEntries = entries.filter((entry) => !excluded.has(entry.pid) && !excludedPgids.has(entry.pgid ?? -1));
  const targetPgids = uniqueBy(
    targetEntries
      .map((entry) => entry.pgid)
      .filter((pgid): pgid is number => typeof pgid === 'number' && Number.isInteger(pgid) && pgid > 0),
    (pgid) => String(pgid),
  );
  const targetPids = uniqueBy(
    targetEntries.map((entry) => entry.pid),
    (pid) => String(pid),
  );

  for (const pgid of targetPgids) {
    try {
      process.kill(-pgid, 'SIGTERM');
    } catch {
      // noop
    }
  }

  for (const pid of targetPids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // noop
    }
  }

  if (targetPids.length === 0) return;

  await sleep(250);

  for (const pid of targetPids) {
    if (!isProcessAlive(pid)) continue;
    const entry = targetEntries.find((candidate) => candidate.pid === pid);
    if (entry?.pgid) {
      try {
        process.kill(-entry.pgid, 'SIGKILL');
      } catch {
        // noop
      }
    }
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // noop
    }
  }
}

function normalizeRuntime(runtime: VaultStewardRuntime): VaultStewardRuntime {
  const alive = isProcessAlive(runtime.pid);
  if (alive) {
    if (runtime.status === 'running' || runtime.status === 'starting') return runtime;
    return {
      ...runtime,
      status: 'running',
      updated_at: nowIso(),
    };
  }

  if (runtime.status === 'stopped' && runtime.pid === null) return runtime;

  return {
    ...runtime,
    pid: null,
    status: 'stopped',
    last_exit_at: runtime.last_exit_at ?? nowIso(),
    updated_at: nowIso(),
  };
}

async function readConfig(): Promise<VaultStewardConfig> {
  return readJsonFile(VAULT_STEWARD_CONFIG_PATH, vaultStewardConfigSchema, DEFAULT_CONFIG());
}

async function writeConfig(config: VaultStewardConfig): Promise<void> {
  await writeJsonFile(VAULT_STEWARD_CONFIG_PATH, config);
}

async function readRuntime(): Promise<VaultStewardRuntime> {
  return normalizeRuntime(
    await readJsonFile(VAULT_STEWARD_RUNTIME_PATH, vaultStewardRuntimeSchema, DEFAULT_RUNTIME()),
  );
}

async function writeRuntime(runtime: VaultStewardRuntime): Promise<void> {
  await writeJsonFile(VAULT_STEWARD_RUNTIME_PATH, runtime);
}

async function readQueue(): Promise<VaultStewardQueue> {
  return readJsonFile(VAULT_STEWARD_QUEUE_PATH, vaultStewardQueueSchema, DEFAULT_QUEUE());
}

async function writeQueue(queue: VaultStewardQueue): Promise<void> {
  await writeJsonFile(VAULT_STEWARD_QUEUE_PATH, queue);
}

async function readLatestRun(): Promise<VaultStewardRun | null> {
  return readJsonFile(VAULT_STEWARD_LATEST_PATH, vaultStewardRunSchema.nullable(), null);
}

async function writeLatestRun(run: VaultStewardRun): Promise<void> {
  await writeJsonFile(VAULT_STEWARD_LATEST_PATH, run);
  await ensureAgentsDir();
  await fsp.appendFile(VAULT_STEWARD_HISTORY_PATH, `${JSON.stringify(run)}\n`, 'utf-8');
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function getCapsuleQueueHistory(
  queue: VaultStewardQueue,
  nowMs = Date.now(),
): Map<string, CapsuleQueueHistory> {
  const byCapsule = new Map<string, CapsuleQueueHistory>();

  const ensureHistory = (capsuleId: string): CapsuleQueueHistory => {
    const existing = byCapsule.get(capsuleId);
    if (existing) return existing;
    const next: CapsuleQueueHistory = {
      queuedOrAccepted: 0,
      recentCompleted: 0,
      completedWorkstreams: new Set<string>(),
      lastCompletedAtMs: null,
    };
    byCapsule.set(capsuleId, next);
    return next;
  };

  for (const job of queue.jobs) {
    const createdAtMs = Number.isFinite(Date.parse(job.created_at)) ? Date.parse(job.created_at) : null;
    for (const capsuleId of job.capsule_ids) {
      const history = ensureHistory(capsuleId);
      if (job.status === 'queued' || job.status === 'accepted') {
        history.queuedOrAccepted += 1;
      }
      if (job.status === 'completed') {
        history.completedWorkstreams.add(job.workstream);
        if (createdAtMs !== null && nowMs - createdAtMs <= CAPSULE_RECENT_ACTIVITY_WINDOW_MS) {
          history.recentCompleted += 1;
        }
        if (createdAtMs !== null) {
          history.lastCompletedAtMs = Math.max(history.lastCompletedAtMs ?? 0, createdAtMs);
        }
      }
    }
  }

  return byCapsule;
}

function shouldCooldownCapsule(
  history: CapsuleQueueHistory | undefined,
  nowMs = Date.now(),
): boolean {
  if (!history) return false;
  if (history.queuedOrAccepted > 0) return true;
  if (
    history.recentCompleted >= CAPSULE_RECENT_ACTIVITY_MAX_COMPLETED &&
    history.lastCompletedAtMs !== null &&
    nowMs - history.lastCompletedAtMs <= CAPSULE_RECENT_ACTIVITY_WINDOW_MS
  ) {
    return true;
  }
  return false;
}

function getJobIdentityKey(job: Pick<VaultStewardJob, 'workstream' | 'suggested_branch' | 'capsule_ids'>): string {
  return stableHash({
    workstream: job.workstream,
    suggested_branch: job.suggested_branch,
    capsule_ids: [...job.capsule_ids].sort(),
  });
}

function mergeDuplicateJob(existing: VaultStewardJob, incoming: VaultStewardJob): VaultStewardJob {
  if (existing.status === 'completed' || incoming.status === 'completed') {
    if (existing.status === 'completed' && incoming.status !== 'completed') {
      return isRecentCompletedJob(existing) ? existing : incoming;
    }
    if (incoming.status === 'completed' && existing.status !== 'completed') {
      return isRecentCompletedJob(incoming) ? incoming : existing;
    }

    const latestCompleted = existing.created_at >= incoming.created_at ? existing : incoming;
    return {
      ...latestCompleted,
      status: 'completed',
    };
  }

  if (existing.status === 'accepted' || incoming.status === 'accepted') {
    const accepted = existing.status === 'accepted' ? existing : incoming;
    const latest = existing.created_at >= incoming.created_at ? existing : incoming;
    return {
      ...latest,
      id: accepted.id,
      created_at: accepted.created_at,
      source_run_id: accepted.source_run_id,
      status: 'accepted',
    };
  }

  if (existing.status === 'dismissed' && incoming.status !== 'dismissed') {
    return incoming;
  }

  if (incoming.status === 'dismissed' && existing.status !== 'dismissed') {
    return existing;
  }

  return existing.created_at >= incoming.created_at ? existing : incoming;
}

function isRecentCompletedJob(job: VaultStewardJob, nowMs = Date.now()): boolean {
  if (job.status !== 'completed') return false;
  const createdAtMs = Number.isFinite(Date.parse(job.created_at)) ? Date.parse(job.created_at) : null;
  if (createdAtMs === null) return false;
  return nowMs - createdAtMs <= CAPSULE_RECENT_ACTIVITY_WINDOW_MS;
}

export function summarizeVaultSignals(capsules: SovereignCapsule[], maxTargets = 6): VaultSignalSummary {
  const byType: Record<string, number> = {};
  const inboundCounts = new Map<string, number>();
  const candidates: CapsuleSignal[] = [];

  for (const capsule of capsules) {
    const type = capsule.metadata.type ?? 'unknown';
    byType[type] = (byType[type] ?? 0) + 1;
    inboundCounts.set(capsule.metadata.capsule_id, inboundCounts.get(capsule.metadata.capsule_id) ?? 0);
  }

  for (const capsule of capsules) {
    for (const link of capsule.recursive_layer.links ?? []) {
      if (typeof link.target_id !== 'string') continue;
      inboundCounts.set(link.target_id, (inboundCounts.get(link.target_id) ?? 0) + 1);
    }
  }

  const inventory = capsules.map((capsule) => {
    const outboundLinks = Array.isArray(capsule.recursive_layer.links) ? capsule.recursive_layer.links.length : 0;
    const inboundLinks = inboundCounts.get(capsule.metadata.capsule_id) ?? 0;
    const summary = toStringValue(capsule.neuro_concentrate.summary).trim();
    const keywordCount = Array.isArray(capsule.neuro_concentrate.keywords)
      ? capsule.neuro_concentrate.keywords.filter((entry) => typeof entry === 'string' && entry.trim()).length
      : 0;
    return {
      capsule_id: capsule.metadata.capsule_id,
      type: capsule.metadata.type ?? 'unknown',
      subtype: capsule.metadata.subtype ?? 'atomic',
      status: capsule.metadata.status ?? 'unknown',
      progress: toNumberValue(capsule.metadata.progress),
      outbound_links: outboundLinks,
      inbound_links: inboundLinks,
      summary_length: summary.length,
      keyword_count: keywordCount,
    };
  });

  for (const capsule of capsules) {
    const outboundLinks = Array.isArray(capsule.recursive_layer.links) ? capsule.recursive_layer.links.length : 0;
    const inboundLinks = inboundCounts.get(capsule.metadata.capsule_id) ?? 0;
    const summary = toStringValue(capsule.neuro_concentrate.summary).trim();
    const keywordCount = Array.isArray(capsule.neuro_concentrate.keywords)
      ? capsule.neuro_concentrate.keywords.filter((entry) => typeof entry === 'string' && entry.trim()).length
      : 0;
    const reasons: string[] = [];

    if ((capsule.metadata.subtype ?? 'atomic') === 'hub' && outboundLinks >= 10) {
      reasons.push('hub with high link density may need decomposition review');
    }
    if (summary.length < 220) {
      reasons.push('summary is short enough to justify markup or enrichment');
    }
    if (keywordCount < 5) {
      reasons.push('keyword coverage is thin');
    }
    if (outboundLinks + inboundLinks <= 1) {
      reasons.push('capsule looks weakly connected in the current graph');
    }
    const progress = toNumberValue(capsule.metadata.progress);
    if (progress !== null && progress < 50 && capsule.metadata.status !== 'archived') {
      reasons.push('progress suggests unfinished structure that may need maintenance');
    }

    if (reasons.length === 0) continue;

    candidates.push({
      capsule_id: capsule.metadata.capsule_id,
      name: capsule.metadata.name ?? capsule.metadata.capsule_id,
      type: capsule.metadata.type ?? 'unknown',
      subtype: capsule.metadata.subtype ?? 'atomic',
      status: capsule.metadata.status ?? 'unknown',
      outbound_links: outboundLinks,
      inbound_links: inboundLinks,
      summary_length: summary.length,
      keyword_count: keywordCount,
      progress,
      reasons,
    });
  }

  const selectedCandidates = uniqueBy(
    [
      ...candidates.filter((entry) => entry.reasons.some((reason) => reason.includes('decomposition'))).sort((a, b) => b.outbound_links - a.outbound_links),
      ...candidates.filter((entry) => entry.reasons.some((reason) => reason.includes('weakly connected'))).sort((a, b) => (a.outbound_links + a.inbound_links) - (b.outbound_links + b.inbound_links)),
      ...candidates.filter((entry) => entry.reasons.some((reason) => reason.includes('summary') || reason.includes('keyword'))).sort((a, b) => a.summary_length - b.summary_length),
    ],
    (entry) => entry.capsule_id,
  ).slice(0, maxTargets);

  const orphaned = [...inboundCounts.entries()].filter(([capsuleId, count]) => {
    const capsule = capsules.find((entry) => entry.metadata.capsule_id === capsuleId);
    const outbound = capsule?.recursive_layer.links?.length ?? 0;
    return count + outbound === 0;
  }).length;

  return {
    total_capsules: capsules.length,
    orphaned_capsules: orphaned,
    by_type: byType,
    inventory,
    candidates: selectedCandidates,
  };
}

export function applyQueueCooldownToSummary(
  summary: VaultSignalSummary,
  queue: VaultStewardQueue,
  nowMs = Date.now(),
): VaultSignalSummary {
  const queueHistory = getCapsuleQueueHistory(queue, nowMs);
  const filteredCandidates = summary.candidates.filter(
    (candidate) => !shouldCooldownCapsule(queueHistory.get(candidate.capsule_id), nowMs),
  );

  if (filteredCandidates.length === 0) {
    return summary;
  }

  return {
    ...summary,
    candidates: filteredCandidates,
  };
}

function getDateParts(date: Date, timeZone: string | null): { year: string; month: string; day: string; hour: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone ?? undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const lookup = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return {
    year: lookup('year'),
    month: lookup('month'),
    day: lookup('day'),
    hour: Number.parseInt(lookup('hour'), 10),
  };
}

function isWithinWindow(config: VaultStewardConfig, now = new Date()): boolean {
  if (config.mode === 'continuous') return true;
  const parts = getDateParts(now, config.timezone);
  if (config.night_start_hour === config.night_end_hour) return true;
  if (config.night_start_hour < config.night_end_hour) {
    return parts.hour >= config.night_start_hour && parts.hour < config.night_end_hour;
  }
  return parts.hour >= config.night_start_hour || parts.hour < config.night_end_hour;
}

function extractFirstJsonObject(raw: string): unknown {
  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i) ?? raw.match(/```\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || raw.trim();
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as unknown;
    }
    throw new Error('No valid JSON object found in model output');
  }
}

function buildFallbackAnalysis(summary: VaultSignalSummary): AiOutput {
  return aiOutputSchema.parse({
    overview:
      'Vault Steward could not parse a structured JSON response, so it fell back to the highest-signal capsule maintenance targets extracted from the current graph.',
    workstream: 'mixed' as const,
    observations: summary.candidates.flatMap((candidate) => candidate.reasons.slice(0, 1)).slice(0, 6),
    suggested_actions: summary.candidates
      .slice(0, 4)
      .map((candidate) => `Review ${candidate.capsule_id} for ${candidate.reasons[0] ?? 'maintenance'}.`),
    targets: summary.candidates.slice(0, 4).map((candidate) => ({
      capsule_id: candidate.capsule_id,
      reason: candidate.reasons[0] ?? 'graph maintenance candidate',
      priority: candidate.outbound_links >= 10 ? 'high' : 'medium',
    })),
    proposed_jobs: [],
  });
}

function buildPrompt(
  summary: VaultSignalSummary,
  queue: VaultStewardQueue,
  options?: { compact?: boolean },
): { system: string; prompt: string } {
  const compact = options?.compact ?? false;
  const queuedJobs = queue.jobs.filter((job) => job.status === 'queued' || job.status === 'accepted');
  const completedJobs = queue.jobs.filter((job) => job.status === 'completed');
  const queueHistory = getCapsuleQueueHistory(queue);
  const cooldownCapsules = uniqueBy(
    summary.inventory
      .map((entry) => entry.capsule_id)
      .filter((capsuleId) => shouldCooldownCapsule(queueHistory.get(capsuleId))),
    (entry) => entry,
  ).slice(0, 12);
  const compactInventoryIds = summary.inventory.map((entry) => entry.capsule_id);
  const system = [
    'You are Vault Steward, a conservative autonomous agent for the N1Hub capsule vault.',
    'Your job is to analyze the current capsule graph and emit maintenance jobs, not to invent new doctrine.',
    'Return strict JSON only.',
    'Never claim that a capsule should be changed without a concrete reason grounded in the provided graph snapshot.',
    'Prefer queueable maintenance work for the Dream branch over unsafe direct writes to Real.',
  ].join(' ');

  const prompt = [
    'Analyze the N1Hub capsule vault snapshot below and produce the next highest-value bounded maintenance jobs.',
    '',
    `Total capsules: ${summary.total_capsules}`,
    `Orphaned capsules: ${summary.orphaned_capsules}`,
    `Type distribution: ${Object.entries(summary.by_type)
      .sort((left, right) => right[1] - left[1])
      .map(([type, count]) => `${type}:${count}`)
      .join(', ')}`,
    '',
    ...(compact
      ? [
          'Compact capsule inventory ids (full vault coverage):',
          ...Array.from({ length: Math.ceil(compactInventoryIds.length / 12) }, (_, index) =>
            `- ${compactInventoryIds.slice(index * 12, index * 12 + 12).join(', ')}`,
          ),
        ]
      : [
          'Full capsule inventory snapshot:',
          ...summary.inventory.map(
            (entry) =>
              `- ${entry.capsule_id} | ${entry.type}/${entry.subtype}/${entry.status} | progress=${entry.progress ?? 'n/a'} | links=${entry.outbound_links}/${entry.inbound_links} | summary=${entry.summary_length} | keywords=${entry.keyword_count}`,
          ),
        ]),
    '',
    compact ? 'Compact candidate capsules:' : 'Candidate capsules:',
    ...summary.candidates.map((candidate) =>
      compact
        ? `- ${candidate.capsule_id} | ${candidate.type}/${candidate.subtype}/${candidate.status} | links=${candidate.outbound_links}/${candidate.inbound_links} | summary=${candidate.summary_length} | keywords=${candidate.keyword_count} | reasons=${candidate.reasons.join(' | ')}`
        : [
            `- ${candidate.capsule_id}`,
            `  name: ${candidate.name}`,
            `  type/subtype/status: ${candidate.type}/${candidate.subtype}/${candidate.status}`,
            `  links: outbound=${candidate.outbound_links} inbound=${candidate.inbound_links}`,
            `  summary_length: ${candidate.summary_length}`,
            `  keywords: ${candidate.keyword_count}`,
            `  reasons: ${candidate.reasons.join(' | ')}`,
          ].join('\n'),
    ),
    '',
    'Existing queue context:',
    `- queued_or_accepted_jobs: ${queuedJobs.length}`,
    `- completed_jobs: ${completedJobs.length}`,
    ...(queuedJobs.length > 0
      ? [
          'Queued/accepted jobs:',
          ...queuedJobs.slice(0, 8).map(
            (job) =>
              compact
                ? `- ${job.label} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`
                : `- ${job.label} :: ${job.goal} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`,
          ),
        ]
      : ['Queued/accepted jobs: none']),
    ...(completedJobs.length > 0
      ? [
          'Recently completed jobs:',
          ...completedJobs.slice(0, 8).map(
            (job) =>
              compact
                ? `- ${job.label} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`
                : `- ${job.label} :: ${job.goal} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`,
          ),
        ]
      : ['Recently completed jobs: none']),
    '',
    'Capsules currently on maintenance cooldown because equivalent work is already in-flight or recently completed:',
    ...(cooldownCapsules.length > 0 ? cooldownCapsules.map((capsuleId) => `- ${capsuleId}`) : ['- none']),
    '',
    'Return JSON with this shape:',
    JSON.stringify(
      {
        overview: 'one short paragraph',
        workstream: 'decomposition | markup | graph_refactor | mixed',
        observations: ['short evidence-aware bullets'],
        suggested_actions: ['short next moves'],
        targets: [
          {
            capsule_id: 'capsule.foundation.example.v1',
            reason: 'why it matters now',
            priority: 'high',
          },
        ],
        proposed_jobs: [
          {
            label: 'short operator-facing job title',
            goal: 'what should be improved',
            workstream: 'decomposition',
            capsule_ids: ['capsule.foundation.example.v1'],
            suggested_branch: 'dream',
            needs_human_confirmation: true,
          },
        ],
      },
      null,
      2,
    ),
    '',
    'Constraints:',
    '- Max 5 observations.',
    '- Max 5 suggested_actions.',
    '- Max 5 targets.',
    '- Max 5 proposed_jobs.',
    '- Prefer the Dream branch unless a Real write is obviously a factual metadata correction.',
    '- Do not propose a job that duplicates a queued, accepted, or recently completed job with the same capsule_ids and workstream.',
  ].join('\n');

  return { system, prompt };
}

function buildScoutRepairPrompt(rawText: string): string {
  return [
    'The previous provider response for Vault Steward did not match the required strict JSON shape.',
    'Repair it into strict JSON only while preserving the original maintenance intent as closely as possible.',
    'Do not add markdown fences, explanation, or extra prose.',
    '',
    'Required JSON shape:',
    JSON.stringify(
      {
        overview: 'one short paragraph',
        workstream: 'decomposition | markup | graph_refactor | mixed',
        observations: ['short evidence-aware bullets'],
        suggested_actions: ['short next moves'],
        targets: [
          {
            capsule_id: 'capsule.foundation.example.v1',
            reason: 'why it matters now',
            priority: 'high',
          },
        ],
        proposed_jobs: [
          {
            label: 'short operator-facing job title',
            goal: 'what should be improved',
            workstream: 'decomposition',
            capsule_ids: ['capsule.foundation.example.v1'],
            suggested_branch: 'dream',
            needs_human_confirmation: true,
          },
        ],
      },
      null,
      2,
    ),
    '',
    'Original response to repair:',
    rawText,
  ].join('\n');
}

function buildCodexSupervisorPrompt(
  summary: VaultSignalSummary,
  scout: VaultStewardScoutResult,
  queue: VaultStewardQueue,
): string {
  const compactObservations = scout.normalized.observations.slice(0, CODEX_FOREMAN_MAX_SCOUT_OBSERVATIONS);
  const compactActions = scout.normalized.suggested_actions.slice(0, CODEX_FOREMAN_MAX_SCOUT_ACTIONS);
  const compactTargets = scout.normalized.targets.slice(0, CODEX_FOREMAN_MAX_SCOUT_TARGETS);
  const compactJobs = scout.normalized.proposed_jobs.slice(0, CODEX_FOREMAN_MAX_SCOUT_JOBS);
  const scoutTargets =
    compactTargets.length > 0
      ? scout.normalized.targets
          .slice(0, CODEX_FOREMAN_MAX_SCOUT_TARGETS)
          .map((target) => `- ${target.capsule_id} [${target.priority}] ${target.reason}`)
          .join('\n')
      : '- none';
  const scoutJobs =
    compactJobs.length > 0
      ? compactJobs
          .map(
            (job) =>
              `- ${job.label} :: ${job.goal} :: branch=${job.suggested_branch} :: capsules=${job.capsule_ids.join(', ')}`,
          )
          .join('\n')
      : '- none';
  const queuedJobs = queue.jobs.filter((job) => job.status === 'queued' || job.status === 'accepted');
  const completedJobs = queue.jobs.filter((job) => job.status === 'completed');

  return [
    'You are Codex Foreman inside the N1Hub Vault Steward swarm.',
    'A provider-backed scout has already analyzed the full capsule vault.',
    'Your job is to tighten and improve that plan, not to drift into unrelated work.',
    'Only propose bounded capsule-focused maintenance work grounded in the supplied graph snapshot and scout output.',
    'Act as a compact strategic pass. Prefer preserving a good scout plan over inventing a new one.',
    'If the scout plan is already sufficient or the queue already covers the maintenance need, return empty proposed_jobs.',
    'Return only JSON matching the provided schema.',
    '',
    `Graph totals: capsules=${summary.total_capsules}, orphaned=${summary.orphaned_capsules}`,
    `Type distribution: ${Object.entries(summary.by_type)
      .sort((left, right) => right[1] - left[1])
      .map(([type, count]) => `${type}:${count}`)
      .join(', ')}`,
    '',
    'Scout overview:',
    scout.normalized.overview,
    '',
    'Scout observations:',
    ...(compactObservations.length > 0 ? compactObservations.map((entry) => `- ${entry}`) : ['- none']),
    '',
    'Scout suggested actions:',
    ...(compactActions.length > 0 ? compactActions.map((entry) => `- ${entry}`) : ['- none']),
    '',
    'Scout targets:',
    scoutTargets,
    '',
    'Scout proposed jobs:',
    scoutJobs,
    '',
    'Existing queue context:',
    `Queued/accepted jobs: ${queuedJobs.length}`,
    ...(queuedJobs.length > 0
      ? queuedJobs
          .slice(0, CODEX_FOREMAN_MAX_QUEUE_CONTEXT)
          .map(
            (job) =>
              `- ${job.label} :: ${job.goal} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`,
          )
      : ['- none']),
    '',
    `Completed jobs: ${completedJobs.length}`,
    ...(completedJobs.length > 0
      ? completedJobs
          .slice(0, CODEX_FOREMAN_MAX_QUEUE_CONTEXT)
          .map(
            (job) =>
              `- ${job.label} :: ${job.goal} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`,
          )
      : ['- none']),
    '',
    'Top candidate capsules from the graph snapshot:',
    ...summary.candidates.slice(0, CODEX_FOREMAN_MAX_SCOUT_TARGETS).map((candidate) =>
      `- ${candidate.capsule_id} | ${candidate.type}/${candidate.subtype}/${candidate.status} | progress=${candidate.progress ?? 'n/a'} | links=${candidate.outbound_links}/${candidate.inbound_links} | reasons=${candidate.reasons.join(' | ')}`,
    ),
    '',
    'Refine this into the best next capsule-maintenance plan for the vault.',
    'Prefer fewer, sharper jobs over many vague ones.',
    'Keep the branch Dream unless a Real write is clearly a factual correction.',
    'Do not repeat jobs that are already queued, accepted, or recently completed.',
  ].join('\n');
}

function buildCodexSupervisorJsonSchema(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['overview', 'workstream', 'observations', 'suggested_actions', 'targets', 'proposed_jobs', 'supervisor_summary'],
    properties: {
      overview: { type: 'string', minLength: 1 },
      workstream: {
        type: 'string',
        enum: ['decomposition', 'markup', 'graph_refactor', 'mixed'],
      },
      observations: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        maxItems: 12,
      },
      suggested_actions: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        maxItems: 12,
      },
      targets: {
        type: 'array',
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['capsule_id', 'reason', 'priority'],
          properties: {
            capsule_id: { type: 'string', minLength: 1 },
            reason: { type: 'string', minLength: 1 },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
        },
      },
      proposed_jobs: {
        type: 'array',
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'goal', 'workstream', 'capsule_ids', 'suggested_branch', 'needs_human_confirmation'],
          properties: {
            label: { type: 'string', minLength: 1 },
            goal: { type: 'string', minLength: 1 },
            workstream: { type: 'string', enum: ['decomposition', 'markup', 'graph_refactor', 'mixed'] },
            capsule_ids: {
              type: 'array',
              minItems: 1,
              maxItems: 12,
              items: { type: 'string', minLength: 1 },
            },
            suggested_branch: { type: 'string', enum: ['dream', 'real'] },
            needs_human_confirmation: { type: 'boolean' },
          },
        },
      },
      supervisor_summary: { type: 'string', minLength: 1 },
    },
  };
}

function buildCodexReviewerPrompt(input: {
  summary: VaultSignalSummary;
  overview: string;
  workstream: z.infer<typeof vaultStewardWorkstreamSchema>;
  observations: string[];
  suggestedActions: string[];
  targets: z.infer<typeof vaultStewardTargetSchema>[];
  proposedJobs: VaultStewardJob[];
  executedJobs: VaultStewardJob[];
}): string {
  const targetLines =
    input.targets.length > 0
      ? input.targets
          .map((target) => `- ${target.capsule_id} [${target.priority}] ${target.reason}`)
          .join('\n')
      : '- none';
  const proposedJobLines =
    input.proposedJobs.length > 0
      ? input.proposedJobs
          .map(
            (job) =>
              `- ${job.id} :: ${job.label} :: ${job.goal} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`,
          )
          .join('\n')
      : '- none';
  const executedJobLines =
    input.executedJobs.length > 0
      ? input.executedJobs
          .map((job) => `- ${job.label} :: completed on Dream for ${job.capsule_ids.join(', ')}`)
          .join('\n')
      : '- none';

  return [
    'You are Codex Reviewer inside the N1Hub Vault Steward swarm.',
    'A provider scout already analyzed the vault and the executor may already have executed bounded Dream-side jobs.',
    'Your job is to review the swarm output and return a compact supervisor note for the operator and the next cycle.',
    'Do not invent work unrelated to the supplied capsule graph and job set.',
    'Return only JSON matching the provided schema.',
    '',
    `Graph totals: capsules=${input.summary.total_capsules}, orphaned=${input.summary.orphaned_capsules}`,
    `Workstream: ${input.workstream}`,
    '',
    'Overview:',
    input.overview,
    '',
    'Observations:',
    ...(input.observations.length > 0 ? input.observations.map((entry) => `- ${entry}`) : ['- none']),
    '',
    'Suggested actions:',
    ...(input.suggestedActions.length > 0
      ? input.suggestedActions.map((entry) => `- ${entry}`)
      : ['- none']),
    '',
    'Targets:',
    targetLines,
    '',
    'Proposed jobs:',
    proposedJobLines,
    '',
    'Executed jobs:',
    executedJobLines,
    '',
    'If any proposed job should be vetoed for this cycle because it is duplicate, stale, or low-value, list its exact id in cancel_job_ids.',
    'Only cancel jobs that appear in the Proposed jobs list. If none should be cancelled, return an empty array.',
    'Respond with a short review summary, the operator focus, the main risk flags for the next cycle, and any cancel_job_ids.',
  ].join('\n');
}

function buildCodexReviewerJsonSchema(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['review_summary', 'operator_focus', 'risk_flags', 'cancel_job_ids'],
    properties: {
      review_summary: { type: 'string', minLength: 1 },
      operator_focus: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        maxItems: 8,
      },
      risk_flags: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        maxItems: 8,
      },
      cancel_job_ids: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        maxItems: 12,
      },
    },
  };
}

async function runCodexReviewer(input: {
  summary: VaultSignalSummary;
  overview: string;
  workstream: z.infer<typeof vaultStewardWorkstreamSchema>;
  observations: string[];
  suggestedActions: string[];
  targets: z.infer<typeof vaultStewardTargetSchema>[];
  proposedJobs: VaultStewardJob[];
  executedJobs: VaultStewardJob[];
}): Promise<
  | {
      available: true;
      output: z.infer<typeof codexReviewerOutputSchema>;
      rawText: string;
      lane: z.infer<typeof vaultStewardLaneReportSchema>;
    }
  | {
      available: false;
      lane: z.infer<typeof vaultStewardLaneReportSchema>;
    }
> {
  const availability = await getLocalCodexAvailability();
  if (!availability.available) {
    return {
      available: false,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'reviewer',
        label: 'Codex Reviewer',
        engine: 'local_codex',
        status: 'skipped',
        provider: 'chatgpt_local_codex',
        model: null,
        summary: 'Codex reviewer lane is unavailable, so the swarm kept provider-led review only.',
        error: availability.reason,
      }),
    };
  }

  try {
    const result = await runLocalCodexStructuredTask<z.infer<typeof codexReviewerOutputSchema>>({
      prompt: buildCodexReviewerPrompt(input),
      schema: buildCodexReviewerJsonSchema(),
      cwd: process.cwd(),
      timeoutMs: 40_000,
    });
    const parsed = codexReviewerOutputSchema.parse(result.data);
    return {
      available: true,
      output: parsed,
      rawText: result.text,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'reviewer',
        label: 'Codex Reviewer',
        engine: 'local_codex',
        status: 'completed',
        provider: 'chatgpt_local_codex',
        model: result.model,
        summary: parsed.review_summary,
        error: null,
      }),
    };
  } catch (error: unknown) {
    return {
      available: false,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'reviewer',
        label: 'Codex Reviewer',
        engine: 'local_codex',
        status: 'failed',
        provider: 'chatgpt_local_codex',
        model: null,
        summary: 'Codex reviewer lane failed, so the swarm kept the current run without subscription review notes.',
        error: error instanceof Error ? error.message : 'Codex reviewer failed',
      }),
    };
  }
}

function getExecutorWorkstreamGuidance(
  workstream: z.infer<typeof vaultStewardWorkstreamSchema>,
): { laneTitle: string; guidance: string[] } {
  switch (workstream) {
    case 'decomposition':
      return {
        laneTitle: 'Capsule Decomposition Executor',
        guidance: [
          'Sharpen capsule boundaries and make it clearer what belongs here versus in a separate atomic capsule.',
          'Prefer summary repairs and maintenance notes that identify future split pressure instead of forcing a doctrinal rewrite now.',
          'Use keywords to make later decomposition and routing easier.',
        ],
      };
    case 'markup':
      return {
        laneTitle: 'Capsule Markup Executor',
        guidance: [
          'Improve clarity, scanability, and metadata quality without changing the meaning of the capsule.',
          'Use keywords to improve discovery, classification, and operator navigation.',
          'Keep the edit bounded and descriptive; do not treat speculative content as already validated truth.',
        ],
      };
    case 'graph_refactor':
      return {
        laneTitle: 'Capsule Graph Refactor Executor',
        guidance: [
          'Improve graph-facing clarity through summary, keywords, and maintenance notes.',
          'Do not mutate recursive links directly in this lane; prepare safe future graph refactors through notes and descriptive framing.',
          'Bias toward lineage clarity, graph maintenance, and follow-up planning signals.',
        ],
      };
    case 'mixed':
    default:
      return {
        laneTitle: 'Capsule Executor',
        guidance: [
          'Blend decomposition, markup, and graph-facing maintenance conservatively.',
          'Favor small, well-justified improvements over sweeping edits.',
          'Treat Dream as a safe maintenance workspace, not a place for doctrinal invention.',
        ],
      };
  }
}

function buildExecutorPrompt(job: VaultStewardJob, capsules: SovereignCapsule[]): { system: string; prompt: string } {
  const workstream = getExecutorWorkstreamGuidance(job.workstream);
  const system = [
    `You are the ${workstream.laneTitle} lane for the N1Hub Vault Steward swarm.`,
    'You are executing a bounded capsule-maintenance job on the Dream branch only.',
    'You must be conservative: refine summaries, add missing keywords, and write concise maintenance notes.',
    'Do not invent new doctrine. Ground every change in the provided capsule content.',
    'Return strict JSON only.',
  ].join(' ');

  const prompt = [
    `Execute this queued capsule-maintenance job: ${job.label}`,
    `Goal: ${job.goal}`,
    `Workstream: ${job.workstream}`,
    `Suggested branch: ${job.suggested_branch}`,
    '',
    'Workstream guidance:',
    ...workstream.guidance.map((entry) => `- ${entry}`),
    '',
    'Target capsules:',
    ...capsules.map((capsule) =>
      [
        `- ${capsule.metadata.capsule_id}`,
        `  name: ${capsule.metadata.name ?? capsule.metadata.capsule_id}`,
        `  type/subtype/status: ${capsule.metadata.type ?? 'unknown'}/${capsule.metadata.subtype ?? 'atomic'}/${capsule.metadata.status ?? 'unknown'}`,
        `  progress: ${toNumberValue(capsule.metadata.progress) ?? 'n/a'}`,
        `  summary: ${toStringValue(capsule.neuro_concentrate.summary).trim() || 'n/a'}`,
        `  keywords: ${Array.isArray(capsule.neuro_concentrate.keywords) ? capsule.neuro_concentrate.keywords.join(', ') : 'n/a'}`,
        '  content:',
        toStringValue(capsule.core_payload.content).slice(0, 6000),
      ].join('\n'),
    ),
    '',
    'Return JSON with this shape:',
    JSON.stringify(
      {
        updates: [
          {
            capsule_id: 'capsule.foundation.example.v1',
            updated_summary: 'One improved summary sentence or short paragraph',
            added_keywords: ['keyword-one', 'keyword-two'],
            maintenance_note: 'What was improved and what still needs attention',
            rationale: 'Why this maintenance change is justified from the capsule contents',
          },
        ],
      },
      null,
      2,
    ),
  ].join('\n');

  return { system, prompt };
}

function buildExecutorJsonSchema(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['updates'],
    properties: {
      updates: {
        type: 'array',
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'capsule_id',
            'updated_summary',
            'added_keywords',
            'maintenance_note',
            'rationale',
          ],
          properties: {
            capsule_id: { type: 'string', minLength: 1 },
            updated_summary: { type: 'string', minLength: 1 },
            added_keywords: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
              maxItems: 8,
            },
            maintenance_note: { type: 'string', minLength: 1 },
            rationale: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  };
}

function withAutonomousMaintenanceSection(
  content: string,
  note: string,
  runId: string,
  jobLabel: string,
  workstream: z.infer<typeof vaultStewardWorkstreamSchema>,
): string {
  const trimmed = content.trimEnd();
  const section = [
    '## Autonomous Vault Swarm Notes',
    '',
    `- Run: ${runId}`,
    `- Job: ${jobLabel}`,
    `- Workstream: ${workstream}`,
    `- Note: ${note}`,
  ].join('\n');

  if (trimmed.includes('## Autonomous Vault Swarm Notes')) {
    return trimmed.replace(
      /## Autonomous Vault Swarm Notes[\s\S]*$/m,
      section,
    );
  }

  return `${trimmed}\n\n${section}\n`;
}

function applyExecutorUpdate(
  capsule: SovereignCapsule,
  update: z.infer<typeof executorOutputSchema>['updates'][number],
  runId: string,
  job: VaultStewardJob,
): SovereignCapsule {
  const existingKeywords = Array.isArray(capsule.neuro_concentrate.keywords)
    ? capsule.neuro_concentrate.keywords.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
  const mergedKeywords = uniqueBy(
    [
      ...existingKeywords,
      ...update.added_keywords,
      'vault-steward',
      'autonomous-swarm',
      job.workstream,
    ].map((entry) => entry.trim()).filter(Boolean),
    (entry) => entry.toLowerCase(),
  ).slice(0, 24);

  const epistemicLedger = Array.isArray(capsule.recursive_layer.epistemic_ledger)
    ? [...capsule.recursive_layer.epistemic_ledger]
    : [];

  epistemicLedger.push({
    at: nowIso(),
    event: 'autonomous_executor_update_applied',
    agent: 'vault-steward-executor',
    run_id: runId,
    job_id: job.id,
    rationale: update.rationale,
  });

  const next: SovereignCapsule = {
    ...capsule,
    metadata: {
      ...capsule.metadata,
      updated_at: nowIso(),
    },
    core_payload: {
      ...capsule.core_payload,
      content: withAutonomousMaintenanceSection(
        toStringValue(capsule.core_payload.content),
        update.maintenance_note,
        runId,
        job.label,
        job.workstream,
      ),
    },
    neuro_concentrate: {
      ...capsule.neuro_concentrate,
      summary: update.updated_summary,
      keywords: mergedKeywords,
    },
    recursive_layer: {
      ...capsule.recursive_layer,
      epistemic_ledger: epistemicLedger,
    },
    integrity_sha3_512: '',
  };

  next.integrity_sha3_512 = computeIntegrityHash(next);
  return next;
}

function getExecutorWorkstreamRank(
  workstream: z.infer<typeof vaultStewardWorkstreamSchema>,
): number {
  switch (workstream) {
    case 'graph_refactor':
      return 0;
    case 'markup':
      return 1;
    case 'decomposition':
      return 2;
    case 'mixed':
    default:
      return 3;
  }
}

function compareJobsForExecution(left: VaultStewardJob, right: VaultStewardJob): number {
  const createdAtDelta = left.created_at.localeCompare(right.created_at);
  if (createdAtDelta !== 0) return createdAtDelta;

  const workstreamDelta =
    getExecutorWorkstreamRank(left.workstream) - getExecutorWorkstreamRank(right.workstream);
  if (workstreamDelta !== 0) return workstreamDelta;

  return left.id.localeCompare(right.id);
}

export function selectExecutorJobsForRun(
  queue: VaultStewardQueue,
  maxJobs = MAX_AUTONOMOUS_EXECUTOR_JOBS_PER_RUN,
): VaultStewardJob[] {
  const queuedJobs = queue.jobs
    .filter((job) => job.status === 'queued' && job.suggested_branch === 'dream')
    .sort(compareJobsForExecution);

  if (queuedJobs.length <= maxJobs) return queuedJobs;

  const selected: VaultStewardJob[] = [];
  const usedIds = new Set<string>();
  const workstreamOrder: Array<z.infer<typeof vaultStewardWorkstreamSchema>> = [
    'graph_refactor',
    'markup',
    'decomposition',
    'mixed',
  ];

  for (const workstream of workstreamOrder) {
    const candidate = queuedJobs.find((job) => job.workstream === workstream && !usedIds.has(job.id));
    if (!candidate) continue;
    selected.push(candidate);
    usedIds.add(candidate.id);
    if (selected.length >= maxJobs) return selected;
  }

  for (const job of queuedJobs) {
    if (usedIds.has(job.id)) continue;
    selected.push(job);
    usedIds.add(job.id);
    if (selected.length >= maxJobs) break;
  }

  return selected;
}

function inferWorkstreamFromTargetReason(reason: string): z.infer<typeof vaultStewardWorkstreamSchema> {
  const normalized = reason.toLowerCase();
  if (
    normalized.includes('decomposition') ||
    normalized.includes('link density') ||
    normalized.includes('boundar')
  ) {
    return 'decomposition';
  }
  if (
    normalized.includes('summary') ||
    normalized.includes('keyword') ||
    normalized.includes('markup') ||
    normalized.includes('clarity')
  ) {
    return 'markup';
  }
  if (
    normalized.includes('graph') ||
    normalized.includes('weakly connected') ||
    normalized.includes('lineage') ||
    normalized.includes('refactor')
  ) {
    return 'graph_refactor';
  }
  return 'mixed';
}

function buildFallbackWorkstreamOrder(
  target: z.infer<typeof vaultStewardTargetSchema>,
  defaultWorkstream: z.infer<typeof vaultStewardWorkstreamSchema>,
): Array<z.infer<typeof vaultStewardWorkstreamSchema>> {
  const inferred = inferWorkstreamFromTargetReason(target.reason);
  const order: Array<z.infer<typeof vaultStewardWorkstreamSchema>> =
    inferred === 'decomposition'
      ? ['graph_refactor', 'markup', 'decomposition', defaultWorkstream, 'mixed']
      : inferred === 'markup'
        ? ['markup', 'graph_refactor', 'decomposition', defaultWorkstream, 'mixed']
        : inferred === 'graph_refactor'
          ? ['graph_refactor', 'markup', 'decomposition', defaultWorkstream, 'mixed']
          : [defaultWorkstream, 'markup', 'graph_refactor', 'decomposition', 'mixed'];

  return uniqueBy(order, (entry) => entry);
}

function getCompletedWorkstreamsByCapsule(queue: VaultStewardQueue): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  for (const job of queue.jobs) {
    if (job.status !== 'completed') continue;
    for (const capsuleId of job.capsule_ids) {
      const existing = map.get(capsuleId) ?? new Set<string>();
      existing.add(job.workstream);
      map.set(capsuleId, existing);
    }
  }

  return map;
}

export function buildFallbackJobsFromTargets(
  targets: z.infer<typeof vaultStewardTargetSchema>[],
  runId: string,
  queue: VaultStewardQueue,
  defaultWorkstream: z.infer<typeof vaultStewardWorkstreamSchema>,
  maxJobs = MAX_AUTONOMOUS_EXECUTOR_JOBS_PER_RUN,
): VaultStewardJob[] {
  const createdAt = nowIso();
  const completedByCapsule = getCompletedWorkstreamsByCapsule(queue);
  const seeded: VaultStewardJob[] = [];
  const pendingIdentityKeys = new Set(
    queue.jobs
      .filter((job) => job.status === 'queued' || job.status === 'accepted' || job.status === 'completed')
      .map((job) => getJobIdentityKey(job)),
  );

  for (const target of targets) {
    const completed = completedByCapsule.get(target.capsule_id) ?? new Set<string>();
    const workstream = buildFallbackWorkstreamOrder(target, defaultWorkstream).find(
      (candidate) => !completed.has(candidate),
    );
    if (!workstream) continue;

    const capsuleSlug = target.capsule_id.replace(/^capsule\./, '').replace(/\.v\d+$/, '');
    const nextJob: VaultStewardJob = {
      id: `vault-steward-job-${stableHash({
        runId,
        capsule_id: target.capsule_id,
        reason: target.reason,
        workstream,
      }).slice(0, 16)}`,
      label: `Autonomous ${workstream.replace(/_/g, ' ')} pass for ${capsuleSlug}`,
      goal: `Follow up ${target.capsule_id} because ${target.reason}`,
      workstream,
      capsule_ids: [target.capsule_id],
      suggested_branch: 'dream',
      needs_human_confirmation: false,
      created_at: createdAt,
      source_run_id: runId,
      status: 'queued',
    };

    const identityKey = getJobIdentityKey(nextJob);
    if (pendingIdentityKeys.has(identityKey)) continue;

    seeded.push(nextJob);
    pendingIdentityKeys.add(identityKey);
    if (seeded.length >= maxJobs) break;
  }

  return seeded;
}

export function mergeJobs(existing: VaultStewardJob[], incoming: VaultStewardJob[]): VaultStewardJob[] {
  const byKey = new Map<string, VaultStewardJob>();
  for (const job of existing) {
    const key = getJobIdentityKey(job);
    byKey.set(key, job);
  }

  for (const job of incoming) {
    const key = getJobIdentityKey(job);
    const existingJob = byKey.get(key);
    byKey.set(key, existingJob ? mergeDuplicateJob(existingJob, job) : job);
  }

  return [...byKey.values()].sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function getLatestLaneReport(
  run: VaultStewardRun | null,
  id: z.infer<typeof vaultStewardLaneReportSchema>['id'],
): z.infer<typeof vaultStewardLaneReportSchema> | null {
  return run?.lane_reports.find((lane) => lane.id === id) ?? null;
}

function getCodexForemanCooldown(
  latestRun: VaultStewardRun | null,
): { active: boolean; cooldownUntil: string | null; error: string | null } {
  const previousForemanFailure = getLatestLaneReport(latestRun, 'foreman');
  if (
    previousForemanFailure?.status === 'failed' &&
    previousForemanFailure.error?.toLowerCase().includes('timed out') &&
    latestRun?.completed_at
  ) {
    const cooldownUntilMs =
      new Date(latestRun.completed_at).getTime() + CODEX_FOREMAN_TIMEOUT_COOLDOWN_MS;
    return {
      active: Date.now() < cooldownUntilMs,
      cooldownUntil: new Date(cooldownUntilMs).toISOString(),
      error: previousForemanFailure.error,
    };
  }

  return {
    active: false,
    cooldownUntil: null,
    error: null,
  };
}

function getCodexForemanCadenceHold(
  latestRun: VaultStewardRun | null,
): { active: boolean; holdUntil: string | null } {
  const previousForeman = getLatestLaneReport(latestRun, 'foreman');
  if (previousForeman?.status === 'completed' && latestRun?.completed_at) {
    const holdUntilMs = new Date(latestRun.completed_at).getTime() + CODEX_FOREMAN_MIN_INTERVAL_MS;
    return {
      active: Date.now() < holdUntilMs,
      holdUntil: new Date(holdUntilMs).toISOString(),
    };
  }

  return {
    active: false,
    holdUntil: null,
  };
}

export function shouldRunCodexForeman(
  scout: VaultStewardScoutResult,
  queue: VaultStewardQueue,
): { run: boolean; summary?: string; error?: string } {
  const activeJobs = queue.jobs.filter((job) => job.status === 'queued' || job.status === 'accepted').length;
  const hasConcreteScoutPlan =
    scout.normalized.proposed_jobs.length > 0 || scout.normalized.targets.length > 0;

  if (scout.reason === 'used_fallback_analysis') {
    if (activeJobs === 0 && hasConcreteScoutPlan) {
      return {
        run: true,
        summary:
          'Codex foreman lane entered recovery mode because the provider scout fell back to heuristic analysis but still surfaced concrete maintenance pressure.',
      };
    }
    return {
      run: false,
      summary:
        'Codex foreman lane skipped because the provider scout fell back to heuristic analysis; reviewer lane will supervise the lower-confidence cycle instead.',
      error: 'Scout used fallback analysis',
    };
  }

  if (!hasConcreteScoutPlan && activeJobs === 0) {
    return {
      run: false,
      summary:
        'Codex foreman lane skipped because the scout did not surface concrete jobs or targets that justify a strategic tightening pass.',
      error: 'No concrete scout plan',
    };
  }

  return { run: true };
}

export function shouldBypassCodexForemanCadenceHold(
  scout: VaultStewardScoutResult,
  queue: VaultStewardQueue,
): boolean {
  const readiness = shouldRunCodexForeman(scout, queue);
  return scout.reason === 'used_fallback_analysis' && readiness.run;
}

async function buildVaultStewardSwarmState(
  config: VaultStewardConfig,
  latestRun: VaultStewardRun | null,
): Promise<z.infer<typeof vaultStewardSwarmSchema>> {
  const [providerCatalog, codexAvailability] = await Promise.all([
    getResolvedAiProviderCatalog(),
    getLocalCodexAvailability(),
  ]);

  const readyProviders = providerCatalog.filter((provider) => provider.available);
  const activeProvider =
    (config.provider
      ? readyProviders.find((provider) => provider.provider === config.provider)?.provider
      : null) ??
    readyProviders.find((provider) => provider.selectedByDefault)?.provider ??
    readyProviders[0]?.provider ??
    null;
  const cooldown = getCodexForemanCooldown(latestRun);
  const cadenceHold = getCodexForemanCadenceHold(latestRun);
  const recentLocalCodexSuccess =
    latestRun?.lane_reports.some(
      (lane) => lane.engine === 'local_codex' && lane.status === 'completed',
    ) ?? false;

  const providerLane = vaultStewardLaneStateSchema.parse({
    id: 'scout',
    label: 'Scout',
    engine: 'provider',
    state: readyProviders.length > 0 ? 'ready' : 'unavailable',
    available: readyProviders.length > 0,
    provider: activeProvider,
    model: config.model ?? readyProviders.find((provider) => provider.provider === activeProvider)?.defaultModel ?? null,
    plan_type: null,
    detail:
      readyProviders.length > 0
        ? `API lane is ready with ${readyProviders.length} configured provider${readyProviders.length === 1 ? '' : 's'}.`
        : 'No wallet-backed API provider is ready for swarm work.',
    cooldown_until: null,
  });

  const foremanLane = vaultStewardLaneStateSchema.parse({
    id: 'foreman',
    label: 'Codex Foreman',
    engine: 'local_codex',
    state:
      cooldown.active || cadenceHold.active
        ? 'cooldown'
        : codexAvailability.available
          ? 'ready'
          : 'unavailable',
    available: codexAvailability.available && !cooldown.active && !cadenceHold.active,
    provider: 'chatgpt_local_codex',
    model: null,
    plan_type: codexAvailability.planType,
    detail: cooldown.active
      ? 'Subscription-backed foreman lane is cooling down after a recent timeout.'
      : cadenceHold.active
        ? 'Subscription-backed foreman lane is holding cadence because a recent strategic pass already completed.'
        : codexAvailability.available
        ? 'Subscription-backed foreman lane is ready for strategic supervisory passes.'
        : codexAvailability.reason ?? 'Codex foreman lane is unavailable.',
    cooldown_until: cooldown.cooldownUntil ?? cadenceHold.holdUntil,
  });

  const reviewerLane = vaultStewardLaneStateSchema.parse({
    id: 'reviewer',
    label: 'Codex Reviewer',
    engine: 'local_codex',
    state: codexAvailability.available ? 'ready' : 'unavailable',
    available: codexAvailability.available,
    provider: 'chatgpt_local_codex',
    model: null,
    plan_type: codexAvailability.planType,
    detail: codexAvailability.available
      ? 'Subscription-backed reviewer lane is ready for compact quality-control passes on swarm output.'
      : codexAvailability.reason ?? 'Codex reviewer lane is unavailable.',
    cooldown_until: null,
  });

  const maintainerLane = vaultStewardLaneStateSchema.parse({
    id: 'maintainer',
    label: 'Executor',
    engine: 'provider',
    state: readyProviders.length > 0 ? 'ready' : 'unavailable',
    available: readyProviders.length > 0,
    provider: activeProvider,
    model: config.model ?? readyProviders.find((provider) => provider.provider === activeProvider)?.defaultModel ?? null,
    plan_type: null,
    detail:
      readyProviders.length > 0
        ? 'API-backed executor lane can execute bounded Dream-side capsule work across decomposition, markup, and graph refactor streams.'
        : 'Executor lane is blocked until an API provider is configured.',
    cooldown_until: null,
  });

  const mode =
    readyProviders.length === 0
      ? 'unavailable'
      : codexAvailability.available
        ? recentLocalCodexSuccess
          ? 'hybrid_active'
          : 'hybrid_ready'
        : 'provider_only';

  const summary =
    mode === 'unavailable'
      ? 'The swarm is offline because no API provider is currently ready.'
      : mode === 'provider_only'
        ? 'The swarm can work through API lanes only. ChatGPT/Codex subscription help is currently unavailable.'
        : mode === 'hybrid_active'
          ? 'The swarm is operating in hybrid mode with both API lanes and ChatGPT/Codex subscription lanes participating.'
          : 'The swarm is ready for hybrid mode: API lanes are online and ChatGPT/Codex subscription lanes are available.';

  return vaultStewardSwarmSchema.parse({
    mode,
    summary,
    ready_provider_count: readyProviders.length,
    default_provider: activeProvider,
    codex_available: codexAvailability.available,
    codex_plan_type: codexAvailability.planType,
    lanes: [providerLane, foremanLane, reviewerLane, maintainerLane],
  });
}

function buildLatestRunCapsule(run: VaultStewardRun, config: VaultStewardConfig): SovereignCapsule {
  const content = [
    '# Vault Steward Latest Run',
    '',
    `- Run ID: ${run.run_id}`,
    `- Status: ${run.status}`,
    `- Reason: ${run.reason}`,
    `- Provider: ${run.provider ?? 'auto'}`,
    `- Model: ${run.model ?? 'default'}`,
    `- Completed at: ${run.completed_at}`,
    '',
    '## Overview',
    run.overview,
    '',
    '## Observations',
    ...(run.observations.length > 0 ? run.observations.map((entry) => `- ${entry}`) : ['- none']),
    '',
    '## Suggested Actions',
    ...(run.suggested_actions.length > 0 ? run.suggested_actions.map((entry) => `- ${entry}`) : ['- none']),
    '',
    '## Swarm Lanes',
    ...(run.lane_reports.length > 0
      ? run.lane_reports.map((lane) =>
          `- ${lane.label} [${lane.status}] ${lane.provider ?? lane.engine}${lane.model ? ` / ${lane.model}` : ''}: ${lane.summary}${lane.error ? ` (error: ${lane.error})` : ''}`,
        )
      : ['- provider-only']),
    '',
    '## Proposed Jobs',
    ...(run.proposed_jobs.length > 0
      ? run.proposed_jobs.map((job) => `- ${job.label}: ${job.goal} [${job.workstream}]`)
      : ['- none']),
    '',
    '## Executed Jobs',
    ...(run.executed_jobs.length > 0
      ? run.executed_jobs.map((job) => `- ${job.label}: completed autonomously on Dream`)
      : ['- none']),
    '',
    '## Graph Snapshot',
    `- Total capsules: ${run.graph_snapshot.total_capsules}`,
    `- Orphaned capsules: ${run.graph_snapshot.orphaned_capsules}`,
    `- Type distribution: ${Object.entries(run.graph_snapshot.by_type)
      .map(([type, count]) => `${type}:${count}`)
      .join(', ')}`,
    '',
    `## Runtime Policy`,
    `- Mode: ${config.mode}`,
    `- Interval minutes: ${config.interval_minutes}`,
    `- Night window: ${config.night_start_hour}:00-${config.night_end_hour}:00`,
  ].join('\n');

  const capsule: SovereignCapsule = {
    metadata: {
      capsule_id: 'capsule.operations.vault-steward.latest.v1',
      version: '1.0.0',
      status: 'active',
      type: 'operations',
      subtype: 'atomic',
      author: 'Vault Steward Agent',
      created_at: run.started_at,
      updated_at: run.completed_at,
      name: 'Vault Steward Latest Run',
      semantic_hash: 'vault-steward-latest-run-operations-maintenance-latest-run',
      source: {
        uri: 'n1hub://agents/vault-steward',
        type: 'background_agent',
      },
      priority: 'high',
      progress: run.status === 'completed' ? 100 : run.status === 'skipped' ? 50 : 0,
      tier: 3,
    },
    core_payload: {
      content_type: 'markdown',
      content,
    },
    neuro_concentrate: {
      summary: run.overview,
      keywords: [
        'vault-steward',
        'agent-swarm',
        'codex-foreman',
        'background-agent',
        'capsule-maintenance',
        'dream-branch',
        'operations',
        run.workstream,
      ],
      confidence_vector: {
        extraction: 0.88,
        synthesis: 0.9,
        linking: 0.86,
        provenance_coverage: 0.82,
        validation_score: 0.9,
        contradiction_pressure: 0.08,
      },
      semantic_hash: 'vault-steward-latest-run-operations-maintenance-latest-run',
    },
    recursive_layer: {
      links: [
        { target_id: 'capsule.foundation.vault-stewardship-swarm.v1', relation_type: 'part_of' },
        { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'part_of' },
        { target_id: 'capsule.foundation.capsule-graph-maintenance.v1', relation_type: 'references' },
        { target_id: 'capsule.foundation.personal-ai-assistant.v1', relation_type: 'references' },
        { target_id: 'capsule.foundation.chat-to-capsules.v1', relation_type: 'references' },
      ],
      actions: [],
      epistemic_ledger: [],
    },
    integrity_sha3_512: '',
  };

  capsule.integrity_sha3_512 = computeIntegrityHash(capsule);
  return capsule;
}

function buildQueueCapsule(queue: VaultStewardQueue): SovereignCapsule {
  const content = [
    '# Vault Steward Queue',
    '',
    `Queued jobs: ${queue.jobs.filter((job) => job.status === 'queued').length}`,
    '',
    ...queue.jobs.slice(0, 12).map((job) =>
      [
        `## ${job.label}`,
        '',
        `- Status: ${job.status}`,
        `- Workstream: ${job.workstream}`,
        `- Branch: ${job.suggested_branch}`,
        `- Human confirmation: ${job.needs_human_confirmation ? 'yes' : 'no'}`,
        `- Capsules: ${job.capsule_ids.join(', ')}`,
        '',
        job.goal,
      ].join('\n'),
    ),
  ].join('\n');

  const capsule: SovereignCapsule = {
    metadata: {
      capsule_id: 'capsule.operations.vault-steward.queue.v1',
      version: '1.0.0',
      status: 'active',
      type: 'operations',
      subtype: 'atomic',
      author: 'Vault Steward Agent',
      created_at: queue.updated_at,
      updated_at: queue.updated_at,
      name: 'Vault Steward Queue',
      semantic_hash: 'vault-steward-queue-operations-maintenance-jobs-queue',
      source: {
        uri: 'n1hub://agents/vault-steward',
        type: 'background_agent',
      },
      priority: 'high',
      progress: Math.max(0, 100 - queue.jobs.filter((job) => job.status === 'queued').length),
      tier: 3,
    },
    core_payload: {
      content_type: 'markdown',
      content,
    },
    neuro_concentrate: {
      summary:
        'Vault Steward Queue is the current list of queued capsule-maintenance jobs proposed by the autonomous vault agent for Dream-first review and follow-through.',
      keywords: [
        'vault-steward',
        'maintenance-queue',
        'operations',
        'background-agent',
        'dream-branch',
      ],
      confidence_vector: {
        extraction: 0.86,
        synthesis: 0.88,
        linking: 0.83,
        provenance_coverage: 0.8,
        validation_score: 0.89,
        contradiction_pressure: 0.05,
      },
      semantic_hash: 'vault-steward-queue-operations-maintenance-jobs-queue',
    },
    recursive_layer: {
      links: [
        { target_id: 'capsule.foundation.vault-stewardship-swarm.v1', relation_type: 'part_of' },
        { target_id: 'capsule.foundation.capsule-graph-maintenance.v1', relation_type: 'references' },
        { target_id: 'capsule.foundation.branch-steward-agent.v1', relation_type: 'references' },
        { target_id: 'capsule.foundation.validation-gatekeeper-agent.v1', relation_type: 'references' },
      ],
      actions: [],
      epistemic_ledger: [],
    },
    integrity_sha3_512: '',
  };

  capsule.integrity_sha3_512 = computeIntegrityHash(capsule);
  return capsule;
}

function buildPlanCapsule(run: VaultStewardRun, queue: VaultStewardQueue, config: VaultStewardConfig): SovereignCapsule {
  const currentRunJobs = run.proposed_jobs.slice(0, 4);
  const queuedJobs = queue.jobs.filter((job) => job.status === 'queued');
  const todayJobs = currentRunJobs.slice(0, 3);
  const weekJobs = queuedJobs.slice(todayJobs.length, todayJobs.length + 5);
  const laterJobs = queuedJobs.slice(todayJobs.length + weekJobs.length, todayJobs.length + weekJobs.length + 6);

  const content = [
    '# Vault Steward Plan',
    '',
    `- Generated at: ${run.completed_at}`,
    `- Run ID: ${run.run_id}`,
    `- Provider: ${run.provider ?? 'auto'}`,
    `- Model: ${run.model ?? 'default'}`,
    `- Mode: ${config.mode}`,
    '',
    '## Core Thesis',
    run.overview,
    '',
    '## Planning Goals',
    ...(run.suggested_actions.length > 0 ? run.suggested_actions.map((entry) => `- ${entry}`) : ['- No planning goals were produced in this cycle.']),
    '',
    '## Focus Capsules',
    ...(run.targets.length > 0
      ? run.targets.map((target) => `- ${target.capsule_id}: ${target.reason} [${target.priority}]`)
      : ['- No capsule targets were selected in this cycle.']),
    '',
    '## Today',
    ...(todayJobs.length > 0
      ? todayJobs.map((job) => `- ${job.label}: ${job.goal}`)
      : ['- No immediate tasks were proposed in this cycle.']),
    '',
    '## Next 7 Days',
    ...(weekJobs.length > 0 ? weekJobs.map((job) => `- ${job.label}: ${job.goal}`) : ['- No week-horizon tasks yet.']),
    '',
    '## Backlog / Later',
    ...(laterJobs.length > 0 ? laterJobs.map((job) => `- ${job.label}: ${job.goal}`) : ['- No later-horizon tasks yet.']),
    '',
    '## Observations',
    ...(run.observations.length > 0 ? run.observations.map((entry) => `- ${entry}`) : ['- none']),
    '',
    '## Swarm Lanes',
    ...(run.lane_reports.length > 0
      ? run.lane_reports.map((lane) =>
          `- ${lane.label} [${lane.status}] ${lane.provider ?? lane.engine}${lane.model ? ` / ${lane.model}` : ''}: ${lane.summary}`,
        )
      : ['- provider-only']),
    '',
    '## Queue Snapshot',
    `- Total queued jobs: ${queuedJobs.length}`,
    `- Current-run jobs: ${run.proposed_jobs.length}`,
    `- Current-run executed jobs: ${run.executed_jobs.length}`,
  ].join('\n');

  const capsule: SovereignCapsule = {
    metadata: {
      capsule_id: 'capsule.operations.vault-steward.plan.v1',
      version: '1.0.0',
      status: 'active',
      type: 'operations',
      subtype: 'atomic',
      author: 'Vault Steward Agent',
      created_at: run.started_at,
      updated_at: run.completed_at,
      name: 'Vault Steward Plan',
      semantic_hash: 'vault-steward-plan-operations-capsule-maintenance-planning',
      source: {
        uri: 'n1hub://agents/vault-steward',
        type: 'background_agent',
      },
      priority: 'high',
      progress: 100,
      tier: 3,
    },
    core_payload: {
      content_type: 'markdown',
      content,
    },
    neuro_concentrate: {
      summary:
        'Vault Steward Plan is the current planning artifact produced by the autonomous capsule agent, translating vault analysis into goals, immediate tasks, and queue-backed capsule work.',
      keywords: [
        'vault-steward',
        'agent-swarm',
        'planning',
        'capsule-maintenance',
        'capsule-graph',
        'background-agent',
      ],
      confidence_vector: {
        extraction: 0.86,
        synthesis: 0.9,
        linking: 0.84,
        provenance_coverage: 0.82,
        validation_score: 0.9,
        contradiction_pressure: 0.05,
      },
      semantic_hash: 'vault-steward-plan-operations-capsule-maintenance-planning',
    },
    recursive_layer: {
      links: [
        { target_id: 'capsule.foundation.vault-stewardship-swarm.v1', relation_type: 'part_of' },
        { target_id: 'capsule.foundation.capsule-graph-maintenance.v1', relation_type: 'references' },
        { target_id: 'capsule.foundation.planner.v1', relation_type: 'references' },
        { target_id: 'capsule.foundation.planning-horizon-engine.v1', relation_type: 'references' },
        { target_id: 'capsule.foundation.personal-ai-assistant.v1', relation_type: 'references' },
      ],
      actions: [],
      epistemic_ledger: [],
    },
    integrity_sha3_512: '',
  };

  capsule.integrity_sha3_512 = computeIntegrityHash(capsule);
  return capsule;
}

async function writeDreamOperationalCapsules(run: VaultStewardRun, queue: VaultStewardQueue, config: VaultStewardConfig) {
  const dreamManifest = await readBranchManifest('dream');
  if (!dreamManifest) return;

  await writeOverlayCapsule(buildLatestRunCapsule(run, config), 'dream');
  await writeOverlayCapsule(buildQueueCapsule(queue), 'dream');
  await writeOverlayCapsule(buildPlanCapsule(run, queue, config), 'dream');
}

export async function getVaultStewardState(): Promise<VaultStewardState> {
  const [config, runtime, latest_run, queue] = await Promise.all([
    readConfig(),
    readRuntime(),
    readLatestRun(),
    readQueue(),
  ]);
  const swarm = await buildVaultStewardSwarmState(config, latest_run);

  return {
    config,
    runtime,
    latest_run,
    queue,
    swarm,
  };
}

function toRunJobs(rawJobs: z.infer<typeof aiOutputSchema>['proposed_jobs'], runId: string): VaultStewardJob[] {
  const createdAt = nowIso();
  return rawJobs.map((job) => ({
    id: `vault-steward-job-${stableHash({
      runId,
      label: job.label,
      goal: job.goal,
      capsule_ids: [...job.capsule_ids].sort(),
      workstream: job.workstream,
    }).slice(0, 16)}`,
    label: job.label,
    goal: job.goal,
    workstream: job.workstream,
    capsule_ids: job.capsule_ids,
    suggested_branch: job.suggested_branch,
    needs_human_confirmation: job.needs_human_confirmation,
    created_at: createdAt,
    source_run_id: runId,
    status: 'queued',
  }));
}

async function runProviderScoutOnce(
  config: VaultStewardConfig,
  summary: VaultSignalSummary,
  queue: VaultStewardQueue,
): Promise<VaultStewardScoutResult> {
  const { system, prompt } = buildPrompt(summary, queue);

  try {
    const result = await generateTextWithAiProvider({
      provider: config.provider ?? undefined,
      model: config.model ?? undefined,
      system,
      prompt,
      temperature: 0.2,
      maxTokens: 700,
      jsonMode: true,
    });
    const parsedRaw = extractFirstJsonObject(result.text);
    const parsed = aiOutputSchema.safeParse(parsedRaw);
    if (parsed.success) {
      return {
        normalized: parsed.data,
        provider: result.provider,
        model: result.model,
        rawText: result.text,
        reason: 'analysis_completed',
        lane: vaultStewardLaneReportSchema.parse({
          id: 'scout',
          label: 'Scout',
          engine: 'provider',
          status: 'completed',
          provider: result.provider,
          model: result.model,
          summary: `Provider scout completed via ${result.provider} and produced a structured capsule-maintenance plan.`,
          error: null,
        }),
      };
    }

    try {
      const repaired = await generateTextWithAiProvider({
        provider: config.provider ?? undefined,
        model: config.model ?? undefined,
        system:
          'You are a JSON repair assistant for N1Hub Vault Steward. Return strict JSON only and preserve the original maintenance intent.',
        prompt: buildScoutRepairPrompt(result.text),
        temperature: 0,
        maxTokens: 700,
        jsonMode: true,
      });
      const repairedRaw = extractFirstJsonObject(repaired.text);
      const repairedParsed = aiOutputSchema.safeParse(repairedRaw);
      if (repairedParsed.success) {
        return {
          normalized: repairedParsed.data,
          provider: result.provider,
          model: result.model,
          rawText: [result.text, repaired.text].join('\n\n--- repair pass ---\n\n'),
          reason: 'analysis_repaired',
          lane: vaultStewardLaneReportSchema.parse({
            id: 'scout',
            label: 'Scout',
            engine: 'provider',
            status: 'completed',
            provider: result.provider,
            model: result.model,
            summary: `Provider scout completed via ${result.provider} after a JSON repair pass recovered a structured capsule-maintenance plan.`,
            error: null,
          }),
        };
      }
    } catch {
      // Fall through to graph-derived fallback below.
    }

    return {
      normalized: buildFallbackAnalysis(summary),
      provider: result.provider,
      model: result.model,
      rawText: result.text,
      reason: 'used_fallback_analysis',
      lane: vaultStewardLaneReportSchema.parse({
        id: 'scout',
        label: 'Scout',
        engine: 'provider',
        status: 'completed',
        provider: result.provider,
        model: result.model,
        summary: `Provider scout completed via ${result.provider}, but both the initial response and JSON repair pass failed validation, so the plan was normalized through the local fallback parser.`,
        error: null,
      }),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'vault steward scout failed';
    const budgetRetryMaxTokens = getBudgetRetryMaxTokens(message, 700);
    if (budgetRetryMaxTokens) {
      try {
        const retried = await generateTextWithAiProvider({
          provider: config.provider ?? undefined,
          model: config.model ?? undefined,
          system,
          prompt,
          temperature: 0.2,
          maxTokens: budgetRetryMaxTokens,
          jsonMode: true,
        });
        const retriedParsedRaw = extractFirstJsonObject(retried.text);
        const retriedParsed = aiOutputSchema.safeParse(retriedParsedRaw);
        if (retriedParsed.success) {
          return {
            normalized: retriedParsed.data,
            provider: retried.provider,
            model: retried.model,
            rawText: retried.text,
            reason: 'analysis_completed',
            lane: vaultStewardLaneReportSchema.parse({
              id: 'scout',
              label: 'Scout',
              engine: 'provider',
              status: 'completed',
              provider: retried.provider,
              model: retried.model,
              summary: `Provider scout completed via ${retried.provider} after an automatic low-budget retry.`,
              error: null,
            }),
          };
        }
      } catch {
        // Fall through to other retries below.
      }
    }

    if (
      typeof message === 'string' &&
      (message.includes('Prompt tokens limit exceeded') || message.toLowerCase().includes('context length'))
    ) {
      try {
        const compactPrompt = buildPrompt(summary, queue, { compact: true });
        const compactResult = await generateTextWithAiProvider({
          provider: config.provider ?? undefined,
          model: config.model ?? undefined,
          system: compactPrompt.system,
          prompt: compactPrompt.prompt,
          temperature: 0.2,
          maxTokens: 700,
          jsonMode: true,
        });
        const compactParsedRaw = extractFirstJsonObject(compactResult.text);
        const compactParsed = aiOutputSchema.safeParse(compactParsedRaw);
        if (compactParsed.success) {
          return {
            normalized: compactParsed.data,
            provider: compactResult.provider,
            model: compactResult.model,
            rawText: compactResult.text,
            reason: 'analysis_completed',
            lane: vaultStewardLaneReportSchema.parse({
              id: 'scout',
              label: 'Scout',
              engine: 'provider',
              status: 'completed',
              provider: compactResult.provider,
              model: compactResult.model,
              summary: `Provider scout completed via ${compactResult.provider} after an automatic compact-prompt retry.`,
              error: null,
            }),
          };
        }

        try {
          const repaired = await generateTextWithAiProvider({
            provider: config.provider ?? undefined,
            model: config.model ?? undefined,
            system:
              'You are a JSON repair assistant for N1Hub Vault Steward. Return strict JSON only and preserve the original maintenance intent.',
            prompt: buildScoutRepairPrompt(compactResult.text),
            temperature: 0,
            maxTokens: 600,
            jsonMode: true,
          });
          const repairedRaw = extractFirstJsonObject(repaired.text);
          const repairedParsed = aiOutputSchema.safeParse(repairedRaw);
          if (repairedParsed.success) {
            return {
              normalized: repairedParsed.data,
              provider: compactResult.provider,
              model: compactResult.model,
              rawText: [compactResult.text, repaired.text].join('\n\n--- repair pass ---\n\n'),
              reason: 'analysis_repaired',
              lane: vaultStewardLaneReportSchema.parse({
                id: 'scout',
                label: 'Scout',
                engine: 'provider',
                status: 'completed',
                provider: compactResult.provider,
                model: compactResult.model,
                summary: `Provider scout completed via ${compactResult.provider} after a compact-prompt retry and JSON repair pass.`,
                error: null,
              }),
            };
          }
        } catch {
          // Fall through to graph-derived fallback below.
        }
      } catch {
        // Fall through to graph-derived fallback below.
      }
    }

    return {
      normalized: buildFallbackAnalysis(summary),
      provider: config.provider,
      model: config.model,
      rawText: null,
      reason: 'used_fallback_analysis',
      lane: vaultStewardLaneReportSchema.parse({
        id: 'scout',
        label: 'Scout',
        engine: 'provider',
        status: 'failed',
        provider: config.provider ?? 'auto',
        model: config.model ?? null,
        summary: 'Provider scout failed, so Vault Steward fell back to graph-derived capsule maintenance heuristics.',
        error: message,
      }),
    };
  }
}

async function runProviderScout(
  config: VaultStewardConfig,
  summary: VaultSignalSummary,
  queue: VaultStewardQueue,
): Promise<VaultStewardScoutResult> {
  const attemptOrder = await getSwarmApiProviderOrder(config.provider);
  if (attemptOrder.length === 0) {
    return runProviderScoutOnce(config, summary, queue);
  }

  let primaryResult: VaultStewardScoutResult | null = null;
  const degradedAttempts: string[] = [];

  for (const [index, provider] of attemptOrder.entries()) {
    const result = await runProviderScoutOnce(
      {
        ...config,
        provider,
      },
      summary,
      queue,
    );

    if (index === 0) {
      primaryResult = result;
      if (result.reason !== 'used_fallback_analysis') {
        return result;
      }
    }

    const failureNote = `${provider}: ${result.lane.error ?? result.reason}`;
    degradedAttempts.push(failureNote);

    if (result.reason !== 'used_fallback_analysis') {
      return {
        ...result,
        rawText: [
          primaryResult?.rawText,
          result.rawText,
        ]
          .filter(Boolean)
          .join('\n\n--- provider failover ---\n\n'),
        lane: vaultStewardLaneReportSchema.parse({
          ...result.lane,
          summary:
            primaryResult && primaryResult.provider && primaryResult.provider !== result.provider
              ? `Provider scout recovered via ${result.provider} after ${primaryResult.provider} degraded or failed to produce a usable structured plan.`
              : result.lane.summary,
        }),
      };
    }
  }

  if (!primaryResult) {
    return runProviderScoutOnce(config, summary, queue);
  }

  return {
    ...primaryResult,
    rawText: [primaryResult.rawText, degradedAttempts.length > 1 ? degradedAttempts.join('\n') : null]
      .filter(Boolean)
      .join('\n\n--- provider failover attempts ---\n\n'),
    lane: vaultStewardLaneReportSchema.parse({
      ...primaryResult.lane,
      summary: `${primaryResult.lane.summary} Alternate API lanes were also attempted but did not produce a structured plan.`,
    }),
  };
}

async function runCodexForeman(
  summary: VaultSignalSummary,
  scout: VaultStewardScoutResult,
  queue: VaultStewardQueue,
): Promise<
  | {
      available: true;
      output: z.infer<typeof codexSupervisorOutputSchema>;
      rawText: string;
      lane: z.infer<typeof vaultStewardLaneReportSchema>;
    }
  | {
      available: false;
      lane: z.infer<typeof vaultStewardLaneReportSchema>;
    }
> {
  const latestRun = await readLatestRun();
  const cooldown = getCodexForemanCooldown(latestRun);
  const cadenceHold = getCodexForemanCadenceHold(latestRun);
  const bypassCadenceHold = shouldBypassCodexForemanCadenceHold(scout, queue);
  if (cooldown.active) {
    return {
      available: false,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'foreman',
        label: 'Codex Foreman',
        engine: 'local_codex',
        status: 'skipped',
        provider: 'chatgpt_local_codex',
        model: null,
        summary: 'Codex supervisor lane is cooling down after a recent timeout, so Vault Steward continued in provider-led mode.',
        error: cooldown.error,
      }),
    };
  }

  if (cadenceHold.active && !bypassCadenceHold) {
    return {
      available: false,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'foreman',
        label: 'Codex Foreman',
        engine: 'local_codex',
        status: 'skipped',
        provider: 'chatgpt_local_codex',
        model: null,
        summary:
          'Codex foreman lane is on cadence hold because a recent strategic pass already completed successfully.',
        error: cadenceHold.holdUntil ? `Cadence hold until ${cadenceHold.holdUntil}` : null,
      }),
    };
  }

  const availability = await getLocalCodexAvailability();
  if (!availability.available) {
    return {
      available: false,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'foreman',
        label: 'Codex Foreman',
        engine: 'local_codex',
        status: 'skipped',
        provider: 'chatgpt_local_codex',
        model: null,
        summary: 'Codex supervisor lane is unavailable, so Vault Steward stayed in provider-only mode.',
        error: availability.reason,
      }),
    };
  }

  const readiness = shouldRunCodexForeman(scout, queue);
  if (!readiness.run) {
    return {
      available: false,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'foreman',
        label: 'Codex Foreman',
        engine: 'local_codex',
        status: 'skipped',
        provider: 'chatgpt_local_codex',
        model: null,
        summary:
          readiness.summary ??
          'Codex supervisor lane skipped because the current cycle does not need a strategic tightening pass.',
        error: readiness.error ?? null,
      }),
    };
  }

  try {
    const result = await runLocalCodexStructuredTask<z.infer<typeof codexSupervisorOutputSchema>>({
      prompt: buildCodexSupervisorPrompt(summary, scout, queue),
      schema: buildCodexSupervisorJsonSchema(),
      cwd: process.cwd(),
      timeoutMs: 90_000,
    });
    const parsed = codexSupervisorOutputSchema.parse(result.data);
    return {
      available: true,
      output: parsed,
      rawText: result.text,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'foreman',
        label: 'Codex Foreman',
        engine: 'local_codex',
        status: 'completed',
        provider: 'chatgpt_local_codex',
        model: result.model,
        summary: parsed.supervisor_summary,
        error: null,
      }),
    };
  } catch (error: unknown) {
    return {
      available: false,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'foreman',
        label: 'Codex Foreman',
        engine: 'local_codex',
        status: 'failed',
        provider: 'chatgpt_local_codex',
        model: null,
        summary: 'Codex supervisor lane failed during execution, so Vault Steward kept the provider scout plan.',
        error: error instanceof Error ? error.message : 'Codex supervisor failed',
      }),
    };
  }
}

export function filterNewJobsAgainstQueue(
  jobs: VaultStewardJob[],
  queue: VaultStewardQueue,
): { jobs: VaultStewardJob[]; skipped: VaultStewardJob[] } {
  const skipped: VaultStewardJob[] = [];
  const accepted: VaultStewardJob[] = [];
  const queueByIdentity = new Map<string, VaultStewardJob>();

  for (const job of queue.jobs) {
    queueByIdentity.set(getJobIdentityKey(job), job);
  }

  for (const job of jobs) {
    const existing = queueByIdentity.get(getJobIdentityKey(job));
    if (!existing) {
      accepted.push(job);
      continue;
    }
    if (existing.status === 'queued' || existing.status === 'accepted') {
      skipped.push(job);
      continue;
    }
    if (existing.status === 'completed' && isRecentCompletedJob(existing)) {
      skipped.push(job);
      continue;
    }
    accepted.push(job);
  }

  return { jobs: accepted, skipped };
}

function filterPlanAgainstQueueCooldown(
  normalized: AiOutput,
  queue: VaultStewardQueue,
): { normalized: AiOutput; suppressedCapsuleIds: string[] } {
  const queueHistory = getCapsuleQueueHistory(queue);
  const suppressedCapsuleIds = uniqueBy(
    normalized.targets
      .map((target) => target.capsule_id)
      .filter((capsuleId) => shouldCooldownCapsule(queueHistory.get(capsuleId))),
    (entry) => entry,
  );
  if (suppressedCapsuleIds.length === 0) {
    return { normalized, suppressedCapsuleIds: [] };
  }

  const suppressedSet = new Set(suppressedCapsuleIds);
  return {
    normalized: aiOutputSchema.parse({
      ...normalized,
      observations: [
        ...normalized.observations,
        `Suppressed ${suppressedCapsuleIds.length} cooled-down capsule target${suppressedCapsuleIds.length === 1 ? '' : 's'} because equivalent maintenance work is already in-flight or fully covered recently.`,
      ],
      targets: normalized.targets.filter((target) => !suppressedSet.has(target.capsule_id)),
      proposed_jobs: normalized.proposed_jobs.filter(
        (job) => !job.capsule_ids.every((capsuleId) => suppressedSet.has(capsuleId)),
      ),
    }),
    suppressedCapsuleIds,
  };
}

async function executeQueuedMaintenanceJobs(
  config: VaultStewardConfig,
  queue: VaultStewardQueue,
  runId: string,
): Promise<{
  executedJobs: VaultStewardJob[];
  nextQueue: VaultStewardQueue;
  lane: z.infer<typeof vaultStewardLaneReportSchema>;
}> {
  const queuedJobs = queue.jobs.filter(
    (job) => job.status === 'queued' && job.suggested_branch === 'dream',
  );

  if (queuedJobs.length === 0) {
    return {
      executedJobs: [],
      nextQueue: queue,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'maintainer',
        label: 'Executor',
        engine: 'provider',
        status: 'skipped',
        provider: config.provider ?? 'auto',
        model: config.model ?? null,
        summary: 'No queued Dream-branch capsule jobs were available for autonomous executor work.',
        error: null,
      }),
    };
  }

  const selectedJobs = selectExecutorJobsForRun(queue);
  const executedJobs: VaultStewardJob[] = [];

  try {
    const executionProviders = new Set<string>();
    let usedCodexFallback = false;
    for (const job of selectedJobs) {
      const capsules = (
        await Promise.all(job.capsule_ids.map((capsuleId) => readOverlayCapsule(capsuleId, 'dream')))
      ).filter((entry): entry is SovereignCapsule => Boolean(entry));

      if (capsules.length === 0) {
        continue;
      }

      const { system, prompt } = buildExecutorPrompt(job, capsules);
      let parsed: z.infer<typeof executorOutputSchema> | null = null;
      try {
        const result = await generateTextWithAiProvider({
          provider: config.provider ?? undefined,
          model: config.model ?? undefined,
          system,
          prompt,
          temperature: 0.15,
          maxTokens: 700,
          jsonMode: true,
        });
        const parsedRaw = extractFirstJsonObject(result.text);
        parsed = executorOutputSchema.parse(parsedRaw);
        executionProviders.add(result.provider ?? config.provider ?? 'auto');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Executor failed';
        const budgetRetryMaxTokens = getBudgetRetryMaxTokens(message, 700);
        if (budgetRetryMaxTokens) {
          try {
            const retried = await generateTextWithAiProvider({
              provider: config.provider ?? undefined,
              model: config.model ?? undefined,
              system,
              prompt,
              temperature: 0.15,
              maxTokens: budgetRetryMaxTokens,
              jsonMode: true,
            });
            const retriedParsedRaw = extractFirstJsonObject(retried.text);
            parsed = executorOutputSchema.parse(retriedParsedRaw);
            executionProviders.add(retried.provider ?? config.provider ?? 'auto');
          } catch {
            // fall through to Codex fallback below
          }
        }
        if (!parsed) {
          const codexResult = await runLocalCodexStructuredTask<z.infer<typeof executorOutputSchema>>({
            prompt: `${system}\n\n${prompt}`,
            schema: buildExecutorJsonSchema(),
            cwd: process.cwd(),
            timeoutMs: 90_000,
          });
          parsed = executorOutputSchema.parse(codexResult.data);
          executionProviders.add('chatgpt_local_codex');
          usedCodexFallback = true;
        }
      }

      if (!parsed) {
        throw new Error('Executor could not produce a structured maintenance update.');
      }

      for (const update of parsed.updates) {
        const sourceCapsule = capsules.find((capsule) => capsule.metadata.capsule_id === update.capsule_id);
        if (!sourceCapsule) continue;
        const nextCapsule = applyExecutorUpdate(sourceCapsule, update, runId, job);
        await writeOverlayCapsule(nextCapsule, 'dream');
      }

      executedJobs.push({
        ...job,
        status: 'completed',
      });
    }

    const executedIds = new Set(executedJobs.map((job) => job.id));
    const nextQueue: VaultStewardQueue = {
      ...queue,
      updated_at: nowIso(),
      jobs: queue.jobs.map((job) => (executedIds.has(job.id) ? { ...job, status: 'completed' } : job)),
    };

    const executedWorkstreams = uniqueBy(executedJobs.map((job) => job.workstream), (entry) => entry);
    return {
      executedJobs,
      nextQueue,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'maintainer',
        label: 'Executor',
        engine: usedCodexFallback ? 'local_codex' : 'provider',
        status: 'completed',
        provider: [...executionProviders].join(' + ') || (config.provider ?? 'auto'),
        model: config.model ?? null,
        summary: `Autonomously executed ${executedJobs.length} Dream-side capsule executor job${executedJobs.length === 1 ? '' : 's'} across ${executedWorkstreams.join(', ')} workstream${executedWorkstreams.length === 1 ? '' : 's'}${usedCodexFallback ? ' with Codex fallback on the execution lane.' : '.'}`,
        error: null,
      }),
    };
  } catch (error: unknown) {
    return {
      executedJobs: [],
      nextQueue: queue,
      lane: vaultStewardLaneReportSchema.parse({
        id: 'maintainer',
        label: 'Executor',
        engine: 'provider',
        status: 'failed',
        provider: config.provider ?? 'auto',
        model: config.model ?? null,
        summary: 'Autonomous capsule executor work failed, so queued Dream jobs were left untouched.',
        error: error instanceof Error ? error.message : 'Executor failed',
      }),
    };
  }
}

async function buildRunFromAi(config: VaultStewardConfig, summary: VaultSignalSummary): Promise<VaultStewardRun> {
  const startedAt = nowIso();
  const runId = `vault-steward-${Date.now()}`;
  const queueBeforeExecution = await readQueue();
  const effectiveSummary = applyQueueCooldownToSummary(summary, queueBeforeExecution);
  const scout = await runProviderScout(config, effectiveSummary, queueBeforeExecution);
  const foreman = await runCodexForeman(effectiveSummary, scout, queueBeforeExecution);

  const baseNormalized =
    foreman.available
      ? {
          overview: foreman.output.overview,
          workstream: foreman.output.workstream,
          observations: foreman.output.observations,
          suggested_actions: foreman.output.suggested_actions,
          targets: foreman.output.targets,
          proposed_jobs: foreman.output.proposed_jobs,
        }
      : scout.normalized;
  const filteredPlan = filterPlanAgainstQueueCooldown(baseNormalized, queueBeforeExecution);
  const normalized = filteredPlan.normalized;

  const rawText = [scout.rawText, foreman.available ? foreman.rawText : null].filter(Boolean).join('\n\n---\n\n');
  const filteredJobs = filterNewJobsAgainstQueue(toRunJobs(normalized.proposed_jobs, runId), queueBeforeExecution);
  const reviewer = await runCodexReviewer({
    summary: effectiveSummary,
    overview: normalized.overview,
    workstream: normalized.workstream,
    observations: normalized.observations,
    suggestedActions: normalized.suggested_actions,
    targets: normalized.targets,
    proposedJobs: filteredJobs.jobs,
    executedJobs: [],
  });
  const reviewerCancelledIds =
    reviewer.available ? new Set(reviewer.output.cancel_job_ids.filter((id) => filteredJobs.jobs.some((job) => job.id === id))) : new Set<string>();
  const reviewerCancelledJobs = filteredJobs.jobs.filter((job) => reviewerCancelledIds.has(job.id));
  const reviewerApprovedJobs = filteredJobs.jobs.filter((job) => !reviewerCancelledIds.has(job.id));
  const hasActiveQueue =
    queueBeforeExecution.jobs.some((job) => job.status === 'queued' || job.status === 'accepted');
  const autoSeededJobs =
    reviewerApprovedJobs.length === 0 &&
    reviewerCancelledJobs.length === 0 &&
    !hasActiveQueue &&
    normalized.targets.length > 0
      ? buildFallbackJobsFromTargets(
          normalized.targets,
          runId,
          queueBeforeExecution,
          normalized.workstream,
        )
      : [];
  const cycleJobs = reviewerApprovedJobs.length > 0 ? reviewerApprovedJobs : autoSeededJobs;
  const executor = await executeQueuedMaintenanceJobs(
    config,
    {
      version: 1,
      updated_at: queueBeforeExecution.updated_at,
      jobs: mergeJobs(queueBeforeExecution.jobs, cycleJobs),
    },
    runId,
  );
  const observations = uniqueBy(
    [
      ...normalized.observations,
      ...(filteredJobs.skipped.length > 0
        ? [
            `Skipped ${filteredJobs.skipped.length} duplicate job${filteredJobs.skipped.length === 1 ? '' : 's'} because equivalent work is already queued or completed.`,
          ]
        : []),
      ...(reviewerCancelledJobs.length > 0
        ? [
            `Codex reviewer vetoed ${reviewerCancelledJobs.length} newly proposed job${reviewerCancelledJobs.length === 1 ? '' : 's'} for this cycle because they appeared duplicate, stale, or not worth immediate execution.`,
          ]
        : []),
      ...(filteredPlan.suppressedCapsuleIds.length > 0
        ? [
            `Suppressed ${filteredPlan.suppressedCapsuleIds.length} cooled-down capsule target${filteredPlan.suppressedCapsuleIds.length === 1 ? '' : 's'} from the active plan because equivalent maintenance coverage already exists.`,
          ]
        : []),
      ...(autoSeededJobs.length > 0
        ? [
            `The swarm auto-seeded ${autoSeededJobs.length} fallback executor job${autoSeededJobs.length === 1 ? '' : 's'} from current capsule targets because the cycle had no surviving proposed jobs.`,
          ]
        : []),
      ...(reviewer.available ? reviewer.output.risk_flags : []),
    ],
    (entry) => entry.toLowerCase(),
  ).slice(0, 12);
  const suggestedActions = uniqueBy(
    [
      ...normalized.suggested_actions,
      ...(filteredJobs.skipped.length > 0
        ? [
            'Prefer validation or follow-up review on already completed capsule jobs before re-queuing the same workstream.',
          ]
        : []),
      ...(reviewerCancelledJobs.length > 0
        ? [
            'Respect Codex reviewer vetoes for stale or duplicate jobs before opening more Dream-side maintenance work.',
          ]
        : []),
      ...(filteredPlan.suppressedCapsuleIds.length > 0
        ? [
            'Treat recently covered capsules as cooled-down maintenance zones and move the swarm toward the next unresolved target instead of re-opening the same hub immediately.',
          ]
        : []),
      ...(autoSeededJobs.length > 0
        ? [
            'Review auto-seeded fallback jobs to make sure the swarm continues moving even when provider planning falls back to target-only reasoning.',
          ]
        : []),
      ...(reviewer.available ? reviewer.output.operator_focus : []),
    ],
    (entry) => entry.toLowerCase(),
  ).slice(0, 12);
  const reason =
    foreman.available || reviewer.available
      ? foreman.available
        ? 'hybrid_swarm_completed'
        : 'hybrid_swarm_completed_with_codex_review'
      : scout.reason;
  const combinedRawText = [rawText, reviewer.available ? reviewer.rawText : null]
    .filter(Boolean)
    .join('\n\n---\n\n');

  return vaultStewardRunSchema.parse({
    run_id: runId,
    started_at: startedAt,
    completed_at: nowIso(),
    status: 'completed',
    reason,
    provider: scout.provider,
    model: scout.model,
    overview: normalized.overview,
    workstream: normalized.workstream,
    observations,
    suggested_actions: suggestedActions,
    targets: normalized.targets,
    proposed_jobs: cycleJobs,
    executed_jobs: executor.executedJobs,
    lane_reports: [scout.lane, foreman.lane, reviewer.lane, executor.lane],
    raw_text: combinedRawText || null,
    graph_snapshot: {
      total_capsules: effectiveSummary.total_capsules,
      orphaned_capsules: effectiveSummary.orphaned_capsules,
      by_type: effectiveSummary.by_type,
    },
  });
}

export async function runVaultStewardCycle(): Promise<VaultStewardRun> {
  const config = await readConfig();
  const startedAt = nowIso();

  if (!config.enabled) {
    const skipped = vaultStewardRunSchema.parse({
      run_id: `vault-steward-${Date.now()}`,
      started_at: startedAt,
      completed_at: nowIso(),
      status: 'skipped',
      reason: 'agent_disabled',
      provider: config.provider,
      model: config.model,
      overview: 'Vault Steward is disabled, so no autonomous capsule maintenance run was performed.',
      workstream: 'mixed',
      observations: [],
      suggested_actions: ['Enable Vault Steward to start autonomous maintenance cycles.'],
      targets: [],
      proposed_jobs: [],
      executed_jobs: [],
      raw_text: null,
      graph_snapshot: {
        total_capsules: 0,
        orphaned_capsules: 0,
        by_type: {},
      },
    });
    await writeLatestRun(skipped);
    return skipped;
  }

  if (!isWithinWindow(config)) {
    const skipped = vaultStewardRunSchema.parse({
      run_id: `vault-steward-${Date.now()}`,
      started_at: startedAt,
      completed_at: nowIso(),
      status: 'skipped',
      reason: 'outside_autonomy_window',
      provider: config.provider,
      model: config.model,
      overview: 'Vault Steward is enabled but the current time is outside the configured autonomy window.',
      workstream: 'mixed',
      observations: [],
      suggested_actions: ['Wait for the configured night window or switch the agent to continuous mode.'],
      targets: [],
      proposed_jobs: [],
      executed_jobs: [],
      raw_text: null,
      graph_snapshot: {
        total_capsules: 0,
        orphaned_capsules: 0,
        by_type: {},
      },
    });
    await writeLatestRun(skipped);
    return skipped;
  }

  const rawCapsules = await readCapsulesFromDisk();
  const capsules = rawCapsules.filter((entry): entry is SovereignCapsule => {
    const record = extractRecord(entry);
    return Boolean(
      record &&
        extractRecord(record.metadata)?.capsule_id &&
        extractRecord(record.core_payload) &&
        extractRecord(record.neuro_concentrate) &&
        extractRecord(record.recursive_layer),
    );
  });
  const summary = summarizeVaultSignals(capsules, config.max_targets_per_run);
  const run = await buildRunFromAi(config, summary);
  const queue = await readQueue();
  const nextQueue = {
    version: 1 as const,
    updated_at: nowIso(),
    jobs: (() => {
      const executedMap = new Map(run.executed_jobs.map((job) => [job.id, job.status]));
      return mergeJobs(
        queue.jobs.map((job) => {
          const executedStatus = executedMap.get(job.id);
          return executedStatus ? { ...job, status: executedStatus } : job;
        }),
        run.proposed_jobs,
      ).map((job) => {
        const executedStatus = executedMap.get(job.id);
        return executedStatus ? { ...job, status: executedStatus } : job;
      });
    })(),
  };

  await writeQueue(nextQueue);
  await writeLatestRun(run);
  await writeDreamOperationalCapsules(run, nextQueue, config).catch(() => undefined);
  await logActivity('other', {
    message: 'Vault Steward completed a maintenance cycle.',
    run_id: run.run_id,
    status: run.status,
    provider: run.provider ?? 'auto',
    workstream: run.workstream,
    queued_jobs: run.proposed_jobs.length,
    executed_jobs: run.executed_jobs.length,
    planning_targets: run.targets.length,
    swarm_lanes: run.lane_reports.map((lane) => `${lane.label}:${lane.status}`).join(','),
  });

  return run;
}

export async function updateVaultStewardConfig(input: VaultStewardUpdateInput): Promise<VaultStewardState> {
  const parsed = vaultStewardUpdateSchema.parse(input);
  const current = await readConfig();
  const next = vaultStewardConfigSchema.parse({
    ...current,
    ...parsed,
    provider:
      parsed.provider === undefined
        ? current.provider
        : parsed.provider === 'auto'
          ? null
          : parsed.provider,
    model: parsed.model?.trim() ? parsed.model.trim() : parsed.model === '' ? null : current.model,
    updated_at: nowIso(),
  });

  await writeConfig(next);
  await logActivity('update', {
    message: 'Vault Steward configuration updated.',
    enabled: next.enabled,
    provider: next.provider ?? 'auto',
    mode: next.mode,
  });

  if (next.enabled) {
    await startVaultSteward();
  } else {
    await stopVaultSteward();
  }

  return getVaultStewardState();
}

export async function startVaultSteward(): Promise<VaultStewardRuntime> {
  const runtime = await readRuntime();
  const runtimeAlive = runtime.status !== 'stopped' && isProcessAlive(runtime.pid);
  await terminateVaultStewardProcesses(runtimeAlive && runtime.pid ? [runtime.pid] : []);
  if (runtime.status !== 'stopped' && isProcessAlive(runtime.pid)) {
    return runtime;
  }

  await ensureAgentsDir();
  if (!fs.existsSync(TSX_CLI_PATH)) {
    const failedRuntime = vaultStewardRuntimeSchema.parse({
      ...DEFAULT_RUNTIME(),
      last_error: 'tsx runtime not found; install dependencies before starting Vault Steward',
      updated_at: nowIso(),
    });
    await writeRuntime(failedRuntime);
    return failedRuntime;
  }

  const logFd = fs.openSync(VAULT_STEWARD_LOG_PATH, 'a');
  const child = spawn(process.execPath, [TSX_CLI_PATH, VAULT_STEWARD_SCRIPT_PATH], {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: {
      ...process.env,
    },
  });
  child.unref();

  const nextRuntime = vaultStewardRuntimeSchema.parse({
    version: 1,
    pid: child.pid ?? null,
    status: 'starting',
    started_at: nowIso(),
    last_heartbeat_at: null,
    last_run_at: null,
    last_exit_at: null,
    latest_run_id: null,
    loop_count: 0,
    idle_streak: 0,
    next_scheduled_at: null,
    last_error: null,
    updated_at: nowIso(),
  });
  await writeRuntime(nextRuntime);
  return nextRuntime;
}

export async function stopVaultSteward(): Promise<VaultStewardRuntime> {
  const runtime = await readRuntime();
  if (runtime.pid && isProcessAlive(runtime.pid)) {
    try {
      process.kill(-runtime.pid, 'SIGTERM');
    } catch {
      // noop
    }
    try {
      process.kill(runtime.pid, 'SIGTERM');
    } catch {
      // noop
    }
  }
  await terminateVaultStewardProcesses();

  const nextRuntime = vaultStewardRuntimeSchema.parse({
    ...runtime,
    pid: null,
    status: 'stopped',
    idle_streak: 0,
    next_scheduled_at: null,
    last_exit_at: nowIso(),
    updated_at: nowIso(),
  });
  await writeRuntime(nextRuntime);
  return nextRuntime;
}

export async function markVaultStewardHeartbeat(patch: Partial<VaultStewardRuntime>): Promise<void> {
  const current = await readRuntime();
  await writeRuntime(
    vaultStewardRuntimeSchema.parse({
      ...current,
      ...patch,
      updated_at: nowIso(),
    }),
  );
}

export async function runVaultStewardDaemon(options: { once?: boolean } = {}): Promise<void> {
  const once = options.once === true;

  const shutdown = async () => {
    await markVaultStewardHeartbeat({
      pid: null,
      status: 'stopped',
      last_exit_at: nowIso(),
    });
  };

  process.on('SIGINT', () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    void shutdown().finally(() => process.exit(0));
  });

  await markVaultStewardHeartbeat({
    pid: process.pid,
    status: 'running',
    started_at: nowIso(),
    last_heartbeat_at: nowIso(),
    idle_streak: 0,
    next_scheduled_at: null,
    last_error: null,
  });

  do {
    const config = await readConfig();
    if (!config.enabled && !once) {
      break;
    }

    const runtimeBeforeLoop = await readRuntime();
    await markVaultStewardHeartbeat({
      pid: process.pid,
      status: 'running',
      last_heartbeat_at: nowIso(),
      loop_count: runtimeBeforeLoop.loop_count + 1,
      next_scheduled_at: null,
      last_error: null,
    });

    const run = await runVaultStewardCycle();
    const { delayMs, idleStreak } = computeAdaptiveDaemonDelay(
      config,
      run,
      runtimeBeforeLoop.idle_streak,
    );
    const nextScheduledAt = once ? null : new Date(Date.now() + delayMs).toISOString();
    await markVaultStewardHeartbeat({
      pid: process.pid,
      status: 'running',
      latest_run_id: run.run_id,
      last_run_at: run.completed_at,
      idle_streak: idleStreak,
      next_scheduled_at: nextScheduledAt,
      last_error: run.status === 'failed' ? run.reason : null,
      last_heartbeat_at: nowIso(),
    });

    if (once) break;

    await sleep(delayMs);
  } while (true);

  await shutdown();
}

export async function runVaultStewardOnce(): Promise<VaultStewardRun> {
  return runVaultStewardCycle();
}
