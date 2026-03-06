import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs/promises'
import { DELETE, GET, PUT } from '@/app/api/capsules/[id]/route'
import * as branching from '@/lib/branching'
import { logActivity } from '@/lib/activity'
import { readCapsulesFromDisk } from '@/lib/capsuleVault'
import { validateCapsule } from '@/lib/validator'

vi.mock('fs/promises', () => {
  const unlink = vi.fn()
  return {
    default: { unlink },
    unlink,
  }
})

vi.mock('@/lib/branching', () => ({
  branchExists: vi.fn(),
  getCapsulePath: vi.fn((id: string, branch: 'real' | 'dream') => `/tmp/${id}.${branch}.json`),
  readCapsuleBranch: vi.fn(),
  writeCapsuleBranch: vi.fn(),
}))

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn(),
}))

vi.mock('@/lib/capsuleVault', () => ({
  getExistingCapsuleIds: vi.fn(async () => new Set<string>()),
  readCapsulesFromDisk: vi.fn(async () => []),
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
  const authHeader = { Authorization: 'Bearer n1-authorized-architect-token-777' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('reads specified branch', async () => {
      const req = new Request('http://localhost/api/capsules/test.v1?branch=dream', {
        headers: authHeader,
      })
      vi.mocked(branching.readCapsuleBranch).mockResolvedValue({ metadata: { capsule_id: 'test.v1' } } as never)

      const res = await GET(req, { params: Promise.resolve({ id: 'test.v1' }) })
      expect(res.status).toBe(200)
      expect(branching.readCapsuleBranch).toHaveBeenCalledWith('test.v1', 'dream')
    })

    it('returns 404 if branch does not exist', async () => {
      const req = new Request('http://localhost/api/capsules/test.v1', { headers: authHeader })
      vi.mocked(branching.readCapsuleBranch).mockRejectedValue({ code: 'ENOENT' })

      const res = await GET(req, { params: Promise.resolve({ id: 'test.v1' }) })
      expect(res.status).toBe(404)
    })
  })

  describe('PUT', () => {
    it('writes to specified branch and updates timestamp', async () => {
      const payload = {
        metadata: { capsule_id: 'test.v1' },
        core_payload: {},
        neuro_concentrate: {},
        recursive_layer: { links: [] },
        integrity_sha3_512: 'hash',
      }
      const req = new Request('http://localhost/api/capsules/test.v1?branch=real', {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify(payload),
      })

      vi.mocked(branching.branchExists).mockResolvedValue(true)
      vi.mocked(branching.readCapsuleBranch).mockResolvedValue(payload as never)
      vi.mocked(branching.writeCapsuleBranch).mockResolvedValue(undefined)
      vi.mocked(validateCapsule).mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
      } as never)

      const res = await PUT(req, { params: Promise.resolve({ id: 'test.v1' }) })
      expect(res.status).toBe(200)

      const writtenCapsule = vi.mocked(branching.writeCapsuleBranch).mock.calls[0][2] as {
        metadata: { updated_at?: string }
      }
      expect(writtenCapsule.metadata.updated_at).toBeDefined()
      expect(branching.writeCapsuleBranch).toHaveBeenCalledWith('test.v1', 'real', expect.any(Object))
      expect(logActivity).toHaveBeenCalledWith('update', expect.objectContaining({ capsule_id: 'test.v1' }))
    })

    it('returns 409 when project re-parenting would create a cycle', async () => {
      const payload = {
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
        body: JSON.stringify(payload),
      })

      vi.mocked(branching.branchExists).mockResolvedValue(true)
      vi.mocked(branching.readCapsuleBranch).mockResolvedValue({
        ...payload,
        recursive_layer: { links: [] },
      } as never)
      vi.mocked(readCapsulesFromDisk).mockResolvedValue([
        {
          metadata: {
            capsule_id: 'capsule.project.parent.v1',
            type: 'project',
            subtype: 'hub',
          },
          recursive_layer: {
            links: [{ target_id: 'capsule.project.child.v1', relation_type: 'part_of' }],
          },
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
      vi.mocked(fs.unlink).mockResolvedValue(undefined as never)
      const req = new Request('http://localhost/api/capsules/test.v1', {
        method: 'DELETE',
        headers: authHeader,
      })

      const res = await DELETE(req, { params: Promise.resolve({ id: 'test.v1' }) })
      expect(res.status).toBe(204)
      expect(fs.unlink).toHaveBeenCalledTimes(2)
      expect(logActivity).toHaveBeenCalledWith('delete', expect.objectContaining({ capsule_id: 'test.v1' }))
    })
  })
})
