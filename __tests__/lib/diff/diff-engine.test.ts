import { describe, expect, it } from 'vitest';
import { computeIntegrityHash } from '@/lib/validator/utils';
import { diffBranchSnapshots } from '@/lib/diff/diff-engine';
import type { SovereignCapsule } from '@/types/capsule';

function makeCapsule(
  id: string,
  overrides: Partial<SovereignCapsule> = {},
): SovereignCapsule {
  const capsule: SovereignCapsule = {
    metadata: {
      capsule_id: id,
      type: 'concept',
      subtype: 'atomic',
      status: 'active',
      version: '1.0.0',
      created_at: '2026-03-05T00:00:00.000Z',
      updated_at: '2026-03-05T00:00:00.000Z',
      semantic_hash: 'capsule-graph-refactor-safety-topology-proof-core-state',
      ...overrides.metadata,
    },
    core_payload: {
      content_type: 'markdown',
      content: '# Test capsule',
      ...overrides.core_payload,
    },
    neuro_concentrate: {
      summary: 'Summary that is long enough for the validator and useful for diff tests.',
      confidence_vector: {
        extraction: 1,
        synthesis: 1,
        linking: 1,
        provenance_coverage: 1,
        validation_score: 1,
        contradiction_pressure: 0,
      },
      keywords: ['alpha', 'beta', 'gamma'],
      ...overrides.neuro_concentrate,
    },
    recursive_layer: {
      links: [],
      ...overrides.recursive_layer,
    },
    integrity_sha3_512: '',
  };

  capsule.integrity_sha3_512 = computeIntegrityHash(capsule);
  return capsule;
}

describe('lib/diff/diff-engine', () => {
  it('returns an empty diff for identical graphs', () => {
    const graph = [makeCapsule('capsule.test.diff.v1')];
    const result = diffBranchSnapshots(graph, graph, {
      branchA: 'real',
      branchB: 'dream',
      scopeType: 'vault',
      recursive: false,
      cascadeDeletes: false,
      ignorePaths: ['$.metadata.updated_at', '$.integrity_sha3_512'],
      textMode: 'exact',
      recursionDepthCap: 50,
    });

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
    expect(result.linkChanges).toHaveLength(0);
  });

  it('ignores updated_at and compares keywords order-insensitively', () => {
    const before = makeCapsule('capsule.test.diff.updated.v1', {
      metadata: {
        capsule_id: 'capsule.test.diff.updated.v1',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
      neuro_concentrate: { keywords: ['alpha', 'beta', 'gamma'] },
    });
    const after = makeCapsule('capsule.test.diff.updated.v1', {
      metadata: {
        capsule_id: 'capsule.test.diff.updated.v1',
        updated_at: '2026-03-06T00:00:00.000Z',
      },
      neuro_concentrate: { keywords: ['gamma', 'beta', 'alpha'] },
    });

    const result = diffBranchSnapshots([before], [after], {
      branchA: 'real',
      branchB: 'dream',
      scopeType: 'vault',
      recursive: false,
      cascadeDeletes: false,
      ignorePaths: ['$.metadata.updated_at', '$.integrity_sha3_512'],
      textMode: 'exact',
      recursionDepthCap: 50,
    });

    expect(result.modified).toHaveLength(0);
  });

  it('emits add and remove events when a link relation changes', () => {
    const before = makeCapsule('capsule.test.links.v1', {
      recursive_layer: {
        links: [{ target_id: 'capsule.other.v1', relation_type: 'references' }],
      },
    });
    const after = makeCapsule('capsule.test.links.v1', {
      recursive_layer: {
        links: [{ target_id: 'capsule.other.v1', relation_type: 'depends_on' }],
      },
    });

    const result = diffBranchSnapshots([before], [after], {
      branchA: 'real',
      branchB: 'dream',
      scopeType: 'vault',
      recursive: false,
      cascadeDeletes: false,
      ignorePaths: ['$.metadata.updated_at', '$.integrity_sha3_512'],
      textMode: 'exact',
      recursionDepthCap: 50,
    });

    expect(result.linkChanges).toHaveLength(2);
    expect(result.linkChanges.map((change) => change.change).sort()).toEqual(['added', 'removed']);
  });
});
