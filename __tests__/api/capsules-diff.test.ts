import { describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/capsules/[id]/diff/route'
import { diffResultSchema } from '@/contracts/diff'
import { computeDiff } from '@/lib/diff/diff-engine'
import { createAuthToken } from '@/__tests__/helpers/auth'

const diffResult = {
  branchA: 'real',
  branchB: 'dream',
  scope: {
    scopeType: 'capsule',
    scopeRootId: 'capsule.test.diff.v1',
    recursive: true,
  },
  added: [],
  removed: [],
  modified: [],
  linkChanges: [],
  semanticEvents: [],
  metrics: {
    addedCount: 0,
    removedCount: 0,
    modifiedCount: 0,
    unchangedCount: 2,
    addedLinks: 0,
    removedLinks: 0,
    modifiedLinks: 0,
    semanticEventCount: 0,
    estimatedTimeImpactHours: 0,
    estimatedCostImpact: 0,
    durationMs: 7,
    cacheHit: false,
    scopedCapsuleCount: 2,
  },
  actionPlan: [],
  summary: 'No changes detected.',
}

vi.mock('@/lib/diff/diff-engine', () => ({
  computeDiff: vi.fn(async () => diffResult),
}))

describe('API: /api/capsules/[id]/diff', () => {
  it('returns capsule-scoped diffs', async () => {
    const req = new Request(
      'http://localhost/api/capsules/capsule.test.diff.v1/diff?branchA=real&branchB=dream&recursive=true',
      {
        headers: { Authorization: `Bearer ${createAuthToken()}` },
      },
    )

    const res = await GET(req, {
      params: Promise.resolve({ id: 'capsule.test.diff.v1' }),
    })

    expect(res.status).toBe(200)
    expect(diffResultSchema.parse(await res.json()).scope.recursive).toBe(true)
    expect(computeDiff).toHaveBeenCalledWith(
      'real',
      'dream',
      expect.objectContaining({
        scopeType: 'capsule',
        scopeRootId: 'capsule.test.diff.v1',
        recursive: true,
      }),
    )
  })

  it('rejects unauthorized capsule diff requests', async () => {
    const req = new Request(
      'http://localhost/api/capsules/capsule.test.diff.v1/diff?branchA=real&branchB=dream',
    )

    const res = await GET(req, {
      params: Promise.resolve({ id: 'capsule.test.diff.v1' }),
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('rejects invalid branch names for capsule diffs', async () => {
    const req = new Request(
      'http://localhost/api/capsules/capsule.test.diff.v1/diff?branchA=INVALID BRANCH&branchB=dream',
      {
        headers: { Authorization: `Bearer ${createAuthToken()}` },
      },
    )

    const res = await GET(req, {
      params: Promise.resolve({ id: 'capsule.test.diff.v1' }),
    })

    expect(res.status).toBe(400)
    expect(computeDiff).not.toHaveBeenCalled()
  })
})
