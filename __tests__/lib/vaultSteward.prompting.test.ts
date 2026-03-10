// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildVaultStewardCodexSupervisorPrompt } from '@/lib/agents/vaultSteward';

describe('vaultSteward prompting seam', () => {
  it('builds a codex supervisor prompt with queue and candidate context', () => {
    const summary = {
      total_capsules: 2,
      orphaned_capsules: 1,
      by_type: { foundation: 2 },
      inventory: [],
      candidates: [
        {
          capsule_id: 'capsule.foundation.workspace.v1',
          name: 'Workspace',
          type: 'foundation',
          subtype: 'hub',
          status: 'sovereign',
          progress: 42,
          outbound_links: 12,
          inbound_links: 4,
          summary_length: 20,
          keyword_count: 2,
          reasons: ['hub pressure'],
        },
      ],
    };
    const scout = {
      normalized: {
        overview: 'Scout overview',
        workstream: 'mixed' as const,
        observations: ['obs one'],
        suggested_actions: ['action one'],
        targets: [
          {
            capsule_id: 'capsule.foundation.workspace.v1',
            reason: 'hub pressure',
            priority: 'high' as const,
          },
        ],
        proposed_jobs: [
          {
            label: 'Decompose workspace',
            goal: 'Reduce hub pressure',
            workstream: 'decomposition' as const,
            capsule_ids: ['capsule.foundation.workspace.v1'],
            suggested_branch: 'dream' as const,
            needs_human_confirmation: true,
          },
        ],
      },
    };
    const queue = {
      version: 1 as const,
      updated_at: new Date().toISOString(),
      jobs: [
        {
          id: 'job-1',
          label: 'Queued workspace pass',
          goal: 'Sharpen boundary',
          workstream: 'decomposition' as const,
          capsule_ids: ['capsule.foundation.workspace.v1'],
          suggested_branch: 'dream' as const,
          needs_human_confirmation: true,
          created_at: '2026-03-10T01:00:00.000Z',
          source_run_id: 'run-1',
          status: 'queued' as const,
        },
      ],
    };

    const prompt = buildVaultStewardCodexSupervisorPrompt(summary, scout, queue);

    expect(prompt).toContain('Codex Foreman');
    expect(prompt).toContain('Queued/accepted jobs: 1');
    expect(prompt).toContain('capsule.foundation.workspace.v1');
    expect(prompt).toContain('Decompose workspace');
  });
});
