import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { GET, POST } from '@/app/api/branches/route'
import { createAuthToken } from '@/__tests__/helpers/auth'
import { branchInfoSchema, branchManifestSchema } from '@/contracts/diff'
import {
  createBranch,
  getBranchInfo,
  listBranchCapsuleIds,
  listBranches,
  readBranchManifest,
} from '@/lib/diff/branch-manager'

const dreamManifest = {
  name: 'dream',
  sourceBranch: 'real',
  sourceProjectId: null,
  capsuleIds: ['capsule.project.alpha.v1'],
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
}

vi.mock('@/lib/diff/branch-manager', () => ({
  createBranch: vi.fn(),
  getBranchInfo: vi.fn(),
  listBranchCapsuleIds: vi.fn(),
  listBranches: vi.fn(),
  loadOverlayGraph: vi.fn(async () => []),
  readBranchManifest: vi.fn(),
}))

describe('API: /api/branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listBranches).mockResolvedValue([dreamManifest] as never)
    vi.mocked(listBranchCapsuleIds).mockResolvedValue(['capsule.project.alpha.v1'] as never)
    vi.mocked(getBranchInfo).mockImplementation(async (branch: string) => {
      if (branch === 'real') {
        return {
          manifest: null,
          materialized: 0,
          tombstoned: 0,
          isDefault: true,
        } as never
      }

      return {
        manifest: dreamManifest,
        materialized: 1,
        tombstoned: 0,
        isDefault: false,
      } as never
    })
    vi.mocked(readBranchManifest).mockResolvedValue(null)
    vi.mocked(createBranch).mockResolvedValue(dreamManifest as never)
  })

  it('lists real plus discovered non-real branches', async () => {
    const req = new Request('http://localhost/api/branches', {
      headers: { Authorization: `Bearer ${createAuthToken()}` },
    })

    const res = await GET(req)
    expect(res.status).toBe(200)

    const payload = z
      .object({ branches: z.array(branchInfoSchema) })
      .parse(await res.json())

    expect(payload.branches.map((branch) => branch.name)).toEqual(['real', 'dream'])
  })

  it('rejects unauthorized branch reads', async () => {
    const req = new Request('http://localhost/api/branches')

    const res = await GET(req)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('creates a new branch manifest', async () => {
    const req = new Request('http://localhost/api/branches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${createAuthToken()}` },
      body: JSON.stringify({
        sourceCapsuleId: 'capsule.project.alpha.v1',
        sourceBranch: 'real',
        newBranchName: 'dream',
        recursive: false,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const payload = branchManifestSchema.parse(await res.json())
    expect(payload.name).toBe('dream')
    expect(createBranch).toHaveBeenCalledWith(
      expect.objectContaining({
        newBranchName: 'dream',
        scopeType: 'capsule',
      }),
    )
  })

  it('returns 409 when creating a branch that already exists', async () => {
    vi.mocked(readBranchManifest).mockResolvedValueOnce(dreamManifest as never)

    const req = new Request('http://localhost/api/branches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${createAuthToken()}` },
      body: JSON.stringify({
        sourceCapsuleId: 'capsule.project.alpha.v1',
        sourceBranch: 'real',
        newBranchName: 'dream',
        recursive: false,
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'Branch already exists' })
  })
})
