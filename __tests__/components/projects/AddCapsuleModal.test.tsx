import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { vi } from 'vitest'
import AddCapsuleModal from '@/components/projects/AddCapsuleModal'
import { ToastProvider } from '@/contexts/ToastContext'
import { server } from '../../setup'
import type { SovereignCapsule } from '@/types/capsule'

const makeCapsule = (id: string, type: 'project' | 'concept' = 'concept'): SovereignCapsule => ({
  metadata: {
    capsule_id: id,
    type,
    subtype: type === 'project' ? 'hub' : 'atomic',
    status: 'active',
    semantic_hash: 'capsule-semantic-hash-tokenized-lineage-graph-proof-state',
    name: id,
  },
  core_payload: { content_type: 'markdown', content: `# ${id}` },
  neuro_concentrate: {
    summary: 'Capsule summary for modal tests with searchable content and link behavior coverage.',
    keywords: ['capsule', 'modal', 'project', 'link', 'test'],
    confidence_vector: {
      extraction: 1,
      synthesis: 1,
      linking: 1,
      provenance_coverage: 1,
      validation_score: 1,
      contradiction_pressure: 0,
    },
    semantic_hash: 'capsule-semantic-hash-tokenized-lineage-graph-proof-state',
  },
  recursive_layer: { links: [] },
  integrity_sha3_512: 'a'.repeat(128),
})

describe('AddCapsuleModal', () => {
  beforeEach(() => {
    window.localStorage.setItem('n1hub_vault_token', 'mock-token')
    server.use(
      http.get('/api/capsules', () => {
        return HttpResponse.json([
          makeCapsule('capsule.project.parent.v1', 'project'),
          makeCapsule('capsule.concept.alpha.v1'),
          makeCapsule('capsule.concept.beta.v1'),
        ])
      }),
    )
  })

  it('filters candidates via search and closes', async () => {
    const onClose = vi.fn()

    render(
      <ToastProvider>
        <AddCapsuleModal projectId="capsule.project.parent.v1" onClose={onClose} onAdded={vi.fn()} />
      </ToastProvider>,
    )

    await screen.findByText('capsule.concept.alpha.v1')

    fireEvent.change(screen.getByPlaceholderText('Search capsules...'), {
      target: { value: 'beta' },
    })

    await waitFor(() => {
      expect(screen.queryByText('capsule.concept.alpha.v1')).not.toBeInTheDocument()
      expect(screen.getByText('capsule.concept.beta.v1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('links selected capsule via PUT and triggers onAdded', async () => {
    const onAdded = vi.fn()

    server.use(
      http.put('/api/capsules/:id', () => {
        return HttpResponse.json({ ok: true }, { status: 200 })
      }),
    )

    render(
      <ToastProvider>
        <AddCapsuleModal projectId="capsule.project.parent.v1" onClose={vi.fn()} onAdded={onAdded} />
      </ToastProvider>,
    )

    fireEvent.click((await screen.findAllByRole('button', { name: 'Add' }))[0])

    await waitFor(() => {
      expect(onAdded).toHaveBeenCalledTimes(1)
    })
  })
})
