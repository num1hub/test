import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildFallbackJobsFromTargets,
  filterNewJobsAgainstQueue,
  selectExecutorJobsForRun,
  type VaultStewardJob,
  type VaultStewardQueue,
} from '@/lib/agents/vaultSteward';

function makeJob(overrides: Partial<VaultStewardJob> = {}): VaultStewardJob {
  return {
    id: 'job-default',
    label: 'Default job',
    goal: 'Default goal',
    workstream: 'mixed',
    capsule_ids: ['capsule.default.v1'],
    suggested_branch: 'dream',
    needs_human_confirmation: false,
    created_at: '2026-03-10T00:00:00.000Z',
    source_run_id: 'run-default',
    status: 'queued',
    ...overrides,
  };
}

function makeQueue(jobs: VaultStewardJob[]): VaultStewardQueue {
  return {
    version: 1 as const,
    updated_at: '2026-03-10T00:00:00.000Z',
    jobs,
  };
}

describe('Vault Steward job planning public contracts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects queued dream jobs in workstream breadth order before filling remaining slots', () => {
    const selected = selectExecutorJobsForRun(
      makeQueue([
        makeJob({ id: 'mixed-job', workstream: 'mixed', created_at: '2026-03-10T03:00:00.000Z' }),
        makeJob({ id: 'markup-job', workstream: 'markup', created_at: '2026-03-10T02:00:00.000Z' }),
        makeJob({ id: 'graph-job', workstream: 'graph_refactor', created_at: '2026-03-10T04:00:00.000Z' }),
        makeJob({ id: 'decomp-job', workstream: 'decomposition', created_at: '2026-03-10T01:00:00.000Z' }),
        makeJob({ id: 'accepted-job', status: 'accepted', workstream: 'graph_refactor' }),
        makeJob({ id: 'real-job', suggested_branch: 'real', workstream: 'graph_refactor' }),
      ]),
      3,
    );

    expect(selected.map((job) => job.id)).toEqual([
      'graph-job',
      'markup-job',
      'decomp-job',
    ]);
  });

  it('seeds fallback jobs with the next unfinished workstream and skips pending duplicates', () => {
    const seeded = buildFallbackJobsFromTargets(
      [
        {
          capsule_id: 'capsule.alpha.v1',
          reason: 'summary is short enough to justify markup or enrichment',
          priority: 'medium',
        },
        {
          capsule_id: 'capsule.beta.v1',
          reason: 'capsule looks weakly connected in the current graph',
          priority: 'medium',
        },
      ],
      'run-123',
      makeQueue([
        makeJob({
          id: 'completed-markup',
          workstream: 'markup',
          capsule_ids: ['capsule.alpha.v1'],
          status: 'completed',
          created_at: '2026-03-09T00:00:00.000Z',
        }),
        makeJob({
          id: 'queued-graph',
          workstream: 'graph_refactor',
          capsule_ids: ['capsule.beta.v1'],
        }),
      ]),
      'mixed',
      5,
    );

    expect(seeded).toHaveLength(1);
    expect(seeded[0]?.capsule_ids).toEqual(['capsule.alpha.v1']);
    expect(seeded[0]?.workstream).toBe('graph_refactor');
  });

  it('skips queued and recent completed duplicates but allows stale completed duplicates back in', () => {
    const result = filterNewJobsAgainstQueue(
      [
        makeJob({ id: 'candidate-queued', workstream: 'mixed', capsule_ids: ['capsule.a.v1'] }),
        makeJob({ id: 'candidate-recent', workstream: 'markup', capsule_ids: ['capsule.b.v1'] }),
        makeJob({ id: 'candidate-stale', workstream: 'decomposition', capsule_ids: ['capsule.c.v1'] }),
      ],
      makeQueue([
        makeJob({ id: 'existing-queued', workstream: 'mixed', capsule_ids: ['capsule.a.v1'] }),
        makeJob({
          id: 'existing-recent',
          workstream: 'markup',
          capsule_ids: ['capsule.b.v1'],
          status: 'completed',
          created_at: '2026-03-10T11:30:00.000Z',
        }),
        makeJob({
          id: 'existing-stale',
          workstream: 'decomposition',
          capsule_ids: ['capsule.c.v1'],
          status: 'completed',
          created_at: '2025-03-10T11:30:00.000Z',
        }),
      ]),
    );

    expect(result.jobs.map((job) => job.id)).toEqual(['candidate-stale']);
    expect(result.skipped.map((job) => job.id)).toEqual([
      'candidate-queued',
      'candidate-recent',
    ]);
  });
});
