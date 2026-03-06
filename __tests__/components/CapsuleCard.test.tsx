import { render, screen } from '@testing-library/react'
import CapsuleCard from '@/components/CapsuleCard'
import { SovereignCapsule } from '@/types/capsule'

const mockCapsule = {
  metadata: {
    capsule_id: 'capsule.test.v1',
    type: 'concept',
    status: 'active',
    subtype: 'atomic',
    semantic_hash: 'test-semantic-hash-string-here'
  },
  core_payload: {},
  neuro_concentrate: {
    summary: 'This is a test summary for the capsule card.'
  },
  recursive_layer: { links: [] },
  integrity_sha3_512: 'hash'
} satisfies SovereignCapsule

describe('CapsuleCard', () => {
  it('renders capsule details correctly', () => {
    render(<CapsuleCard capsule={mockCapsule} />)
    
    expect(screen.getByText('capsule.test.v1')).toBeInTheDocument()
    expect(screen.getByText('concept')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('This is a test summary for the capsule card.')).toBeInTheDocument()
    // Checks that long hashes are truncated
    expect(screen.getByText('test-semantic-ha...')).toBeInTheDocument()
  })

  it('links to the correct detail page', () => {
    render(<CapsuleCard capsule={mockCapsule} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/vault/capsule/capsule.test.v1')
  })
})
