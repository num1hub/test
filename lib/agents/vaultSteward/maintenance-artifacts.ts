import { type z } from 'zod';

import { readBranchManifest, writeOverlayCapsule } from '@/lib/diff/branch-manager';
import { computeIntegrityHash } from '@/lib/validator/utils';
import type { SovereignCapsule } from '@/types/capsule';
import {
  vaultStewardWorkstreamSchema,
  executorOutputSchema,
  type VaultStewardConfig,
  type VaultStewardJob,
  type VaultStewardQueue,
  type VaultStewardRun,
} from './schemas';

const PENDING_A2C_HASH_STAGE = 'PENDING_A2C_HASH_STAGE';

function nowIso(): string {
  return new Date().toISOString();
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

function toCapsuleKeywords(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

function sanitizeOperationalText(value: string): string {
  return value
    .replace(
      /No queued Dream-branch capsule jobs were available for autonomous executor work\./gi,
      'No queued capsule jobs were available for autonomous executor work.',
    )
    .replace(/Dream-branch capsule jobs/gi, 'queued capsule jobs')
    .replace(/Dream-first review and follow-through/gi, 'review and follow-through')
    .replace(/completed autonomously on Dream/gi, 'completed autonomously');
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
  const existingKeywords = toCapsuleKeywords(capsule.neuro_concentrate.keywords);
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
          `- ${lane.label} [${lane.status}] ${lane.provider ?? lane.engine}${lane.model ? ` / ${lane.model}` : ''}: ${sanitizeOperationalText(lane.summary)}${lane.error ? ` (error: ${lane.error})` : ''}`,
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
      ? run.executed_jobs.map((job) => `- ${job.label}: completed autonomously`)
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
      summary:
        'Vault Steward Latest Run records the current autonomous maintenance cycle, including the operating thesis, observed graph conditions, suggested follow-through, lane outcomes, and queue posture. It explains why the run closed without broad mutation, which hubs remain on the watchlist, and how the runtime balanced structural caution with ongoing stewardship evidence. It also preserves the graph snapshot, provider path, and execution status so later review can distinguish a quiet stable cycle from a degraded or incomplete run.',
      keywords: [
        'vault-steward',
        'agent-swarm',
        'codex-foreman',
        'background-agent',
        'capsule-maintenance',
        'maintenance-runtime',
        'operations',
        run.workstream,
      ],
      confidence_vector: {
        extraction: 0.88,
        synthesis: 0.9,
        linking: 0.86,
        provenance_coverage: 0.9,
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
    integrity_sha3_512: PENDING_A2C_HASH_STAGE,
  };
  return capsule;
}

function buildQueueCapsule(queue: VaultStewardQueue): SovereignCapsule {
  const activeJobs = queue.jobs.filter((job) => job.status === 'queued' || job.status === 'accepted');
  const content = [
    '# Vault Steward Queue',
    '',
    `Queued jobs: ${activeJobs.filter((job) => job.status === 'queued').length}`,
    '',
    '## Pending Jobs',
    '',
    ...(activeJobs.length > 0
      ? activeJobs.slice(0, 12).map((job) =>
          [
            `## ${job.label}`,
            '',
            `- Status: ${job.status}`,
            `- Workstream: ${job.workstream}`,
            `- Human confirmation: ${job.needs_human_confirmation ? 'yes' : 'no'}`,
            `- Capsules: ${job.capsule_ids.join(', ')}`,
            '',
            sanitizeOperationalText(job.goal),
          ].join('\n'),
        )
      : ['- none']),
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
      semantic_hash: 'vault-steward-queue-active-current-pending-jobs-only',
      source: {
        uri: 'n1hub://agents/vault-steward',
        type: 'background_agent',
      },
      priority: 'high',
      progress:
        activeJobs.length === 0
          ? 0
          : Math.max(0, 100 - activeJobs.filter((job) => job.status === 'queued').length),
      tier: 3,
    },
    core_payload: {
      content_type: 'markdown',
      content,
    },
    neuro_concentrate: {
      summary:
        'Vault Steward Queue records the current pending and in-progress maintenance jobs proposed by the autonomous vault agent. It keeps the active worklist visible for operators, preserves job goals, confirmation requirements, and linked capsules, and provides a current-state queue snapshot without requiring a read through private runtime files or older completed run history. It also clarifies which jobs remain active after archive rotation so current operations stay readable, bounded, and low-noise for later review.',
      keywords: [
        'vault-steward',
        'maintenance-queue',
        'operations',
        'background-agent',
        'active-queue',
      ],
      confidence_vector: {
        extraction: 0.86,
        synthesis: 0.88,
        linking: 0.83,
        provenance_coverage: 0.9,
        validation_score: 0.89,
        contradiction_pressure: 0.05,
      },
      semantic_hash: 'vault-steward-queue-active-current-pending-jobs-only',
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
    integrity_sha3_512: PENDING_A2C_HASH_STAGE,
  };
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
          `- ${lane.label} [${lane.status}] ${lane.provider ?? lane.engine}${lane.model ? ` / ${lane.model}` : ''}: ${sanitizeOperationalText(lane.summary)}`,
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
      semantic_hash: 'vault-steward-plan-operations-capsule-maintenance-planning-current',
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
        'Vault Steward Plan captures the current maintenance thesis, planning goals, focus capsules, queue posture, and near-term follow-through identified by the autonomous vault agent. It gives operators a compact operational view of why the current cycle mattered, which tasks belong now versus later, and how the active swarm lanes behaved without requiring a full read of runtime logs or private queue data. It also preserves the rationale behind the current planning horizon so later review can distinguish a deliberately quiet cycle from missing work capture.',
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
        provenance_coverage: 0.9,
        validation_score: 0.9,
        contradiction_pressure: 0.05,
      },
      semantic_hash: 'vault-steward-plan-operations-capsule-maintenance-planning-current',
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
    integrity_sha3_512: PENDING_A2C_HASH_STAGE,
  };
  return capsule;
}

export {
  applyExecutorUpdate,
  buildLatestRunCapsule,
  buildPlanCapsule,
  buildQueueCapsule,
  withAutonomousMaintenanceSection,
};


export async function writeDreamOperationalCapsules(
  run: VaultStewardRun,
  queue: VaultStewardQueue,
  config: VaultStewardConfig,
): Promise<void> {
  const dreamManifest = await readBranchManifest('dream');
  if (!dreamManifest) return;

  await writeOverlayCapsule(buildLatestRunCapsule(run, config), 'dream');
  await writeOverlayCapsule(buildQueueCapsule(queue), 'dream');
  await writeOverlayCapsule(buildPlanCapsule(run, queue, config), 'dream');
}
