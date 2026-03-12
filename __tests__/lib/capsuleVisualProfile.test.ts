import {
  resolveCapsuleGraphQuality,
  resolveCapsuleVisualProfile,
} from '@/lib/capsuleVisualProfile'

describe('lib/capsuleVisualProfile.ts', () => {
  it('resolves mnemonic profile by default', () => {
    expect(resolveCapsuleVisualProfile(undefined)).toMatchObject({
      key: 'mnemonic',
      label: 'Mnemonic',
      heroLabelScaleThreshold: 1.18,
      presenceAuraBoost: 1.18,
    })
  })

  it('resolves alternate visual profiles', () => {
    expect(resolveCapsuleVisualProfile('architect')).toMatchObject({
      key: 'architect',
      label: 'Architect',
    })

    expect(resolveCapsuleVisualProfile('cinematic')).toMatchObject({
      key: 'cinematic',
      label: 'Cinema',
    })
  })

  it('resolves graph quality presets', () => {
    expect(resolveCapsuleGraphQuality('ultra')).toMatchObject({
      key: 'ultra',
      label: 'Ultra',
      heroMarkBoost: 1.14,
      spotlightAlpha: 0.3,
    })

    expect(resolveCapsuleGraphQuality(undefined)).toMatchObject({
      key: 'balanced',
      label: 'Balanced',
      idleNodeAlpha: 0.94,
      dimmedNodeAlpha: 0.2,
    })

    expect(resolveCapsuleGraphQuality('lite')).toMatchObject({
      key: 'lite',
      label: 'Lite',
      dimmedNodeAlpha: 0.14,
      vignetteAlpha: 0.32,
    })
  })
})
