import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
})
