import { act, renderHook, waitFor } from '@testing-library/react'
import {
  DEFAULT_CAPSULE_VISUAL_OWNER_ID,
  getCapsuleVisualPreferenceStorageKeys,
  useCapsuleVisualPreferences,
} from '@/hooks/useCapsuleVisualPreferences'

describe('useCapsuleVisualPreferences', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('builds deterministic storage keys per owner profile', () => {
    expect(getCapsuleVisualPreferenceStorageKeys()).toEqual({
      visualProfile: `workspace-visual-profile:${DEFAULT_CAPSULE_VISUAL_OWNER_ID}`,
      graphQuality: `workspace-graph-quality:${DEFAULT_CAPSULE_VISUAL_OWNER_ID}`,
    })

    expect(getCapsuleVisualPreferenceStorageKeys('capsule.person.custom.v1')).toEqual({
      visualProfile: 'workspace-visual-profile:capsule.person.custom.v1',
      graphQuality: 'workspace-graph-quality:capsule.person.custom.v1',
    })
  })

  it('hydrates persisted visual posture from localStorage', async () => {
    const keys = getCapsuleVisualPreferenceStorageKeys()
    window.localStorage.setItem(keys.visualProfile, 'cinematic')
    window.localStorage.setItem(keys.graphQuality, 'lite')

    const { result } = renderHook(() => useCapsuleVisualPreferences())

    await waitFor(() => {
      expect(result.current.visualProfile).toBe('cinematic')
      expect(result.current.graphQuality).toBe('lite')
    })

    expect(result.current.resolvedVisualProfile.label).toBe('Cinema')
    expect(result.current.resolvedGraphQuality.label).toBe('Lite')
  })

  it('persists visual posture updates under the owner profile key', async () => {
    const ownerProfileId = 'capsule.person.custom.v1'
    const keys = getCapsuleVisualPreferenceStorageKeys(ownerProfileId)
    const { result } = renderHook(() => useCapsuleVisualPreferences(ownerProfileId))

    act(() => {
      result.current.setVisualProfile('architect')
      result.current.setGraphQuality('ultra')
    })

    await waitFor(() => {
      expect(window.localStorage.getItem(keys.visualProfile)).toBe('architect')
      expect(window.localStorage.getItem(keys.graphQuality)).toBe('ultra')
    })

    expect(result.current.resolvedVisualProfile.label).toBe('Architect')
    expect(result.current.resolvedGraphQuality.label).toBe('Ultra')
  })
})
