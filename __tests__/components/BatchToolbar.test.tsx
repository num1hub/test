import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import BatchToolbar from '@/components/BatchToolbar'
import { ToastProvider } from '@/contexts/ToastContext'
import type { SovereignCapsule } from '@/types/capsule'

const mockCapsules = [
  { metadata: { capsule_id: 'c1' } },
  { metadata: { capsule_id: 'c2' } },
] as unknown as SovereignCapsule[]

describe('BatchToolbar', () => {
  it('renders nothing if no items are selected', () => {
    render(
      <ToastProvider>
        <BatchToolbar
          selectedIds={new Set()}
          allVisibleCapsules={mockCapsules}
          onClearSelection={vi.fn()}
          onSelectAll={vi.fn()}
          onBatchDeleteComplete={vi.fn()}
        />
      </ToastProvider>,
    )

    expect(screen.queryByText(/Selected/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument()
  })

  it('renders controls and triggers select-all action', () => {
    const onSelectAll = vi.fn()

    render(
      <ToastProvider>
        <BatchToolbar
          selectedIds={new Set(['c1'])}
          allVisibleCapsules={mockCapsules}
          onClearSelection={vi.fn()}
          onSelectAll={onSelectAll}
          onBatchDeleteComplete={vi.fn()}
        />
      </ToastProvider>,
    )

    expect(screen.getByText('1 Selected')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Select All Visible'))
    expect(onSelectAll).toHaveBeenCalledTimes(1)
  })
})
