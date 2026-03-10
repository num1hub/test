import { z } from 'zod';

import { stableHash } from '@/lib/validator/utils';

import {
  CAPSULE_RECENT_ACTIVITY_WINDOW_MS,
  MAX_AUTONOMOUS_EXECUTOR_JOBS_PER_RUN,
} from './constants';
import {
  vaultStewardTargetSchema,
  vaultStewardWorkstreamSchema,
  type VaultStewardJob,
  type VaultStewardQueue,
} from './schemas';
import { nowIso, uniqueBy } from './utils';

export function getJobIdentityKey(job: Pick<VaultStewardJob, 'workstream' | 'suggested_branch' | 'capsule_ids'>): string {
  return stableHash({
    workstream: job.workstream,
    suggested_branch: job.suggested_branch,
    capsule_ids: [...job.capsule_ids].sort(),
  });
}

function isRecentCompletedJob(job: VaultStewardJob, nowMs = Date.now()): boolean {
  if (job.status !== 'completed') return false;
  const createdAtMs = Number.isFinite(Date.parse(job.created_at)) ? Date.parse(job.created_at) : null;
  if (createdAtMs === null) return false;
  return nowMs - createdAtMs <= CAPSULE_RECENT_ACTIVITY_WINDOW_MS;
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
