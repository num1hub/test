import { resolveCapsuleFaceprint } from '@/lib/capsuleFaceprint'

describe('lib/capsuleFaceprint.ts', () => {
  it('builds stable faceprints from capsule ids', () => {
    const first = resolveCapsuleFaceprint('capsule.foundation.agent-context-engineering.v1')
    const second = resolveCapsuleFaceprint('capsule.foundation.agent-context-engineering.v1')

    expect(second).toEqual(first)
    expect(first.memoryTag).toBe('ACE')
    expect(first.constellation.length).toBeGreaterThanOrEqual(3)
    expect(first.ringCount).toBeGreaterThanOrEqual(1)
  })

  it('keeps neighboring capsules visually distinct', () => {
    const context = resolveCapsuleFaceprint('capsule.foundation.agent-context-engineering.v1')
    const control = resolveCapsuleFaceprint('capsule.foundation.agent-control-plane.v1')
    const gates = resolveCapsuleFaceprint('capsule.foundation.capsuleos.16-gates.v1')

    expect(context.memoryTag).toBe('ACE')
    expect(control.memoryTag).toBe('ACP')
    expect(gates.memoryTag).toBe('16G')
    expect(control).not.toEqual(context)
    expect(gates.glyph).toBeDefined()
  })
})
