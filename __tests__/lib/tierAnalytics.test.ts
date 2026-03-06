import { describe, expect, it } from 'vitest';
import type { DiffResult } from '@/contracts/diff';
import { buildDiffTierInsights, countCapsulesByTier } from '@/lib/tierAnalytics';
import type { SovereignCapsule } from '@/types/capsule';

function makeCapsule(id: string, tier?: 1 | 2 | 3 | 4): SovereignCapsule {
  return {
    metadata: {
      capsule_id: id,
      type: 'concept',
      subtype: 'atomic',
      status: 'active',
      tier,
    },
    core_payload: {
      content_type: 'markdown',
      content: '# test',
    },
    neuro_concentrate: {
      summary: `${id} summary`,
      keywords: ['alpha'],
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
    integrity_sha3_512: 'hash',
  };
}

function makeDiff(overrides: Partial<DiffResult> = {}): DiffResult {
  return {
    branchA: 'real',
    branchB: 'dream',
    scope: { scopeType: 'vault' },
    added: [],
    removed: [],
    modified: [],
    linkChanges: [],
    semanticEvents: [],
    metrics: {
      addedCount: 0,
      removedCount: 0,
      modifiedCount: 0,
      unchangedCount: 0,
      addedLinks: 0,
      removedLinks: 0,
      modifiedLinks: 0,
      semanticEventCount: 0,
      estimatedTimeImpactHours: 0,
      estimatedCostImpact: 0,
      durationMs: 1,
      cacheHit: false,
      scopedCapsuleCount: 0,
    },
    actionPlan: [],
    ...overrides,
  };
}

describe('lib/tierAnalytics', () => {
  it('counts capsules by tier and ignores missing tier metadata', () => {
    const counts = countCapsulesByTier([
      makeCapsule('capsule.alpha.v1', 1),
      makeCapsule('capsule.beta.v1', 2),
      makeCapsule('capsule.gamma.v1'),
      makeCapsule('capsule.delta.v1', 2),
    ]);

    expect(counts).toEqual({ 1: 1, 2: 2, 3: 0, 4: 0 });
  });

  it('builds tier transition insights from structured diff data', () => {
    const diff = makeDiff({
      added: [makeCapsule('capsule.added.v1', 4)],
      modified: [
        {
          id: 'capsule.raise.v1',
          capsuleType: 'concept',
          summary: 'Raised to a more critical tier',
          before: makeCapsule('capsule.raise.v1', 3),
          after: makeCapsule('capsule.raise.v1', 1),
          changes: [
            {
              path: '$.metadata.tier',
              oldValue: 3,
              newValue: 1,
              changeType: 'modified',
            },
          ],
          semanticEvents: [],
        },
        {
          id: 'capsule.defer.v1',
          capsuleType: 'foundation',
          summary: 'Deferred to a less critical tier',
          before: makeCapsule('capsule.defer.v1', 2),
          after: makeCapsule('capsule.defer.v1', 4),
          changes: [
            {
              path: '$.metadata.tier',
              oldValue: 2,
              newValue: 4,
              changeType: 'modified',
            },
          ],
          semanticEvents: [],
        },
        {
          id: 'capsule.same-tier.v1',
          capsuleType: 'operations',
          summary: 'Changed without tier movement',
          before: makeCapsule('capsule.same-tier.v1', 2),
          after: makeCapsule('capsule.same-tier.v1', 2),
          changes: [
            {
              path: '$.metadata.priority',
              oldValue: 'medium',
              newValue: 'high',
              changeType: 'modified',
            },
          ],
          semanticEvents: [],
        },
      ],
    });

    const insights = buildDiffTierInsights(diff);

    expect(insights.addedCounts).toEqual({ 1: 0, 2: 0, 3: 0, 4: 1 });
    expect(insights.changedSurfaceCounts).toEqual({ 1: 1, 2: 1, 3: 0, 4: 1 });
    expect(insights.incomingCounts).toEqual({ 1: 1, 2: 0, 3: 0, 4: 1 });
    expect(insights.outgoingCounts).toEqual({ 1: 0, 2: 1, 3: 1, 4: 0 });
    expect(insights.elevatedCount).toBe(1);
    expect(insights.deferredCount).toBe(1);
    expect(insights.assignedCount).toBe(0);
    expect(insights.clearedCount).toBe(0);
    expect(insights.transitions.map((transition) => transition.capsuleId)).toEqual([
      'capsule.raise.v1',
      'capsule.defer.v1',
    ]);
  });
});
