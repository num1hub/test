// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  runLocalCodexStructuredTaskMock,
  generateTextWithAiProviderMock,
  readOverlayCapsuleMock,
  writeOverlayCapsuleMock,
} = vi.hoisted(() => ({
  runLocalCodexStructuredTaskMock: vi.fn(),
  generateTextWithAiProviderMock: vi.fn(),
  readOverlayCapsuleMock: vi.fn(),
  writeOverlayCapsuleMock: vi.fn(),
}));

vi.mock('@/lib/agents/localCodex', () => ({
  runLocalCodexStructuredTask: runLocalCodexStructuredTaskMock,
}));

vi.mock('@/lib/ai/providerRuntime', () => ({
  generateTextWithAiProvider: generateTextWithAiProviderMock,
}));

vi.mock('@/lib/diff/branch-manager', () => ({
  readOverlayCapsule: readOverlayCapsuleMock,
  writeOverlayCapsule: writeOverlayCapsuleMock,
}));

import { runVaultStewardExecutorLane } from '@/lib/agents/vaultSteward';
import { computeIntegrityHash } from '@/lib/validator/utils';
import type { SovereignCapsule } from '@/types/capsule';

function makeCapsule(capsuleId: string): SovereignCapsule {
  const capsule: SovereignCapsule = {
    metadata: {
      capsule_id: capsuleId,
      type: 'foundation',
      subtype: 'atomic',
      status: 'active',
      name: capsuleId,
      progress: 60,
    },
    core_payload: {
      content_type: 'markdown',
      content: `# ${capsuleId}`,
    },
    neuro_concentrate: {
      summary: 'Short summary',
      keywords: ['one'],
      confidence_vector: {
        extraction: 1,
        synthesis: 1,
        linking: 1,
        provenance_coverage: 1,
        validation_score: 1,
        contradiction_pressure: 0,
      },
    },
    recursive_layer: {
      links: [],
    },
    integrity_sha3_512: '',
  };
  capsule.integrity_sha3_512 = computeIntegrityHash(capsule);
  return capsule;
}

describe('runVaultStewardExecutorLane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips cleanly when there are no queued Dream jobs', async () => {
    const result = await runVaultStewardExecutorLane(
      {
        version: 1,
        enabled: true,
        provider: null,
        model: null,
        mode: 'nightly',
        interval_minutes: 30,
        night_start_hour: 1,
        night_end_hour: 6,
        timezone: null,
        max_targets_per_run: 6,
        updated_at: '2026-03-10T00:00:00.000Z',
      },
      {
        version: 1,
        updated_at: '2026-03-10T00:00:00.000Z',
        jobs: [],
      },
      'run-1',
    );

    expect(result.executedJobs).toEqual([]);
    expect(result.lane.status).toBe('skipped');
  });

  it('completes a queued Dream job and marks it completed in the returned queue', async () => {
    readOverlayCapsuleMock.mockResolvedValue(makeCapsule('capsule.foundation.workspace.v1'));
    generateTextWithAiProviderMock.mockResolvedValue({
      provider: 'github_models',
      text: JSON.stringify({
        updates: [
          {
            capsule_id: 'capsule.foundation.workspace.v1',
            updated_summary: 'Updated summary',
            added_keywords: ['workspace'],
            maintenance_note: 'Tightened summary',
            rationale: 'Bounded executor pass',
          },
        ],
      }),
    });

    const result = await runVaultStewardExecutorLane(
      {
        version: 1,
        enabled: true,
        provider: null,
        model: null,
        mode: 'nightly',
        interval_minutes: 30,
        night_start_hour: 1,
        night_end_hour: 6,
        timezone: null,
        max_targets_per_run: 6,
        updated_at: '2026-03-10T00:00:00.000Z',
      },
      {
        version: 1,
        updated_at: '2026-03-10T00:00:00.000Z',
        jobs: [
          {
            id: 'job-1',
            label: 'Refine workspace',
            goal: 'Improve summary',
            workstream: 'markup',
            capsule_ids: ['capsule.foundation.workspace.v1'],
            suggested_branch: 'dream',
            needs_human_confirmation: false,
            created_at: '2026-03-10T00:00:00.000Z',
            source_run_id: 'source-1',
            status: 'queued',
          },
        ],
      },
      'run-1',
    );

    expect(result.executedJobs).toHaveLength(1);
    expect(result.lane.status).toBe('completed');
    expect(result.nextQueue.jobs[0]?.status).toBe('completed');
    expect(writeOverlayCapsuleMock).toHaveBeenCalledTimes(1);
    expect(runLocalCodexStructuredTaskMock).not.toHaveBeenCalled();
  });
});
