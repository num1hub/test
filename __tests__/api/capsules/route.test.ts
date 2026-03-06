import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs/promises'
import { GET, POST } from '@/app/api/capsules/route'
import { logActivity } from '@/lib/activity'
import { getExistingCapsuleIds, readCapsulesFromDisk } from '@/lib/capsuleVault'
import { validateCapsule } from '@/lib/validator'

vi.mock('fs/promises', () => {
  const access = vi.fn()
  const mkdir = vi.fn()
  const readdir = vi.fn()
  const readFile = vi.fn()
  const writeFile = vi.fn()
  return {
    default: { access, mkdir, readdir, readFile, writeFile },
    access,
    mkdir,
    readdir,
    readFile,
    writeFile,
  }
})

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

const mockCapsule = {
  metadata: {
    capsule_id: 'test.v1',
    type: 'concept',
    subtype: 'atomic',
    status: 'active',
    version: '1.0.0',
    semantic_hash: 'capsuleos-validator-gate-model-quality-trace-proof-chain',
    source: { uri: 'https://example.com', type: 'test' },
  },
  core_payload: {
    content_type: 'markdown',
    content: 'test content',
  },
  neuro_concentrate: {
    summary:
      'This test summary intentionally contains enough words to satisfy the summary gate requirement while keeping assertions focused on API behavior rather than capsule semantics under validation checks in this route test.',
    confidence_vector: {
      extraction: 1,
      synthesis: 1,
      linking: 1,
      provenance_coverage: 1,
      validation_score: 1,
      contradiction_pressure: 0.1,
    },
    keywords: ['a', 'b', 'c', 'd', 'e'],
    semantic_hash: 'capsuleos-validator-gate-model-quality-trace-proof-chain',
  },
  recursive_layer: {
    links: [{ target_id: 'test.v1', relation_type: 'references' }],
  },
  integrity_sha3_512: 'a'.repeat(128),
}

describe('API: /api/capsules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('returns 401 if unauthorized', async () => {
      const req = new Request('http://localhost/api/capsules')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns parsed capsules and filters out non-real files', async () => {
      const req = new Request('http://localhost/api/capsules', {
        headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
      })

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readdir).mockResolvedValue(['test1.json', 'test2.txt', 'test3.dream.json'] as never)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockCapsule) as never)

      const res = await GET(req)
      expect(res.status).toBe(200)

      const data = (await res.json()) as Array<typeof mockCapsule>
      expect(data).toHaveLength(1)
      expect(data[0].metadata.capsule_id).toBe('test.v1')
    })

    it('filters by type query parameter', async () => {
      const req = new Request('http://localhost/api/capsules?type=project', {
        headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
      })

      const projectCapsule = {
        ...mockCapsule,
        metadata: {
          ...mockCapsule.metadata,
          capsule_id: 'capsule.project.test.v1',
          type: 'project',
          subtype: 'hub',
        },
      }

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readdir).mockResolvedValue(['a.json', 'b.json'] as never)
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(mockCapsule) as never)
        .mockResolvedValueOnce(JSON.stringify(projectCapsule) as never)

      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = (await res.json()) as Array<typeof projectCapsule>
      expect(data).toHaveLength(1)
      expect(data[0].metadata.type).toBe('project')
    })
  })

  describe('POST', () => {
    it('returns 401 if unauthorized', async () => {
      const req = new Request('http://localhost/api/capsules', { method: 'POST' })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('returns 400 when 5-Element validation fails', async () => {
      vi.mocked(validateCapsule).mockResolvedValueOnce({
        valid: false,
        errors: [{ gate: 'G01', path: '$', message: 'invalid root' }],
        warnings: [],
      } as never)

      const req = new Request('http://localhost/api/capsules', {
        method: 'POST',
        headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
        body: JSON.stringify({ metadata: { capsule_id: 'bad.v1' } }),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Validation failed')
    })

    it('returns 409 if capsule already exists', async () => {
      const req = new Request('http://localhost/api/capsules', {
        method: 'POST',
        headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
        body: JSON.stringify(mockCapsule),
      })

      vi.mocked(fs.access).mockResolvedValue(undefined)

      const res = await POST(req)
      expect(res.status).toBe(409)
    })

    it('injects parent link when parentId is provided', async () => {
      vi.mocked(readCapsulesFromDisk).mockResolvedValueOnce([
        {
          metadata: { capsule_id: 'capsule.project.parent.v1', type: 'project', subtype: 'hub' },
          recursive_layer: { links: [] },
        },
      ] as never)

      vi.mocked(fs.access)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce({ code: 'ENOENT' })

      const req = new Request('http://localhost/api/capsules', {
        method: 'POST',
        headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
        body: JSON.stringify({
          ...mockCapsule,
          metadata: {
            ...mockCapsule.metadata,
            capsule_id: 'capsule.project.child.v1',
            type: 'project',
            subtype: 'hub',
          },
          parentId: 'capsule.project.parent.v1',
          recursive_layer: { links: [] },
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(201)

      expect(validateCapsule).toHaveBeenCalledWith(
        expect.objectContaining({
          recursive_layer: {
            links: [{ target_id: 'capsule.project.parent.v1', relation_type: 'part_of' }],
          },
        }),
        expect.objectContaining({ existingIds: expect.any(Set) }),
      )

      const validatedCapsule = vi.mocked(validateCapsule).mock.calls[0][0] as Record<string, unknown>
      expect(validatedCapsule.parentId).toBeUndefined()
    })

    it('rejects parentId when parent project does not exist', async () => {
      vi.mocked(readCapsulesFromDisk).mockResolvedValueOnce([] as never)

      const req = new Request('http://localhost/api/capsules', {
        method: 'POST',
        headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
        body: JSON.stringify({
          ...mockCapsule,
          parentId: 'capsule.project.missing.v1',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
      const payload = await res.json()
      expect(payload.error).toContain('Invalid parentId')
    })

    it('writes capsule and returns 201 on success', async () => {
      const req = new Request('http://localhost/api/capsules', {
        method: 'POST',
        headers: { Authorization: 'Bearer n1-authorized-architect-token-777' },
        body: JSON.stringify(mockCapsule),
      })

      vi.mocked(fs.access)
        .mockResolvedValueOnce(undefined) // data dir exists
        .mockRejectedValueOnce({ code: 'ENOENT' }) // target file not found
      vi.mocked(getExistingCapsuleIds).mockResolvedValue(new Set())

      const res = await POST(req)
      expect(res.status).toBe(201)
      expect(fs.writeFile).toHaveBeenCalledTimes(1)
      expect(logActivity).toHaveBeenCalledWith('create', expect.objectContaining({ capsule_id: 'test.v1' }))
    })
  })
})
