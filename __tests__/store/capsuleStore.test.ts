import { act, renderHook } from '@testing-library/react'
import { useCapsuleStore } from '@/store/capsuleStore'
import { SovereignCapsule } from '@/types/capsule'
import { vi } from 'vitest'

const mockCapsule = {
  metadata: { capsule_id: 'store-test-1' },
  core_payload: {},
  neuro_concentrate: { summary: 'test' },
  recursive_layer: { links: [] },
  integrity_sha3_512: 'hash',
} satisfies SovereignCapsule

describe('capsuleStore', () => {
  beforeEach(() => {
    useCapsuleStore.setState({ capsules: [], isLoading: false, error: null })
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('fetchCapsules loads data from API', async () => {
    window.localStorage.setItem('n1hub_vault_token', 'mock-token')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [mockCapsule],
    } as Response)

    const { result } = renderHook(() => useCapsuleStore())

    await act(async () => {
      await result.current.fetchCapsules()
    })

    expect(result.current.capsules).toHaveLength(1)
    expect(result.current.capsules[0].metadata.capsule_id).toBe('store-test-1')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetches without bearer header when token is missing', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [mockCapsule],
    } as Response)

    const { result } = renderHook(() => useCapsuleStore())

    await act(async () => {
      await result.current.fetchCapsules()
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/capsules', { headers: undefined })
    expect(result.current.capsules).toHaveLength(1)
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('addCapsuleLocally appends a capsule', () => {
    const { result } = renderHook(() => useCapsuleStore())

    act(() => {
      result.current.addCapsuleLocally(mockCapsule)
    })

    expect(result.current.capsules).toHaveLength(1)
    expect(result.current.capsules[0].metadata.capsule_id).toBe('store-test-1')
  })

  it('deleteCapsuleLocally removes capsule by id', () => {
    useCapsuleStore.setState({ capsules: [mockCapsule], isLoading: false, error: null })
    const { result } = renderHook(() => useCapsuleStore())

    act(() => {
      result.current.deleteCapsuleLocally('store-test-1')
    })

    expect(result.current.capsules).toHaveLength(0)
  })

  it('updateCapsuleLocally replaces matching capsule by id', () => {
    useCapsuleStore.setState({ capsules: [mockCapsule], isLoading: false, error: null })
    const { result } = renderHook(() => useCapsuleStore())

    const updatedCapsule = {
      ...mockCapsule,
      neuro_concentrate: { summary: 'updated summary' },
    } satisfies SovereignCapsule

    act(() => {
      result.current.updateCapsuleLocally('store-test-1', updatedCapsule)
    })

    expect(result.current.capsules).toHaveLength(1)
    expect(result.current.capsules[0].neuro_concentrate.summary).toBe('updated summary')
  })

  it('removeCapsulesLocally removes multiple capsules by id', () => {
    const secondCapsule = {
      ...mockCapsule,
      metadata: { capsule_id: 'store-test-2' },
    } satisfies SovereignCapsule
    useCapsuleStore.setState({
      capsules: [mockCapsule, secondCapsule],
      isLoading: false,
      error: null,
    })
    const { result } = renderHook(() => useCapsuleStore())

    act(() => {
      result.current.removeCapsulesLocally(['store-test-1', 'store-test-2'])
    })

    expect(result.current.capsules).toHaveLength(0)
  })
})
