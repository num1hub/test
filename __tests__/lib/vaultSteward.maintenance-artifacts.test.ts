import { describe, expect, it } from 'vitest';
import { validateCapsule } from '@/lib/validator';
import {
  buildLatestRunCapsule,
  buildPlanCapsule,
  buildQueueCapsule,
} from '@/lib/agents/vaultSteward/maintenance-artifacts';
import type {
  VaultStewardConfig,
  VaultStewardJob,
  VaultStewardQueue,
  VaultStewardRun,
} from '@/lib/agents/vaultSteward/schemas';

const config: VaultStewardConfig = {
  version: 1,
  enabled: true,
  provider: 'github_models',
  model: 'openai/gpt-4.1',
  mode: 'continuous',
  interval_minutes: 30,
  night_start_hour: 1,
  night_end_hour: 6,
  timezone: null,
  max_targets_per_run: 6,
  updated_at: '2026-03-12T00:00:00.000Z',
};

const queuedJob: VaultStewardJob = {
  id: 'vault-steward-job-1',
  label: 'Queue review for workspace',
  goal:
    'Assess `capsule.foundation.workspace.v1` for boundary clarity, preserve current ownership seams, and queue only the smallest follow-through actions that remain justified by live graph evidence.',
  workstream: 'decomposition',
  capsule_ids: ['capsule.foundation.workspace.v1'],
  suggested_branch: 'dream',
  needs_human_confirmation: false,
  created_at: '2026-03-12T00:00:00.000Z',
  source_run_id: 'vault-steward-run-1',
  status: 'queued',
};

const run: VaultStewardRun = {
  run_id: 'vault-steward-run-1',
  started_at: '2026-03-12T00:00:00.000Z',
  completed_at: '2026-03-12T00:05:00.000Z',
  status: 'completed',
  reason: 'analysis_completed',
  provider: 'github_models',
  model: 'openai/gpt-4.1',
  overview:
    'The current maintenance cycle found a bounded review path with no orphaned capsules, a small set of watchlist hubs, and no evidence that broad graph rewrites are justified ahead of measured runtime and governance follow-through.',
  workstream: 'decomposition',
  observations: [
    'Workspace remains the main watchlist hub because it coordinates several live modules and continues to attract structural review pressure.',
    'Recent maintenance closed the largest parent-hub overloads, so the current cycle focuses on bounded follow-through instead of another broad split wave.',
  ],
  suggested_actions: [
    'Track workspace link growth and reopen decomposition only when a measured threshold is crossed.',
    'Keep queue activity bounded to explicit evidence and avoid reopening recently completed workstreams.',
  ],
  targets: [
    {
      capsule_id: 'capsule.foundation.workspace.v1',
      reason: 'It remains the clearest watchlist hub for bounded structural follow-through.',
      priority: 'high',
    },
  ],
  proposed_jobs: [queuedJob],
  executed_jobs: [queuedJob],
  lane_reports: [
    {
      id: 'scout',
      label: 'Scout',
      engine: 'provider',
      status: 'completed',
      provider: 'github_models',
      model: 'openai/gpt-4.1',
      summary: 'Provider scout completed and produced a bounded maintenance plan.',
      error: null,
    },
    {
      id: 'maintainer',
      label: 'Executor',
      engine: 'provider',
      status: 'skipped',
      provider: 'github_models',
      model: null,
      summary: 'No queued Dream-branch capsule jobs were available for autonomous executor work.',
      error: null,
    },
  ],
  raw_text: null,
  graph_snapshot: {
    total_capsules: 489,
    orphaned_capsules: 0,
    by_type: {
      operations: 7,
      concept: 3,
      foundation: 166,
      project: 13,
    },
  },
};

const queue: VaultStewardQueue = {
  version: 1,
  updated_at: '2026-03-12T00:05:00.000Z',
  jobs: [queuedJob],
};

describe('vault steward maintenance artifacts', () => {
  it('emits latest, plan, and queue capsules without Dream meta-language or non-G16 validator debt', async () => {
    const capsules = [
      buildLatestRunCapsule(run, config),
      buildPlanCapsule(run, queue, config),
      buildQueueCapsule(queue),
    ];

    for (const capsule of capsules) {
      const serialized = JSON.stringify(capsule);
      expect(serialized).not.toContain('Dream-branch');
      expect(serialized).not.toContain('Dream-first');
      expect(serialized).not.toContain('on Dream');
      expect(capsule.integrity_sha3_512).toBe('PENDING_A2C_HASH_STAGE');

      const result = await validateCapsule(capsule, { skipG16: true });
      const errorGates = result.errors.map((issue) => issue.gate);
      expect(errorGates).not.toContain('G04');
      expect(errorGates).not.toContain('G07');
      expect(errorGates).not.toContain('G09');
    }
  });
});
