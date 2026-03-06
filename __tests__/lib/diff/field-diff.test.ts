import { describe, expect, it } from 'vitest'
import { makeCapsule } from '@/__tests__/fixtures/capsuleFactory'
import { diffCapsuleFields } from '@/lib/diff/field-diff'

describe('field-diff', () => {
  it('ignores metadata.updated_at by default', () => {
    const before = makeCapsule('capsule.test.fields.v1', {
      metadata: {
        capsule_id: 'capsule.test.fields.v1',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
    })
    const after = makeCapsule('capsule.test.fields.v1', {
      metadata: {
        capsule_id: 'capsule.test.fields.v1',
        updated_at: '2026-03-06T00:00:00.000Z',
      },
    })

    expect(diffCapsuleFields(before, after)).toHaveLength(0)
  })

  it('treats keywords as an order-insensitive set', () => {
    const before = makeCapsule('capsule.test.fields.v2', {
      neuro_concentrate: { keywords: ['alpha', 'beta', 'gamma'] },
    })
    const after = makeCapsule('capsule.test.fields.v2', {
      neuro_concentrate: { keywords: ['gamma', 'beta', 'alpha'] },
    })

    expect(diffCapsuleFields(before, after)).toHaveLength(0)
  })

  it('normalizes confidence vectors before comparison', () => {
    const before = makeCapsule('capsule.test.fields.v3', {
      neuro_concentrate: {
        confidence_vector: [1, 1, 1, 1, 1, 0.1] as never,
      },
    })
    const after = makeCapsule('capsule.test.fields.v3', {
      neuro_concentrate: {
        confidence_vector: {
          extraction: 1,
          synthesis: 1,
          linking: 1,
          provenance_coverage: 1,
          validation_score: 1,
          contradiction_pressure: 0.1,
        },
      },
    })

    expect(diffCapsuleFields(before, after)).toHaveLength(0)
  })
})
