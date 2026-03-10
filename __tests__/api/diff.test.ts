import { describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/diff/route'
import { diffResultSchema } from '@/contracts/diff'
import { computeDiff } from '@/lib/diff/diff-engine'

const diffResult = {
  branchA: 'real',
  branchB: 'dream',
  scope: {
    scopeType: 'capsule',
    scopeRootId: 'capsule.test.diff.v1',
    recursive: false,
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
    unchangedCount: 1,
    addedLinks: 0,
    removedLinks: 0,
    modifiedLinks: 0,
    semanticEventCount: 0,
    estimatedTimeImpactHours: 0,
    estimatedCostImpact: 0,
    durationMs: 12,
    cacheHit: false,
    scopedCapsuleCount: 1,
  },
  actionPlan: [],
  summary: 'No changes detected.',
}

vi.mock('@/lib/diff/diff-engine', () => ({
  computeDiff: vi.fn(async () => diffResult),
}))

describe('API: /api/diff', () => {
  it('returns a structured DiffResult', async () => {
    const req = new Request('http://localhost/api/diff', {
      method: 'POST',
      headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
      body: JSON.stringify({
        branchA: 'real',
        branchB: 'dream',
        scopeType: 'capsule',
        scopeRootId: 'capsule.test.diff.v1',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(diffResultSchema.parse(await res.json()).branchB).toBe('dream')
    expect(computeDiff).toHaveBeenCalledWith(
      'real',
      'dream',
      expect.objectContaining({ scopeRootId: 'capsule.test.diff.v1' }),
    )
  })

  it('rejects unauthorized diff requests', async () => {
    const req = new Request('http://localhost/api/diff', {
      method: 'POST',
      body: JSON.stringify({
        branchA: 'real',
        branchB: 'dream',
        scopeType: 'capsule',
        scopeRootId: 'capsule.test.diff.v1',
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('rejects invalid diff requests before computeDiff runs', async () => {
    const req = new Request('http://localhost/api/diff', {
      method: 'POST',
      headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
      body: JSON.stringify({
        branchA: 'INVALID BRANCH',
        branchB: 'dream',
        scopeType: 'capsule',
        scopeRootId: 'capsule.test.diff.v1',
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(computeDiff).not.toHaveBeenCalled()
  })
})
