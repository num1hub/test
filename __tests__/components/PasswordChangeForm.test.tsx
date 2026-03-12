import { render, screen } from '@testing-library/react'
import PasswordChangeForm from '@/components/PasswordChangeForm'
import { ToastProvider } from '@/contexts/ToastContext'

describe('PasswordChangeForm', () => {
  it('shows deploy-backed auth guidance for Hobby mode', () => {
    render(
      <ToastProvider>
        <PasswordChangeForm />
      </ToastProvider>,
    )

    expect(screen.getByText('Deployment-backed auth note')).toBeInTheDocument()
    expect(screen.getByText(/VAULT_PASSWORD/)).toBeInTheDocument()
    expect(screen.getByText(/N1HUB_ACCESS_CODE/)).toBeInTheDocument()
  })
})
