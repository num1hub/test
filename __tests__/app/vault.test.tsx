import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import VaultDashboard from '@/app/vault/page'
import { useRouter } from 'next/navigation'
import { useCapsuleStore } from '@/store/capsuleStore'
import { ToastProvider } from '@/contexts/ToastContext'
import type { ReactNode } from 'react'

const renderWithToastProvider = (ui: ReactNode) => {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

describe('VaultDashboard', () => {
  beforeEach(() => {
    useCapsuleStore.setState({ capsules: [], isLoading: true, error: null })
  })

  it('redirects to login if no token is present', async () => {
    const router = useRouter()
    renderWithToastProvider(<VaultDashboard />)
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/login')
    })
  })

  it('fetches and displays capsules when authorized', async () => {
    window.localStorage.setItem('n1hub_vault_token', 'mock-token')
    renderWithToastProvider(<VaultDashboard />)

    expect(screen.getByText('Initializing Cognitive Plane...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('test-1')).toBeInTheDocument()
      expect(screen.getByText('Summary 1')).toBeInTheDocument()
    })
  })

  it('toggles between Grid and 2D Graph views', async () => {
    window.localStorage.setItem('n1hub_vault_token', 'mock-token')
    renderWithToastProvider(<VaultDashboard />)

    await waitFor(() => expect(screen.getByText('test-1')).toBeInTheDocument())

    // Switch to Graph
    fireEvent.click(screen.getByText('2D Graph'))
    expect(screen.getByTestId('mock-force-graph')).toBeInTheDocument()
    expect(screen.queryByText('Summary 1')).not.toBeInTheDocument()
  })
})
