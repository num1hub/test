import { describe, expect, it } from 'vitest'
import { makeCapsule } from '@/__tests__/fixtures/capsuleFactory'
import { diffBranchSnapshots } from '@/lib/diff/diff-engine'

const maybeIt = process.env.ENABLE_DIFF_BENCHMARK === 'true' ? it : it.skip

function makeGraph(count: number) {
  return Array.from({ length: count }, (_, index) =>
    makeCapsule(`capsule.test.benchmark.${index}.v1`, {
      recursive_layer: {
        links:
          index === 0
            ? []
            : [{ target_id: `capsule.test.benchmark.${index - 1}.v1`, relation_type: 'depends_on' }],
      },
    }),
  )
}

describe('diff benchmark', () => {
  maybeIt('diffs 1000 capsules in under 2000ms', () => {
    const before = makeGraph(1000)
    const after = before.map((capsule, index) =>
      index % 50 === 0
        ? makeCapsule(capsule.metadata.capsule_id, {
            neuro_concentrate: {
              summary: `Updated summary ${index}`,
            },
          })
        : capsule,
    )

    const startedAt = performance.now()
    const result = diffBranchSnapshots(before, after, {
      branchA: 'real',
      branchB: 'dream',
      scopeType: 'vault',
      recursive: false,
      cascadeDeletes: false,
      ignorePaths: ['$.metadata.updated_at', '$.integrity_sha3_512'],
      textMode: 'exact',
      recursionDepthCap: 50,
    })
    const elapsed = performance.now() - startedAt

    expect(result.metrics.scopedCapsuleCount).toBe(1000)
    expect(elapsed).toBeLessThan(2000)
  })
})
