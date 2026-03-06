import { render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import ActivityLog from '@/components/ActivityLog'
import { ToastProvider } from '@/contexts/ToastContext'
import { server } from '../setup'

describe('ActivityLog', () => {
  it('fetches and displays logs', async () => {
    window.localStorage.setItem('n1hub_vault_token', 'mock')

    server.use(
      http.get('/api/activity', () =>
        HttpResponse.json([
          {
            id: '1',
            timestamp: new Date().toISOString(),
            action: 'create',
            details: { capsule_id: 'new.v1' },
          },
        ]),
      ),
    )

    render(
      <ToastProvider>
        <ActivityLog />
      </ToastProvider>,
    )

    expect(screen.getByText('Loading telemetry...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/create/i)).toBeInTheDocument()
      expect(screen.getByText('ID: new.v1')).toBeInTheDocument()
    })
  })
})
