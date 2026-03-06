import { describe, expect, it } from 'vitest'
import { diffCapsuleLinks } from '@/lib/diff/link-diff'
import { makeCapsule } from '@/__tests__/fixtures/capsuleFactory'

describe('link-diff', () => {
  it('is order-insensitive for unchanged links', () => {
    const before = makeCapsule('capsule.test.links.v1', {
      recursive_layer: {
        links: [
          { target_id: 'b', relation_type: 'references' },
          { target_id: 'c', relation_type: 'depends_on' },
        ],
      },
    })
    const after = makeCapsule('capsule.test.links.v1', {
      recursive_layer: {
        links: [
          { target_id: 'c', relation_type: 'depends_on' },
          { target_id: 'b', relation_type: 'references' },
        ],
      },
    })

    expect(diffCapsuleLinks(before, after)).toHaveLength(0)
  })

  it('emits remove and add when relation changes', () => {
    const before = makeCapsule('capsule.test.links.v2', {
      recursive_layer: {
        links: [{ target_id: 'b', relation_type: 'references' }],
      },
    })
    const after = makeCapsule('capsule.test.links.v2', {
      recursive_layer: {
        links: [{ target_id: 'b', relation_type: 'depends_on' }],
      },
    })

    const changes = diffCapsuleLinks(before, after)
    expect(changes).toHaveLength(2)
    expect(changes.map((change) => change.change).sort()).toEqual(['added', 'removed'])
  })
})
