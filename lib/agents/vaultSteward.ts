import fs from 'fs';
import { spawn } from 'child_process';
import { z } from 'zod';
import { logActivity } from '@/lib/activity';
import { getLocalCodexAvailability, runLocalCodexStructuredTask } from '@/lib/agents/localCodex';
import { generateTextWithAiProvider, getResolvedAiProviderCatalog } from '@/lib/ai/providerRuntime';
import { type AiWalletProviderId } from '@/lib/aiWalletSchema';
import { readCapsulesFromDisk } from '@/lib/capsuleVault';
import { readBranchManifest, readOverlayCapsule, writeOverlayCapsule } from '@/lib/diff/branch-manager';
import { stableHash } from '@/lib/validator/utils';
import type { SovereignCapsule } from '@/types/capsule';
import {
  CODEX_FOREMAN_MAX_QUEUE_CONTEXT,
  CODEX_FOREMAN_MAX_SCOUT_ACTIONS,
  CODEX_FOREMAN_MAX_SCOUT_JOBS,
  CODEX_FOREMAN_MAX_SCOUT_OBSERVATIONS,
  CODEX_FOREMAN_MAX_SCOUT_TARGETS,
  TSX_CLI_PATH,
  VAULT_STEWARD_LOG_PATH,
  VAULT_STEWARD_SCRIPT_PATH,
} from './vaultSteward/constants';
import {
  aiOutputSchema,
  codexReviewerOutputSchema,
  codexSupervisorOutputSchema,
  executorOutputSchema,
  vaultStewardConfigSchema,
  vaultStewardLaneReportSchema,
  vaultStewardRuntimeSchema,
  vaultStewardRunSchema,
  vaultStewardSwarmSchema,
  vaultStewardTargetSchema,
  vaultStewardUpdateSchema,
  vaultStewardWorkstreamSchema,
  VaultStewardConfig,
  VaultStewardJob,
  VaultStewardQueue,
  VaultStewardRun,
  VaultStewardRuntime,
  VaultStewardUpdateInput,
} from './vaultSteward/schemas';
import {
  applyQueueCooldownToSummary,
  buildFallbackJobsFromTargets,
  computeAdaptiveDaemonDelay,
  filterNewJobsAgainstQueue,
  filterPlanAgainstQueueCooldown,
  getCapsuleQueueHistory,
  isVaultStewardProcessCommand,
  rankSwarmApiProviders,
  selectExecutorJobsForRun,
  shouldCooldownCapsule,
  shouldBypassCodexForemanCadenceHold,
  shouldRunCodexForeman,
  summarizeVaultSignals,
  type VaultSignalSummary,
  type VaultStewardScoutResult,
  mergeJobs,
} from './vaultSteward/queue-planning';
import { applyExecutorUpdate, buildLatestRunCapsule, buildPlanCapsule, buildQueueCapsule } from './vaultSteward/maintenance-artifacts';
import { buildVaultStewardSwarmState, getCodexForemanCadenceHold, getCodexForemanCooldown } from './vaultSteward/swarm-state';
import * as vaultStewardPrompting from './vaultSteward/prompting';
import {
  DEFAULT_VAULT_STEWARD_RUNTIME,
  readVaultStewardConfig,
  readVaultStewardLatestRun,
  readVaultStewardQueue,
  readVaultStewardRuntime,
  writeVaultStewardConfig,
  writeVaultStewardLatestRun,
  writeVaultStewardQueue,
  writeVaultStewardRuntime,
  normalizeVaultStewardRuntime,
  terminateVaultStewardProcesses,
  sleep,
} from './vaultSteward/runtime-store';

export {
  applyQueueCooldownToSummary,
  buildFallbackJobsFromTargets,
  computeAdaptiveDaemonDelay,
  filterNewJobsAgainstQueue,
  filterPlanAgainstQueueCooldown,
  getCapsuleQueueHistory,
  isVaultStewardProcessCommand,
  rankSwarmApiProviders,
  selectExecutorJobsForRun,
  shouldCooldownCapsule,
  shouldBypassCodexForemanCadenceHold,
  shouldRunCodexForeman,
  summarizeVaultSignals,
  mergeJobs,
};

const DEFAULT_RUNTIME = DEFAULT_VAULT_STEWARD_RUNTIME;
const USE_LEGACY_VAULT_STEWARD_PROMPTS = process.env.N1HUB_VAULT_STEWARD_LEGACY_PROMPTS === '1';

const readConfig = readVaultStewardConfig;
const readRuntime = readVaultStewardRuntime;
const readQueue = readVaultStewardQueue;
const readLatestRun = readVaultStewardLatestRun;
const writeConfig = writeVaultStewardConfig;
const writeRuntime = writeVaultStewardRuntime;
const writeQueue = writeVaultStewardQueue;
const writeLatestRun = writeVaultStewardLatestRun;

export type { VaultStewardConfig, VaultStewardJob, VaultStewardQueue, VaultStewardRun, VaultStewardRuntime, VaultStewardUpdateInput };

export interface VaultStewardState {
  config: VaultStewardConfig;
  runtime: VaultStewardRuntime;
  latest_run: VaultStewardRun | null;
  queue: VaultStewardQueue;
  swarm: z.infer<typeof vaultStewardSwarmSchema>;
}


function nowIso(): string {
  return new Date().toISOString();
}

async function getSwarmApiProviderOrder(
  preferredProvider?: AiWalletProviderId | null,
): Promise<AiWalletProviderId[]> {
  const catalog = await getResolvedAiProviderCatalog();
  return rankSwarmApiProviders(catalog, preferredProvider);
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
  return vaultStewardPrompting.extractFirstJsonObject(raw);
}

function buildFallbackAnalysis(summary: VaultSignalSummary): z.infer<typeof aiOutputSchema> {
  return vaultStewardPrompting.buildFallbackAnalysis(summary);
}

function buildPrompt(
  summary: VaultSignalSummary,
  queue: VaultStewardQueue,
  options?: { compact?: boolean },
): { system: string; prompt: string } {
  if (!USE_LEGACY_VAULT_STEWARD_PROMPTS) {
    return vaultStewardPrompting.buildPrompt(summary, queue, options);
  }
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
  if (!USE_LEGACY_VAULT_STEWARD_PROMPTS) {
    return vaultStewardPrompting.buildScoutRepairPrompt(rawText);
  }
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
  if (!USE_LEGACY_VAULT_STEWARD_PROMPTS) {
    return vaultStewardPrompting.buildCodexSupervisorPrompt(summary, scout, queue);
  }
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
  if (!USE_LEGACY_VAULT_STEWARD_PROMPTS) {
    return vaultStewardPrompting.buildCodexSupervisorJsonSchema();
  }
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
  if (!USE_LEGACY_VAULT_STEWARD_PROMPTS) {
    return vaultStewardPrompting.buildCodexReviewerPrompt(input);
  }
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
  if (!USE_LEGACY_VAULT_STEWARD_PROMPTS) {
    return vaultStewardPrompting.buildCodexReviewerJsonSchema();
  }
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
  if (!USE_LEGACY_VAULT_STEWARD_PROMPTS) {
    return vaultStewardPrompting.getExecutorWorkstreamGuidance(workstream);
  }
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
  if (!USE_LEGACY_VAULT_STEWARD_PROMPTS) {
    return vaultStewardPrompting.buildExecutorPrompt(job, capsules);
  }
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
  if (!USE_LEGACY_VAULT_STEWARD_PROMPTS) {
    return vaultStewardPrompting.buildExecutorJsonSchema();
  }
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
    reviewer.available
      ? new Set(
          reviewer.output.cancel_job_ids.filter((id: string) =>
            filteredJobs.jobs.some((job) => job.id === id),
          ),
        )
      : new Set<string>();
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
  const runtimeAlive = runtime.status !== 'stopped' && runtime.pid != null;
  await terminateVaultStewardProcesses(runtimeAlive && runtime.pid ? [runtime.pid] : []);
  if (runtime.status !== 'stopped' && runtime.pid != null) {
    return runtime;
  }

  if (!fs.existsSync(TSX_CLI_PATH)) {
    const failedRuntime = normalizeVaultStewardRuntime({
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
  if (runtime.status !== 'stopped' && runtime.pid) {
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
