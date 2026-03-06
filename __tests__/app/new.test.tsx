import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { useRouter } from 'next/navigation'
import NewCapsulePage from '@/app/new/page'
import { ToastProvider } from '@/contexts/ToastContext'
import { useCapsuleStore } from '@/store/capsuleStore'
import { server } from '../setup'

describe('NewCapsulePage', () => {
  beforeEach(() => {
    useCapsuleStore.setState({ capsules: [], isLoading: false, error: null })
  })

  it('shows toast for invalid JSON and does not submit', async () => {
    render(
      <ToastProvider>
        <NewCapsulePage />
      </ToastProvider>,
    )

    fireEvent.change(screen.getByPlaceholderText('{ "metadata": { ... } }'), {
      target: { value: 'invalid json {' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Seal & Execute' }))

    expect(await screen.findByText(/Minting Failed/i, {}, { timeout: 8000 })).toBeInTheDocument()
  }, 10000)

  it('submits valid JSON and redirects', async () => {
    const router = useRouter()
    window.localStorage.setItem('n1hub_vault_token', 'mock')

    const capsule = {
      metadata: { capsule_id: 'test.new.v1', type: 'concept', subtype: 'atomic' },
      core_payload: {},
      neuro_concentrate: {},
      recursive_layer: {},
      integrity_sha3_512: 'x',
    }

    server.use(
      http.post('/api/capsules', async () => {
        return HttpResponse.json(capsule, { status: 201 })
      }),
    )

    render(
      <ToastProvider>
        <NewCapsulePage />
      </ToastProvider>,
    )

    fireEvent.change(screen.getByPlaceholderText('{ "metadata": { ... } }'), {
      target: { value: JSON.stringify(capsule) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Seal & Execute' }))

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/vault/capsule/test.new.v1')
    })
  }, 10000)
})
