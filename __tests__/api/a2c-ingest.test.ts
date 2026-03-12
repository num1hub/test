import fs from 'fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/a2c/ingest/route'
import { logActivity } from '@/lib/activity'
import { stageOperatorInput } from '@/lib/a2c/ingest'
import { ensureCapsulesDir } from '@/lib/capsuleVault'
import { appendValidationLog } from '@/lib/validationLog'
import { validateCapsule } from '@/lib/validator'
import { createAuthToken } from '@/__tests__/helpers/auth'

vi.mock('@/lib/apiSecurity', () => ({
  isAuthorized: vi.fn(() => true),
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 })),
}))

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}))

vi.mock('@/lib/a2c/ingest', () => ({
  stageOperatorInput: vi.fn(),
}))

vi.mock('@/lib/capsuleVault', () => ({
  CAPSULES_DIR: '/tmp/n1hub-a2c-ingest-test-capsules',
  ensureCapsulesDir: vi.fn(),
  getExistingCapsuleIds: vi.fn(async () => new Set()),
}))

vi.mock('@/lib/validationLog', () => ({
  appendValidationLog: vi.fn(),
}))

vi.mock('@/lib/validator', () => ({
  autoFixCapsule: vi.fn((capsule) => ({ fixedData: capsule })),
  validateCapsule: vi.fn(async () => ({ valid: true, errors: [], warnings: [] })),
}))

describe('API: /api/a2c/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.access).mockResolvedValue(undefined)
    vi.mocked(fs.mkdir).mockResolvedValue(undefined as never)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)
    vi.mocked(ensureCapsulesDir).mockResolvedValue(undefined as never)
    vi.mocked(appendValidationLog).mockResolvedValue(undefined as never)
    vi.mocked(validateCapsule).mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    } as never)
    vi.mocked(stageOperatorInput).mockResolvedValue({
      intake_id: 'operator-input-test',
      received_at: '2026-03-10T00:00:00.000Z',
      source: { channel: 'api' },
      raw_path: '/tmp/operator-input-test.raw.json',
      normalized_path: '/tmp/operator-input-test.normalized.json',
      raw_text: 'Explain TODO-001 and compare options before coding.',
      normalized: {
        objective: 'Explain TODO-001 and compare options before coding.',
        route_class_hint: 'assistant_synthesis',
        scope_hints: ['TODO-001'],
        file_hints: [],
        task_refs: ['TODO-001'],
        priority_hint: null,
        execution_band_hint: null,
        owner_lane_hints: ['TO-DO Executor'],
        acceptance_criteria_hints: [],
        verification_hints: [],
        stop_condition_hints: [],
      },
    } as never)
    vi.mocked(logActivity).mockResolvedValue(undefined as never)
  })

  it('stages operator input with status 202', async () => {
    const req = new Request('http://localhost/api/a2c/ingest', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${createAuthToken()}`,
      },
      body: JSON.stringify({
        operatorInput: {
          text: 'Explain TODO-001 and compare options before coding.',
          source: { channel: 'chat', actor: 'reviewer' },
        },
      }),
    })

    const res = await POST(req)
    const payload = await res.json()

    expect(res.status).toBe(202)
    expect(stageOperatorInput).toHaveBeenCalledWith(
      process.cwd(),
      expect.objectContaining({
        text: 'Explain TODO-001 and compare options before coding.',
      }),
    )
    expect(payload.summary).toEqual({
      status: 'normalized',
      task_refs: 1,
      verification_hints: 0,
    })
  })

  it('rejects mixed operatorInput and capsule payloads instead of silently dropping capsules', async () => {
    const req = new Request('http://localhost/api/a2c/ingest', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${createAuthToken()}`,
      },
      body: JSON.stringify({
        operatorInput: {
          text: 'Take TODO-001 and explain the tradeoffs before coding.',
        },
        capsule: {
          metadata: {
            capsule_id: 'capsule.test.mixed.v1',
          },
        },
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'A2C ingest accepts either operatorInput or capsule candidates per request, not both.',
    })
    expect(stageOperatorInput).not.toHaveBeenCalled()
    expect(logActivity).not.toHaveBeenCalled()
  })

  it('returns quarantine summaries when a multi-candidate capsule batch mixes valid and invalid items', async () => {
    vi.mocked(validateCapsule)
      .mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: [],
      } as never)
      .mockResolvedValueOnce({
        valid: false,
        errors: [
          {
            gate: 'G16',
            path: '$.core_payload.content',
            message: 'Transient synthesis capsule failed validation.',
          },
        ],
        warnings: [],
      } as never)

    const req = new Request('http://localhost/api/a2c/ingest', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${createAuthToken()}`,
      },
      body: JSON.stringify({
        autoFix: false,
        capsules: [
          {
            metadata: { capsule_id: 'capsule.test.valid.v1' },
          },
          {
            metadata: { capsule_id: 'capsule.test.invalid.v1' },
          },
        ],
      }),
    })

    const res = await POST(req)
    const payload = await res.json()

    expect(res.status).toBe(207)
    expect(payload.summary).toEqual({
      total: 2,
      stored: 1,
      quarantined: 1,
    })
    expect(payload.stored).toEqual(['capsule.test.valid.v1'])
    expect(payload.quarantined).toEqual([
      expect.objectContaining({
        capsule_id: 'capsule.test.invalid.v1',
        reason: 'G16:Transient synthesis capsule failed validation.',
      }),
    ])
    expect(ensureCapsulesDir).toHaveBeenCalledTimes(1)
    expect(appendValidationLog).toHaveBeenCalledTimes(2)
    expect(fs.writeFile).toHaveBeenCalledTimes(2)
    expect(logActivity).toHaveBeenCalledWith('import', {
      message: 'A2C ingest validation completed.',
      stored: 1,
      quarantined: 1,
    })
  })
})
