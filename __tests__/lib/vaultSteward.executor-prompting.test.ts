// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildVaultStewardExecutorPrompt } from '@/lib/agents/vaultSteward';
import { computeIntegrityHash } from '@/lib/validator/utils';
import type { SovereignCapsule } from '@/types/capsule';

function makeCapsule(
  capsuleId: string,
  overrides: Partial<SovereignCapsule> = {},
): SovereignCapsule {
  const base: SovereignCapsule = {
    metadata: {
      capsule_id: capsuleId,
      type: 'foundation',
      subtype: 'atomic',
      status: 'sovereign',
      name: capsuleId,
      progress: 80,
    },
    core_payload: {
      content_type: 'markdown',
      content: `# ${capsuleId}`,
    },
    neuro_concentrate: {
      summary: 'Short summary',
      keywords: ['one', 'two'],
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

  const merged: SovereignCapsule = {
    ...base,
    ...overrides,
    metadata: {
      ...base.metadata,
      ...(overrides.metadata ?? {}),
    },
    core_payload: {
      ...base.core_payload,
      ...(overrides.core_payload ?? {}),
    },
    neuro_concentrate: {
      ...base.neuro_concentrate,
      ...(overrides.neuro_concentrate ?? {}),
    },
    recursive_layer: {
      ...base.recursive_layer,
      ...(overrides.recursive_layer ?? {}),
    },
    integrity_sha3_512: '',
  };

  merged.integrity_sha3_512 = computeIntegrityHash(merged);
  return merged;
}

describe('vaultSteward executor prompting seam', () => {
  it('builds an executor prompt with workstream guidance and target capsule body', () => {
    const capsule = makeCapsule('capsule.foundation.workspace.v1', {
      metadata: {
        capsule_id: 'capsule.foundation.workspace.v1',
        name: 'Workspace',
        progress: 55,
      },
      core_payload: {
        content_type: 'markdown',
        content: '# Workspace\n\nBounded maintenance target.',
      },
      neuro_concentrate: {
        summary: 'Workspace summary',
        keywords: ['workspace', 'maintenance'],
      },
    });

    const result = buildVaultStewardExecutorPrompt(
      {
        id: 'job-1',
        label: 'Refine workspace',
        goal: 'Improve summary clarity',
        workstream: 'markup',
        capsule_ids: [capsule.metadata.capsule_id],
        suggested_branch: 'dream',
        needs_human_confirmation: false,
        created_at: '2026-03-10T01:00:00.000Z',
        source_run_id: 'run-1',
        status: 'queued',
      },
      [capsule],
    );

    expect(result.system).toContain('Capsule Markup Executor');
    expect(result.prompt).toContain('Workstream guidance:');
    expect(result.prompt).toContain('Workspace summary');
    expect(result.prompt).toContain('Bounded maintenance target.');
  });
});
