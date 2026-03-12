import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '@/app/api/capsules/route'
import { createAuthToken } from '@/__tests__/helpers/auth'
import { logActivity } from '@/lib/activity'
import { getExistingCapsuleIds, readCapsulesFromDisk } from '@/lib/capsuleVault'
import {
  getOverlayExistenceSet,
  loadOverlayGraph,
  readBranchManifest,
  readOverlayCapsule,
  writeOverlayCapsule,
} from '@/lib/diff/branch-manager'
import { validateCapsule } from '@/lib/validator'

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn(),
}))

vi.mock('@/lib/capsuleVault', () => ({
  getExistingCapsuleIds: vi.fn(async () => new Set<string>()),
  readCapsulesFromDisk: vi.fn(async () => []),
}))

vi.mock('@/lib/diff/branch-manager', () => ({
  getOverlayExistenceSet: vi.fn(async () => new Set<string>()),
  listExplicitBranchCapsules: vi.fn(async () => []),
  loadOverlayGraph: vi.fn(async () => []),
  readBranchManifest: vi.fn(async () => ({ name: 'dream', sourceBranch: 'real', sourceProjectId: null, capsuleIds: [], createdAt: '2026-03-06T00:00:00.000Z', updatedAt: '2026-03-06T00:00:00.000Z' })),
  readOverlayCapsule: vi.fn(async () => null),
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
    vi.mocked(getExistingCapsuleIds).mockResolvedValue(new Set())
    vi.mocked(readCapsulesFromDisk).mockResolvedValue([])
    vi.mocked(getOverlayExistenceSet).mockResolvedValue(new Set())
    vi.mocked(loadOverlayGraph).mockResolvedValue([])
    vi.mocked(readOverlayCapsule).mockResolvedValue(null)
    vi.mocked(readBranchManifest).mockResolvedValue({
      name: 'dream',
      sourceBranch: 'real',
      sourceProjectId: null,
      capsuleIds: [],
      createdAt: '2026-03-06T00:00:00.000Z',
      updatedAt: '2026-03-06T00:00:00.000Z',
    } as never)
  })

  describe('GET', () => {
    it('returns 401 if unauthorized', async () => {
      const req = new Request('http://localhost/api/capsules')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns real capsules by default', async () => {
      const req = new Request('http://localhost/api/capsules', {
        headers: { Authorization: `Bearer ${createAuthToken()}` },
      })

      vi.mocked(readCapsulesFromDisk).mockResolvedValue([mockCapsule] as never)

      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = (await res.json()) as Array<typeof mockCapsule>
      expect(data).toHaveLength(1)
      expect(data[0].metadata.capsule_id).toBe('test.v1')
    })

    it('returns overlay capsules for non-real branches', async () => {
      const req = new Request('http://localhost/api/capsules?branch=dream', {
        headers: { Authorization: `Bearer ${createAuthToken()}` },
      })

      vi.mocked(loadOverlayGraph).mockResolvedValue([mockCapsule] as never)

      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = (await res.json()) as Array<typeof mockCapsule>
      expect(data).toHaveLength(1)
      expect(loadOverlayGraph).toHaveBeenCalledWith('dream')
    })
  })

  describe('POST', () => {
    it('returns 401 if unauthorized', async () => {
      const req = new Request('http://localhost/api/capsules', { method: 'POST' })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('returns 400 when validation fails', async () => {
      vi.mocked(validateCapsule).mockResolvedValueOnce({
        valid: false,
        errors: [{ gate: 'G01', path: '$', message: 'invalid root' }],
        warnings: [],
      } as never)

      const req = new Request('http://localhost/api/capsules', {
        method: 'POST',
        headers: { Authorization: `Bearer ${createAuthToken()}` },
        body: JSON.stringify({ metadata: { capsule_id: 'bad.v1' } }),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('returns 404 when writing to a missing non-real branch', async () => {
      vi.mocked(readBranchManifest).mockResolvedValueOnce(null)

      const req = new Request('http://localhost/api/capsules?branch=experimental-1', {
        method: 'POST',
        headers: { Authorization: `Bearer ${createAuthToken()}` },
        body: JSON.stringify(mockCapsule),
      })

      const res = await POST(req)
      expect(res.status).toBe(404)
    })

    it('injects parent link when parentId is provided', async () => {
      vi.mocked(readCapsulesFromDisk).mockResolvedValueOnce([
        {
          metadata: { capsule_id: 'capsule.project.parent.v1', type: 'project', subtype: 'hub' },
          recursive_layer: { links: [] },
        },
      ] as never)

      const req = new Request('http://localhost/api/capsules', {
        method: 'POST',
        headers: { Authorization: `Bearer ${createAuthToken()}` },
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
    })

    it('writes capsule and returns 201 on success', async () => {
      vi.mocked(getExistingCapsuleIds).mockResolvedValue(new Set())

      const req = new Request('http://localhost/api/capsules', {
        method: 'POST',
        headers: { Authorization: `Bearer ${createAuthToken()}` },
        body: JSON.stringify(mockCapsule),
      })

      const res = await POST(req)
      expect(res.status).toBe(201)
      expect(writeOverlayCapsule).toHaveBeenCalledWith(expect.objectContaining(mockCapsule), 'real')
      expect(logActivity).toHaveBeenCalledWith('create', expect.objectContaining({ capsule_id: 'test.v1' }))
    })
  })
})
