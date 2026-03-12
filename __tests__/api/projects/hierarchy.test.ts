import { describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/projects/[id]/hierarchy/route'
import { createAuthToken } from '@/__tests__/helpers/auth'

vi.mock('@/lib/diff/branch-manager', () => ({
  loadOverlayGraph: vi.fn(async () => [
    {
      metadata: { capsule_id: 'capsule.project.root.v1', type: 'project', subtype: 'hub' },
      recursive_layer: { links: [] },
    },
    {
      metadata: { capsule_id: 'capsule.project.child.v1', type: 'project', subtype: 'hub' },
      recursive_layer: {
        links: [{ target_id: 'capsule.project.root.v1', relation_type: 'part_of' }],
      },
    },
  ]),
}))

describe('API: /api/projects/[id]/hierarchy', () => {
  it('returns hierarchy for a project root', async () => {
    const req = new Request('http://localhost/api/projects/capsule.project.root.v1/hierarchy', {
      headers: { Authorization: `Bearer ${createAuthToken()}` },
    })

    const res = await GET(req as never, {
      params: Promise.resolve({ id: 'capsule.project.root.v1' }),
    })

    expect(res.status).toBe(200)
    const payload = (await res.json()) as {
      metadata: { capsule_id: string }
      children: Array<{ metadata: { capsule_id: string } }>
    }

    expect(payload.metadata.capsule_id).toBe('capsule.project.root.v1')
    expect(payload.children).toHaveLength(1)
    expect(payload.children[0].metadata.capsule_id).toBe('capsule.project.child.v1')
  })

  it('returns 404 when project is missing', async () => {
    const req = new Request('http://localhost/api/projects/missing/hierarchy', {
      headers: { Authorization: `Bearer ${createAuthToken()}` },
    })

    const res = await GET(req as never, {
      params: Promise.resolve({ id: 'capsule.project.missing.v1' }),
    })

    expect(res.status).toBe(404)
  })
})
