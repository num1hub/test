// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateTextWithAiProviderMock } = vi.hoisted(() => ({
  generateTextWithAiProviderMock: vi.fn(),
}));

vi.mock('@/lib/ai/providerRuntime', () => ({
  generateTextWithAiProvider: generateTextWithAiProviderMock,
}));

import { runVaultStewardProviderScoutOnce } from '@/lib/agents/vaultSteward';

describe('runVaultStewardProviderScoutOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a structured provider scout plan when the provider emits valid JSON', async () => {
    generateTextWithAiProviderMock.mockResolvedValue({
      provider: 'github_models',
      model: 'openai/gpt-4.1',
      text: JSON.stringify({
        overview: 'Scout overview',
        workstream: 'mixed',
        observations: ['obs'],
        suggested_actions: ['action'],
        targets: [
          {
            capsule_id: 'capsule.foundation.workspace.v1',
            reason: 'hub pressure',
            priority: 'high',
          },
        ],
        proposed_jobs: [],
      }),
    });

    const result = await runVaultStewardProviderScoutOnce(
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
        total_capsules: 1,
        orphaned_capsules: 0,
        by_type: { foundation: 1 },
        inventory: [],
        candidates: [],
      },
      {
        version: 1,
        updated_at: '2026-03-10T00:00:00.000Z',
        jobs: [],
      },
    );

    expect(result.reason).toBe('provider_success');
    expect(result.lane.status).toBe('completed');
    expect(result.normalized.overview).toBe('Scout overview');
  });

  it('falls back to graph-derived analysis when provider planning fails', async () => {
    generateTextWithAiProviderMock.mockRejectedValue(new Error('provider offline'));

    const result = await runVaultStewardProviderScoutOnce(
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
        total_capsules: 1,
        orphaned_capsules: 1,
        by_type: { foundation: 1 },
        inventory: [
          {
            capsule_id: 'capsule.foundation.workspace.v1',
            type: 'foundation',
            subtype: 'hub',
            status: 'active',
            progress: 20,
            outbound_links: 12,
            inbound_links: 0,
            summary_length: 5,
            keyword_count: 1,
          },
        ],
        candidates: [
          {
            capsule_id: 'capsule.foundation.workspace.v1',
            name: 'Workspace',
            type: 'foundation',
            subtype: 'hub',
            status: 'active',
            progress: 20,
            outbound_links: 12,
            inbound_links: 0,
            summary_length: 5,
            keyword_count: 1,
            reasons: ['hub pressure'],
          },
        ],
      },
      {
        version: 1,
        updated_at: '2026-03-10T00:00:00.000Z',
        jobs: [],
      },
    );

    expect(result.reason).toBe('used_fallback_analysis');
    expect(result.lane.status).toBe('failed');
    expect(result.normalized.targets[0]?.capsule_id).toBe('capsule.foundation.workspace.v1');
  });
});
