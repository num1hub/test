import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HttpResponse, http } from 'msw'
import LoginPage from '@/app/login/page'
import PrivateOwnerLoginRoute from '@/app/architect-gate/[[...slug]]/page'
import PrivateOwnerLoginPage from '@/components/auth/PrivateOwnerLoginPage'
import { mockRedirect, mockRouter, server } from '../setup'

describe('LoginPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('redirects /login back to the locked root entry', async () => {
    await LoginPage()

    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('renders the private owner login form', () => {
    render(<PrivateOwnerLoginPage />)

    expect(screen.getByText('Restricted N1Hub login')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('egor-n1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('N1X1')).toBeInTheDocument()
  })

  it('redirects invalid architect-gate slugs back to root', async () => {
    await PrivateOwnerLoginRoute({
      params: Promise.resolve({ slug: ['wrong-secret'] }),
    })

    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('shows error on invalid credentials', async () => {
    server.use(
      http.post('/api/auth', () =>
        HttpResponse.json({ error: 'Invalid credentials.' }, { status: 401 }),
      ),
    )

    render(<PrivateOwnerLoginPage />)

    fireEvent.change(screen.getByPlaceholderText('egor-n1'), { target: { value: 'egor-n1' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'), {
      target: { value: 'wrong-pass' },
    })
    fireEvent.change(screen.getByPlaceholderText('N1X1'), { target: { value: 'n1x1' } })
    fireEvent.click(screen.getByRole('button', { name: /unlock n1hub/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials.')).toBeInTheDocument()
    })
    expect(window.localStorage.getItem('n1hub_vault_token')).toBeNull()
  })

  it('stores token and redirects on success', async () => {
    server.use(
      http.post('/api/auth', () => HttpResponse.json({ token: 'mock-token' })),
    )

    render(<PrivateOwnerLoginPage />)

    fireEvent.change(screen.getByPlaceholderText('egor-n1'), { target: { value: 'egor-n1' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'), {
      target: { value: 'correct-pass' },
    })
    fireEvent.change(screen.getByPlaceholderText('N1X1'), { target: { value: 'n1x1' } })
    fireEvent.click(screen.getByRole('button', { name: /unlock n1hub/i }))

    await waitFor(() => {
      expect(window.localStorage.getItem('n1hub_vault_token')).toBe('mock-token')
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
  })
})
