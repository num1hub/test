import { resolveCapsulePresence } from '@/lib/capsulePresence'

describe('lib/capsulePresence.ts', () => {
  it('elevates constitutional axis surfaces above ordinary capsules', () => {
    expect(
      resolveCapsulePresence({
        metadata: { subtype: 'atomic' },
        palette: { hierarchyDepth: 4 },
      }),
    ).toMatchObject({
      tier: 'axis',
      label: 'Axis Surface',
      description: expect.any(String),
      scaleBoost: 1.24,
    })
  })

  it('distinguishes major hubs from ordinary hub surfaces', () => {
    expect(
      resolveCapsulePresence({
        metadata: { subtype: 'hub' },
        palette: { hierarchyDepth: 2 },
        linkCount: 12,
      }),
    ).toMatchObject({
      tier: 'major-hub',
      label: 'Major Hub',
    })

    expect(
      resolveCapsulePresence({
        metadata: { subtype: 'hub' },
        palette: { hierarchyDepth: 2 },
        linkCount: 4,
      }),
    ).toMatchObject({
      tier: 'hub',
      label: 'Hub Surface',
    })
  })

  it('keeps core and ordinary capsules on lighter presence tiers', () => {
    expect(
      resolveCapsulePresence({
        metadata: { subtype: 'atomic' },
        palette: { hierarchyDepth: 3 },
      }),
    ).toMatchObject({
      tier: 'core',
      label: 'Core Surface',
    })

    expect(
      resolveCapsulePresence({
        metadata: { subtype: 'atomic' },
        palette: { hierarchyDepth: 1 },
      }),
    ).toMatchObject({
      tier: 'capsule',
      label: 'Capsule Surface',
    })
  })
})
