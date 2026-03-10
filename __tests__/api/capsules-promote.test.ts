import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/capsules/[id]/promote/route'
import { branchExists } from '@/lib/branching'
import { dematerializeOverlayCapsule, readOverlayCapsule } from '@/lib/diff/branch-manager'
import { mergeBranches } from '@/lib/diff/merge-engine'

const promotedCapsule = {
  metadata: {
    capsule_id: 'capsule.test.promote.v1',
    type: 'concept',
    subtype: 'atomic',
    status: 'active',
    version: '1.0.0',
    created_at: '2026-03-10T00:00:00.000Z',
    updated_at: '2026-03-10T00:00:00.000Z',
    name: 'Promotion Test Capsule',
    semantic_hash: 'promotion-test-capsule-semantic-hash-proof',
  },
  core_payload: {
    content_type: 'markdown',
    content: '# Promotion test capsule',
  },
  neuro_concentrate: {
    summary: 'Promotion route test capsule summary long enough for validator-like expectations.',
    confidence_vector: {
      extraction: 0.99,
      synthesis: 0.98,
      linking: 0.97,
      provenance_coverage: 1,
      validation_score: 1,
      contradiction_pressure: 0.02,
    },
    keywords: ['promotion', 'route', 'dream', 'real'],
    semantic_hash: 'promotion-test-capsule-semantic-hash-proof',
  },
  recursive_layer: {
    links: [],
  },
  integrity_sha3_512: 'promotion-test-integrity-hash-proof',
}

vi.mock('@/lib/branching', () => ({
  branchExists: vi.fn(),
}))

vi.mock('@/lib/diff/branch-manager', () => ({
  dematerializeOverlayCapsule: vi.fn(),
  readOverlayCapsule: vi.fn(),
}))

vi.mock('@/lib/diff/merge-engine', () => ({
  mergeBranches: vi.fn(),
}))

describe('API: /api/capsules/[id]/promote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(branchExists).mockResolvedValue(true as never)
    vi.mocked(readOverlayCapsule).mockResolvedValue(promotedCapsule as never)
    vi.mocked(dematerializeOverlayCapsule).mockResolvedValue(undefined as never)
    vi.mocked(mergeBranches).mockResolvedValue({
      applied: true,
      dryRun: false,
      sourceBranch: 'dream',
      targetBranch: 'real',
      writtenIds: ['capsule.test.promote.v1'],
      tombstonedIds: [],
      skippedIds: [],
      conflicts: [],
      diff: null,
    } as never)
  })

  it('promotes a dream capsule into real and dematerializes the overlay', async () => {
    const req = new Request('http://localhost/api/capsules/capsule.test.promote.v1/promote', {
      method: 'POST',
      headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
    })

    const res = await POST(req, {
      params: Promise.resolve({ id: 'capsule.test.promote.v1' }),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(promotedCapsule)
    expect(mergeBranches).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceBranch: 'dream',
        targetBranch: 'real',
        scopeType: 'capsule',
        scopeRootId: 'capsule.test.promote.v1',
        conflictResolution: 'source-wins',
      }),
    )
    expect(dematerializeOverlayCapsule).toHaveBeenCalledWith('capsule.test.promote.v1', 'dream', {
      removeFromManifest: true,
    })
  })

  it('rejects unauthorized promotion requests', async () => {
    const req = new Request('http://localhost/api/capsules/capsule.test.promote.v1/promote', {
      method: 'POST',
    })

    const res = await POST(req, {
      params: Promise.resolve({ id: 'capsule.test.promote.v1' }),
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 404 when the dream branch overlay is missing', async () => {
    vi.mocked(branchExists).mockResolvedValueOnce(false as never)

    const req = new Request('http://localhost/api/capsules/capsule.test.promote.v1/promote', {
      method: 'POST',
      headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
    })

    const res = await POST(req, {
      params: Promise.resolve({ id: 'capsule.test.promote.v1' }),
    })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Dream branch does not exist.' })
  })

  it('returns 409 when merge conflicts prevent promotion', async () => {
    vi.mocked(mergeBranches).mockResolvedValueOnce({
      applied: false,
      dryRun: false,
      sourceBranch: 'dream',
      targetBranch: 'real',
      writtenIds: [],
      tombstonedIds: [],
      skippedIds: ['capsule.test.promote.v1'],
      conflicts: [
        {
          capsuleId: 'capsule.test.promote.v1',
          path: '$.core_payload.content',
          conflictType: 'field',
          message: 'Conflicting updates at $.core_payload.content',
        },
      ],
      diff: null,
    } as never)

    const req = new Request('http://localhost/api/capsules/capsule.test.promote.v1/promote', {
      method: 'POST',
      headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
    })

    const res = await POST(req, {
      params: Promise.resolve({ id: 'capsule.test.promote.v1' }),
    })

    expect(res.status).toBe(409)
    const payload = await res.json()
    expect(payload.applied).toBe(false)
    expect(payload.conflicts).toHaveLength(1)
  })
})
