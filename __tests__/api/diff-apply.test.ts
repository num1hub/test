import { describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/diff/apply/route'
import { mergeResultSchema } from '@/contracts/diff'
import { mergeBranches } from '@/lib/diff/merge-engine'

const baseDiff = {
  branchA: 'real',
  branchB: 'dream',
  scope: { scopeType: 'capsule', scopeRootId: 'capsule.test.merge.v1', recursive: false },
  added: [],
  removed: [],
  modified: [],
  linkChanges: [],
  semanticEvents: [],
  metrics: {
    addedCount: 0,
    removedCount: 0,
    modifiedCount: 0,
    unchangedCount: 1,
    addedLinks: 0,
    removedLinks: 0,
    modifiedLinks: 0,
    semanticEventCount: 0,
    estimatedTimeImpactHours: 0,
    estimatedCostImpact: 0,
    durationMs: 9,
    cacheHit: false,
    scopedCapsuleCount: 1,
  },
  actionPlan: [],
  summary: 'No changes detected.',
}

vi.mock('@/lib/diff/merge-engine', () => ({
  mergeBranches: vi.fn(),
}))

describe('API: /api/diff/apply', () => {
  it('returns MergeResult on success', async () => {
    vi.mocked(mergeBranches).mockResolvedValueOnce({
      applied: true,
      dryRun: false,
      sourceBranch: 'dream',
      targetBranch: 'real',
      writtenIds: ['capsule.test.merge.v1'],
      tombstonedIds: [],
      skippedIds: [],
      conflicts: [],
      diff: baseDiff,
    } as never)

    const req = new Request('http://localhost/api/diff/apply', {
      method: 'POST',
      headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
      body: JSON.stringify({
        sourceBranch: 'dream',
        targetBranch: 'real',
        scopeType: 'capsule',
        scopeRootId: 'capsule.test.merge.v1',
        conflictResolution: 'source-wins',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mergeResultSchema.parse(await res.json()).applied).toBe(true)
    expect(mergeBranches).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceBranch: 'dream',
        targetBranch: 'real',
        scopeType: 'capsule',
        scopeRootId: 'capsule.test.merge.v1',
        conflictResolution: 'source-wins',
      }),
    )
  })

  it('returns 409 for manual conflicts', async () => {
    vi.mocked(mergeBranches).mockResolvedValueOnce({
      applied: false,
      dryRun: false,
      sourceBranch: 'dream',
      targetBranch: 'real',
      writtenIds: [],
      tombstonedIds: [],
      skippedIds: ['capsule.test.merge.v1'],
      conflicts: [
        {
          capsuleId: 'capsule.test.merge.v1',
          path: '$.neuro_concentrate.summary',
          conflictType: 'field',
          message: 'Conflicting updates at $.neuro_concentrate.summary',
        },
      ],
      diff: {
        ...baseDiff,
        conflicts: [
          {
            capsuleId: 'capsule.test.merge.v1',
            path: '$.neuro_concentrate.summary',
            conflictType: 'field',
            message: 'Conflicting updates at $.neuro_concentrate.summary',
          },
        ],
      },
    } as never)

    const req = new Request('http://localhost/api/diff/apply', {
      method: 'POST',
      headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
      body: JSON.stringify({
        sourceBranch: 'dream',
        targetBranch: 'real',
        scopeType: 'capsule',
        scopeRootId: 'capsule.test.merge.v1',
        conflictResolution: 'manual',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
    expect(mergeResultSchema.parse(await res.json()).conflicts).toHaveLength(1)
  })

  it('rejects unauthorized merge requests', async () => {
    const req = new Request('http://localhost/api/diff/apply', {
      method: 'POST',
      body: JSON.stringify({
        sourceBranch: 'dream',
        targetBranch: 'real',
        scopeType: 'capsule',
        scopeRootId: 'capsule.test.merge.v1',
        conflictResolution: 'source-wins',
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })
})
