import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs/promises'
import { DELETE, GET, PUT } from '@/app/api/capsules/[id]/route'
import { createAuthToken } from '@/__tests__/helpers/auth'
import { logActivity } from '@/lib/activity'
import { getExistingCapsuleIds, getOverlayExistenceSet } from '@/lib/capsuleVault'
import {
  dematerializeOverlayCapsule,
  listBranches,
  loadOverlayGraph,
  readBranchManifest,
  readOverlayCapsule,
  writeOverlayCapsule,
} from '@/lib/diff/branch-manager'
import { validateCapsule } from '@/lib/validator'

vi.mock('fs/promises', () => {
  const readdir = vi.fn(async () => [])
  const unlink = vi.fn(async () => undefined)
  return {
    default: { readdir, unlink },
    readdir,
    unlink,
  }
})

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn(),
}))

vi.mock('@/lib/capsuleVault', () => ({
  CAPSULES_DIR: '/tmp/capsules',
  getExistingCapsuleIds: vi.fn(async () => new Set<string>()),
  getOverlayExistenceSet: vi.fn(async () => new Set<string>()),
}))

vi.mock('@/lib/diff/branch-manager', () => ({
  dematerializeOverlayCapsule: vi.fn(async () => undefined),
  getRealCapsulePath: vi.fn((id: string) => `/tmp/${id}.json`),
  listBranches: vi.fn(async () => []),
  loadOverlayGraph: vi.fn(async () => []),
  parseCapsuleBranchFilename: vi.fn((file: string) => {
    if (file === 'test.v1@dream.json') return { capsuleId: 'test.v1', branch: 'dream', isTombstone: false, isLegacyDream: false, isReal: false }
    return null
  }),
  readBranchManifest: vi.fn(async () => ({ name: 'dream', sourceBranch: 'real', sourceProjectId: null, capsuleIds: ['test.v1'], createdAt: '2026-03-06T00:00:00.000Z', updatedAt: '2026-03-06T00:00:00.000Z' })),
  readOverlayCapsule: vi.fn(),
  writeOverlayCapsule: vi.fn(async () => undefined),
}))

vi.mock('@/lib/validationLog', () => ({
  appendValidationLog: vi.fn(async () => undefined),
}))

vi.mock('@/lib/validator', () => ({
  validateCapsule: vi.fn(async () => ({
    valid: true,
    errors: [],
    warnings: [],
  })),
  autoFixCapsule: vi.fn((capsule: unknown) => ({
    fixedData: capsule,
    appliedFixes: [],
  })),
}))

describe('API: /api/capsules/[id]', () => {
  const authHeader = { Authorization: `Bearer ${createAuthToken()}` }

  const payload = {
    metadata: { capsule_id: 'test.v1' },
    core_payload: {},
    neuro_concentrate: {},
    recursive_layer: { links: [] },
    integrity_sha3_512: 'hash',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getExistingCapsuleIds).mockResolvedValue(new Set())
    vi.mocked(getOverlayExistenceSet).mockResolvedValue(new Set())
    vi.mocked(listBranches).mockResolvedValue([])
    vi.mocked(loadOverlayGraph).mockResolvedValue([])
    vi.mocked(readBranchManifest).mockResolvedValue({
      name: 'dream',
      sourceBranch: 'real',
      sourceProjectId: null,
      capsuleIds: ['test.v1'],
      createdAt: '2026-03-06T00:00:00.000Z',
      updatedAt: '2026-03-06T00:00:00.000Z',
    } as never)
    vi.mocked(readOverlayCapsule).mockResolvedValue(null as never)
  })

  describe('GET', () => {
    it('reads specified branch', async () => {
      const req = new Request('http://localhost/api/capsules/test.v1?branch=dream', {
        headers: authHeader,
      })
      vi.mocked(readOverlayCapsule).mockResolvedValue(payload as never)

      const res = await GET(req, { params: Promise.resolve({ id: 'test.v1' }) })
      expect(res.status).toBe(200)
      expect(readOverlayCapsule).toHaveBeenCalledWith('test.v1', 'dream')
    })

    it('returns 404 if branch does not exist', async () => {
      const req = new Request('http://localhost/api/capsules/test.v1', { headers: authHeader })
      vi.mocked(readOverlayCapsule).mockResolvedValue(null)

      const res = await GET(req, { params: Promise.resolve({ id: 'test.v1' }) })
      expect(res.status).toBe(404)
    })
  })

  describe('PUT', () => {
    it('writes to specified branch and updates timestamp', async () => {
      const req = new Request('http://localhost/api/capsules/test.v1?branch=real', {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify(payload),
      })

      vi.mocked(readOverlayCapsule).mockResolvedValue(payload as never)
      vi.mocked(validateCapsule).mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
      } as never)

      const res = await PUT(req, { params: Promise.resolve({ id: 'test.v1' }) })
      expect(res.status).toBe(200)

      const writtenCapsule = vi.mocked(writeOverlayCapsule).mock.calls[0][0] as {
        metadata: { updated_at?: string }
      }
      expect(writtenCapsule.metadata.updated_at).toBeDefined()
      expect(writeOverlayCapsule).toHaveBeenCalledWith(expect.any(Object), 'real')
      expect(logActivity).toHaveBeenCalledWith('update', expect.objectContaining({ capsule_id: 'test.v1' }))
    })

    it('allows built-in dream writes without manifest lookup', async () => {
      vi.mocked(readBranchManifest).mockResolvedValueOnce(null)

      const req = new Request('http://localhost/api/capsules/test.v1?branch=dream', {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify(payload),
      })

      vi.mocked(readOverlayCapsule).mockResolvedValue(payload as never)
      vi.mocked(validateCapsule).mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
      } as never)

      const res = await PUT(req, { params: Promise.resolve({ id: 'test.v1' }) })
      expect(res.status).toBe(200)
      expect(writeOverlayCapsule).toHaveBeenCalledWith(expect.any(Object), 'dream')
      expect(readBranchManifest).not.toHaveBeenCalled()
    })

    it('returns 404 for a missing custom branch', async () => {
      vi.mocked(readBranchManifest).mockResolvedValueOnce(null)

      const req = new Request('http://localhost/api/capsules/test.v1?branch=experimental-1', {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify(payload),
      })

      const res = await PUT(req, { params: Promise.resolve({ id: 'test.v1' }) })
      expect(res.status).toBe(404)
      expect(readBranchManifest).toHaveBeenCalledWith('experimental-1')
    })

    it('returns 409 when project re-parenting would create a cycle', async () => {
      const projectPayload = {
        metadata: {
          capsule_id: 'capsule.project.child.v1',
          type: 'project',
          subtype: 'hub',
        },
        core_payload: {},
        neuro_concentrate: {},
        recursive_layer: {
          links: [{ target_id: 'capsule.project.parent.v1', relation_type: 'part_of' }],
        },
        integrity_sha3_512: 'hash',
      }

      const req = new Request('http://localhost/api/capsules/capsule.project.child.v1?branch=real', {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify(projectPayload),
      })

      vi.mocked(readOverlayCapsule).mockResolvedValue({
        ...projectPayload,
        recursive_layer: { links: [] },
      } as never)
      vi.mocked(getOverlayExistenceSet).mockResolvedValue(
        new Set(['capsule.project.child.v1', 'capsule.project.parent.v1']),
      )
      vi.mocked(loadOverlayGraph).mockResolvedValue([
        {
          metadata: {
            capsule_id: 'capsule.project.parent.v1',
            type: 'project',
            subtype: 'hub',
          },
          core_payload: {},
          neuro_concentrate: {},
          recursive_layer: {
            links: [{ target_id: 'capsule.project.child.v1', relation_type: 'part_of' }],
          },
          integrity_sha3_512: 'hash',
        },
      ] as never)

      const res = await PUT(req, {
        params: Promise.resolve({ id: 'capsule.project.child.v1' }),
      })

      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.error).toContain('Cycle detected')
    })
  })

  describe('DELETE', () => {
    it('deletes available branches and returns 204', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['test.v1@dream.json'] as never)

      const req = new Request('http://localhost/api/capsules/test.v1', {
        method: 'DELETE',
        headers: authHeader,
      })

      const res = await DELETE(req, { params: Promise.resolve({ id: 'test.v1' }) })
      expect(res.status).toBe(204)
      expect(fs.unlink).toHaveBeenCalledWith('/tmp/test.v1.json')
      expect(dematerializeOverlayCapsule).toHaveBeenCalledWith('test.v1', 'dream', { removeFromManifest: true })
      expect(logActivity).toHaveBeenCalledWith('delete', expect.objectContaining({ capsule_id: 'test.v1' }))
    })
  })
})
