import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { server } from '../setup'
import LoginPage from '@/app/login/page'
import { useRouter } from 'next/navigation'

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage />)
    expect(screen.getByText('Architect Login')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('shows error on invalid password', async () => {
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong-pass' } })
    fireEvent.click(screen.getByRole('button', { name: /unlock vault/i }))

    await waitFor(() => {
      expect(screen.getByText('Access Denied. Incorrect clearance code.')).toBeInTheDocument()
    })
    expect(window.localStorage.getItem('n1hub_vault_token')).toBeNull()
  })

  it('stores token and redirects on success', async () => {
    const router = useRouter()
    render(<LoginPage />)
    
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'correct-pass' } })
    fireEvent.click(screen.getByRole('button', { name: /unlock vault/i }))

    await waitFor(() => {
      expect(window.localStorage.getItem('n1hub_vault_token')).toBe('mock-token')
      expect(router.push).toHaveBeenCalledWith('/vault')
    })
  })

  it('supports local ChatGPT login when a Codex session is available', async () => {
    const router = useRouter()
    server.use(
      http.get('/api/auth/chatgpt', () =>
        HttpResponse.json({
          enabled: true,
          available: true,
          state: 'connected',
          email: 'architect@example.com',
          plan_type: 'plus',
          subscription_active_until: '2026-04-01T00:00:00Z',
          reason: null,
        }),
      ),
      http.post('/api/auth/chatgpt', () =>
        HttpResponse.json({
          token: 'chatgpt-local-token',
          provider: 'chatgpt_local_codex',
          email: 'architect@example.com',
          plan_type: 'plus',
        }),
      ),
    )

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
      expect(screen.getByText(/architect@example.com/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /continue with chatgpt/i }))

    await waitFor(() => {
      expect(window.localStorage.getItem('n1hub_vault_token')).toBe('chatgpt-local-token')
      expect(router.push).toHaveBeenCalledWith('/vault')
    })
  })
})
