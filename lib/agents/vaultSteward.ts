import { z } from 'zod';
import { logActivity } from '@/lib/activity';
import { getResolvedAiProviderCatalog } from '@/lib/ai/providerRuntime';
import { type AiWalletProviderId } from '@/lib/aiWalletSchema';
import { readCapsulesFromDisk } from '@/lib/capsuleVault';
import { stableHash } from '@/lib/validator/utils';
import type { SovereignCapsule } from '@/types/capsule';
import {
  aiOutputSchema,
  vaultStewardConfigSchema,
  vaultStewardLaneReportSchema,
  vaultStewardRunSchema,
  vaultStewardSwarmSchema,
  vaultStewardUpdateSchema,
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
import { writeDreamOperationalCapsules } from './vaultSteward/maintenance-artifacts';
import { buildVaultStewardSwarmState } from './vaultSteward/swarm-state';
import * as vaultStewardPrompting from './vaultSteward/prompting';
import {
  markVaultStewardLifecycleHeartbeat,
  runVaultStewardDaemonLifecycle,
  startVaultStewardLifecycle,
  stopVaultStewardLifecycle,
} from './vaultSteward/lifecycle';
import { runVaultStewardExecutorLane } from './vaultSteward/executor';
import { runVaultStewardCodexForeman } from './vaultSteward/foreman';
import { runVaultStewardCodexReviewer } from './vaultSteward/reviewer';
import { runVaultStewardProviderScoutOnce } from './vaultSteward/scout';
import { extractRecord, isWithinWindow, nowIso, uniqueBy } from './vaultSteward/utils';
import {
  readVaultStewardConfig,
  readVaultStewardLatestRun,
  readVaultStewardQueue,
  readVaultStewardRuntime,
  writeVaultStewardConfig,
  writeVaultStewardLatestRun,
  writeVaultStewardQueue,
} from './vaultSteward/runtime-store';

export {
  applyQueueCooldownToSummary,
  buildFallbackJobsFromTargets,
  buildVaultStewardCodexSupervisorPrompt,
  buildVaultStewardExecutorPrompt,
  runVaultStewardCodexForeman,
  runVaultStewardCodexReviewer,
  runVaultStewardExecutorLane,
  runVaultStewardProviderScoutOnce,
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

const buildVaultStewardCodexSupervisorPrompt = vaultStewardPrompting.buildCodexSupervisorPrompt;
const buildVaultStewardExecutorPrompt = vaultStewardPrompting.buildExecutorPrompt;


const readConfig = readVaultStewardConfig;
const readRuntime = readVaultStewardRuntime;
const readQueue = readVaultStewardQueue;
const readLatestRun = readVaultStewardLatestRun;
const writeConfig = writeVaultStewardConfig;
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

async function getSwarmApiProviderOrder(
  preferredProvider?: AiWalletProviderId | null,
): Promise<AiWalletProviderId[]> {
  const catalog = await getResolvedAiProviderCatalog();
  return rankSwarmApiProviders(catalog, preferredProvider);
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

async function runProviderScout(
  config: VaultStewardConfig,
  summary: VaultSignalSummary,
  queue: VaultStewardQueue,
): Promise<VaultStewardScoutResult> {
  const attemptOrder = await getSwarmApiProviderOrder(config.provider);
  if (attemptOrder.length === 0) {
    return runVaultStewardProviderScoutOnce(config, summary, queue);
  }

  let primaryResult: VaultStewardScoutResult | null = null;
  const degradedAttempts: string[] = [];

  for (const [index, provider] of attemptOrder.entries()) {
    const result = await runVaultStewardProviderScoutOnce(
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
    return runVaultStewardProviderScoutOnce(config, summary, queue);
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

async function buildRunFromAi(config: VaultStewardConfig, summary: VaultSignalSummary): Promise<VaultStewardRun> {
  const startedAt = nowIso();
  const runId = `vault-steward-${Date.now()}`;
  const queueBeforeExecution = await readQueue();
  const effectiveSummary = applyQueueCooldownToSummary(summary, queueBeforeExecution);
  const scout = await runProviderScout(config, effectiveSummary, queueBeforeExecution);
  const foreman = await runVaultStewardCodexForeman(effectiveSummary, scout, queueBeforeExecution);

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
  const reviewer = await runVaultStewardCodexReviewer({
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
  const executor = await runVaultStewardExecutorLane(
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
  return startVaultStewardLifecycle();
}

export async function stopVaultSteward(): Promise<VaultStewardRuntime> {
  return stopVaultStewardLifecycle();
}

export async function markVaultStewardHeartbeat(patch: Partial<VaultStewardRuntime>): Promise<void> {
  await markVaultStewardLifecycleHeartbeat(patch);
}

export async function runVaultStewardDaemon(options: { once?: boolean } = {}): Promise<void> {
  await runVaultStewardDaemonLifecycle({
    once: options.once,
    runCycle: runVaultStewardCycle,
    computeAdaptiveDaemonDelay,
  });
}

export async function runVaultStewardOnce(): Promise<VaultStewardRun> {
  return runVaultStewardCycle();
}
