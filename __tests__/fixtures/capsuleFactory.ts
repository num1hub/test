import type { SovereignCapsule } from '@/types/capsule'
import { computeIntegrityHash } from '@/lib/validator/utils'

function mergeDeep<T>(base: T, patch: Partial<T> | undefined): T {
  if (!patch) return base
  const result = structuredClone(base) as Record<string, unknown>
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = mergeDeep(result[key] as Record<string, unknown>, value as Record<string, unknown>)
      continue
    }
    result[key] = value
  }
  return result as T
}

export function makeCapsule(
  capsuleId: string,
  patch?: Partial<SovereignCapsule>,
): SovereignCapsule {
  const base: SovereignCapsule = {
    metadata: {
      capsule_id: capsuleId,
      type: 'concept',
      subtype: 'atomic',
      status: 'active',
      version: '1.0.0',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
      name: capsuleId,
    },
    core_payload: {
      content_type: 'markdown',
      content: `Content for ${capsuleId}`,
    },
    neuro_concentrate: {
      summary: `Summary for ${capsuleId}`,
      keywords: ['a', 'b', 'c'],
      confidence_vector: {
        extraction: 1,
        synthesis: 1,
        linking: 1,
        provenance_coverage: 1,
        validation_score: 1,
        contradiction_pressure: 0.1,
      },
    },
    recursive_layer: {
      links: [],
    },
    integrity_sha3_512: '',
  }

  const capsule = mergeDeep(base, patch)
  capsule.integrity_sha3_512 = computeIntegrityHash(capsule)
  return capsule
}
