import { z } from 'zod';

import { stableHash } from '@/lib/validator/utils';
import type { SovereignCapsule } from '@/types/capsule';
import { type AiWalletProviderId } from '@/lib/aiWalletSchema';
import { type AiProviderCatalogEntry } from '@/lib/ai/providerRuntime';

import {
  CODEX_FOREMAN_MIN_INTERVAL_MS,
  CODEX_FOREMAN_TIMEOUT_COOLDOWN_MS,
  CAPSULE_RECENT_ACTIVITY_MAX_COMPLETED,
  CAPSULE_RECENT_ACTIVITY_WINDOW_MS,
  MAX_AUTONOMOUS_EXECUTOR_JOBS_PER_RUN,
  SWARM_API_PROVIDER_EXCLUSIONS,
  TSX_CLI_PATH,
  VAULT_STEWARD_SCRIPT_PATH,
} from './constants';
import {
  aiOutputSchema,
  vaultStewardLaneReportSchema,
  vaultStewardTargetSchema,
  vaultStewardWorkstreamSchema,
  type VaultStewardConfig,
  type VaultStewardJob,
  type VaultStewardQueue,
  type VaultStewardRun,
} from './schemas';

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

export interface VaultSignalSummary {
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

export interface VaultStewardScoutResult {
  normalized: AiOutput;
  provider: AiWalletProviderId | null;
  model: string | null;
  rawText: string | null;
  reason: string;
  lane: z.infer<typeof vaultStewardLaneReportSchema>;
}

function isSwarmApiProvider(provider: AiWalletProviderId): boolean {
  return !SWARM_API_PROVIDER_EXCLUSIONS.has(provider);
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

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toNumberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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

export function computeAdaptiveDaemonDelay(
  config: VaultStewardConfig,
  run: VaultStewardRun,
  previousIdleStreak: number,
): { delayMs: number; idleStreak: number } {
  const baseDelayMs = Math.max(config.interval_minutes, 1) * 60 * 1000;
  const isIdleMonitoringRun =
    run.status === 'completed' &&
    run.targets.length === 0 &&
    run.proposed_jobs.length === 0 &&
    run.executed_jobs.length === 0;

  if (!isIdleMonitoringRun) {
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

export function getCapsuleQueueHistory(
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

export function shouldCooldownCapsule(
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

export function getJobIdentityKey(job: Pick<VaultStewardJob, 'workstream' | 'suggested_branch' | 'capsule_ids'>): string {
  return stableHash({
    workstream: job.workstream,
    suggested_branch: job.suggested_branch,
    capsule_ids: [...job.capsule_ids].sort(),
  });
}

function mergeDuplicateJob(existing: VaultStewardJob, incoming: VaultStewardJob): VaultStewardJob {
  const isRecentCompletedJob = (
    target: VaultStewardJob,
    nowMs = Date.now(),
  ): boolean => {
    if (target.status !== 'completed') return false;
    const createdAtMs = Number.isFinite(Date.parse(target.created_at)) ? Date.parse(target.created_at) : null;
    if (createdAtMs === null) return false;
    return nowMs - createdAtMs <= CAPSULE_RECENT_ACTIVITY_WINDOW_MS;
  };

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
      ...candidates
        .filter((entry) => entry.reasons.some((reason) => reason.includes('weakly connected')))
        .sort((a, b) => a.outbound_links + a.inbound_links - (b.outbound_links + b.inbound_links)),
      ...candidates
        .filter((entry) => entry.reasons.some((reason) => reason.includes('summary') || reason.includes('keyword')))
        .sort((a, b) => a.summary_length - b.summary_length),
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

  if (filteredCandidates.length === 0) return summary;

  return {
    ...summary,
    candidates: filteredCandidates,
  };
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

export function buildFallbackJobsFromTargets(
  targets: z.infer<typeof vaultStewardTargetSchema>[],
  runId: string,
  queue: VaultStewardQueue,
  defaultWorkstream: z.infer<typeof vaultStewardWorkstreamSchema>,
  maxJobs = MAX_AUTONOMOUS_EXECUTOR_JOBS_PER_RUN,
): VaultStewardJob[] {
  const createdAt = new Date().toISOString();
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
  return scout.reason === 'used_fallback_analysis' && shouldRunCodexForeman(scout, queue).run;
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

export function filterPlanAgainstQueueCooldown(
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

function isRecentCompletedJob(job: VaultStewardJob, nowMs = Date.now()): boolean {
  if (job.status !== 'completed') return false;
  const createdAtMs = Number.isFinite(Date.parse(job.created_at)) ? Date.parse(job.created_at) : null;
  if (createdAtMs === null) return false;
  return nowMs - createdAtMs <= CAPSULE_RECENT_ACTIVITY_WINDOW_MS;
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

export function getCodexForemanRetrySignals(latestRun: VaultStewardRun | null): {
  timeoutCooldownActive: boolean;
  cadenceHoldActive: boolean;
  cooldownUntil: string | null;
  holdUntil: string | null;
  cooldownError: string | null;
} {
  const latestForemanReport = latestRun?.lane_reports.find((lane) => lane.id === 'foreman') ?? null;
  const timeoutCooldownReason = latestForemanReport?.error?.toLowerCase() ?? '';
  const timeoutCooldownActive = latestForemanReport?.status === 'failed'
    ? timeoutCooldownReason.includes('timed out') && Boolean(latestRun?.completed_at)
    : false;

  const timeoutMs = timeoutCooldownActive && latestRun?.completed_at
    ? new Date(latestRun.completed_at).getTime() + CODEX_FOREMAN_TIMEOUT_COOLDOWN_MS
    : null;

  const latestForemanCompletedAt = latestRun?.completed_at
    ? new Date(latestRun.completed_at).getTime()
    : null;
  const holdMs = latestForemanCompletedAt !== null
    ? latestForemanCompletedAt + CODEX_FOREMAN_MIN_INTERVAL_MS
    : null;

  return {
    timeoutCooldownActive,
    cadenceHoldActive: latestForemanCompletedAt !== null
      ? Date.now() < (holdMs ?? Date.now() - 1)
      : false,
    cooldownUntil: timeoutMs !== null && Date.now() < timeoutMs ? new Date(timeoutMs).toISOString() : null,
    holdUntil: holdMs !== null && Date.now() < holdMs ? new Date(holdMs).toISOString() : null,
    cooldownError: timeoutCooldownActive ? latestForemanReport?.error ?? null : null,
  };
}
