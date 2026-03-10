// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getLocalCodexAvailabilityMock,
  runLocalCodexStructuredTaskMock,
} = vi.hoisted(() => ({
  getLocalCodexAvailabilityMock: vi.fn(),
  runLocalCodexStructuredTaskMock: vi.fn(),
}));

vi.mock('@/lib/agents/localCodex', () => ({
  getLocalCodexAvailability: getLocalCodexAvailabilityMock,
  runLocalCodexStructuredTask: runLocalCodexStructuredTaskMock,
}));

import { runVaultStewardCodexForeman } from '@/lib/agents/vaultSteward';

describe('runVaultStewardCodexForeman', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips cleanly when the local codex lane is unavailable', async () => {
    getLocalCodexAvailabilityMock.mockResolvedValue({
      available: false,
      reason: 'local codex unavailable',
    });

    const result = await runVaultStewardCodexForeman(
      {
        total_capsules: 1,
        orphaned_capsules: 0,
        by_type: { foundation: 1 },
        inventory: [],
        candidates: [],
      },
      {
        normalized: {
          overview: 'Fallback overview',
          workstream: 'mixed',
          observations: [],
          suggested_actions: [],
          targets: [
            {
              capsule_id: 'capsule.foundation.workspace.v1',
              reason: 'hub pressure',
              priority: 'high',
            },
          ],
          proposed_jobs: [],
        },
        provider: 'github_models',
        model: 'openai/gpt-4.1',
        rawText: null,
        reason: 'used_fallback_analysis',
        lane: {
          id: 'scout',
          label: 'Scout',
          engine: 'provider',
          status: 'failed',
          provider: 'github_models',
          model: 'openai/gpt-4.1',
          summary: 'Fallback',
          error: 'not json',
        },
      },
      {
        version: 1,
        updated_at: new Date().toISOString(),
        jobs: [],
      },
    );

    expect(result.available).toBe(false);
    expect(result.lane.status).toBe('skipped');
    expect(result.lane.error).toBe('local codex unavailable');
  });

  it('returns a completed foreman lane when structured review succeeds', async () => {
    getLocalCodexAvailabilityMock.mockResolvedValue({
      available: true,
      reason: null,
    });
    runLocalCodexStructuredTaskMock.mockResolvedValue({
      data: {
        overview: 'Foreman overview',
        workstream: 'mixed',
        observations: ['obs'],
        suggested_actions: ['action'],
        targets: [],
        proposed_jobs: [],
        supervisor_summary: 'Foreman summary',
      },
      text: '{"supervisor_summary":"Foreman summary"}',
      model: 'gpt-5.3-codex',
    });

    const result = await runVaultStewardCodexForeman(
      {
        total_capsules: 1,
        orphaned_capsules: 0,
        by_type: { foundation: 1 },
        inventory: [],
        candidates: [],
      },
      {
        normalized: {
          overview: 'Fallback overview',
          workstream: 'mixed',
          observations: [],
          suggested_actions: [],
          targets: [
            {
              capsule_id: 'capsule.foundation.workspace.v1',
              reason: 'hub pressure',
              priority: 'high',
            },
          ],
          proposed_jobs: [],
        },
        provider: 'github_models',
        model: 'openai/gpt-4.1',
        rawText: null,
        reason: 'used_fallback_analysis',
        lane: {
          id: 'scout',
          label: 'Scout',
          engine: 'provider',
          status: 'failed',
          provider: 'github_models',
          model: 'openai/gpt-4.1',
          summary: 'Fallback',
          error: 'not json',
        },
      },
      {
        version: 1,
        updated_at: new Date().toISOString(),
        jobs: [],
      },
    );

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.output.supervisor_summary).toBe('Foreman summary');
      expect(result.lane.status).toBe('completed');
      expect(result.lane.model).toBe('gpt-5.3-codex');
    }
  });
});
