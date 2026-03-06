import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useRouter } from 'next/navigation'
import ProjectsPage from '@/app/projects/page'
import { ToastProvider } from '@/contexts/ToastContext'
import { useCapsuleStore } from '@/store/capsuleStore'
import type { SovereignCapsule } from '@/types/capsule'

const makeProject = (id: string, name: string): SovereignCapsule => ({
  metadata: {
    capsule_id: id,
    type: 'project',
    subtype: 'hub',
    status: 'active',
    name,
    semantic_hash: 'project-semantic-hash-tokenized-lineage-graph-proof-state',
  },
  core_payload: { content_type: 'markdown', content: `# ${name}` },
  neuro_concentrate: {
    summary:
      'Project summary text designed for UI tests and meaningful search behavior in dashboard scenarios.',
    keywords: ['project', 'capsule', 'graph', 'hierarchy', 'n1hub'],
    confidence_vector: {
      extraction: 1,
      synthesis: 1,
      linking: 1,
      provenance_coverage: 1,
      validation_score: 1,
      contradiction_pressure: 0,
    },
    semantic_hash: 'project-semantic-hash-tokenized-lineage-graph-proof-state',
  },
  recursive_layer: { links: [] },
  integrity_sha3_512: 'a'.repeat(128),
})

describe('ProjectsPage', () => {
  beforeEach(() => {
    useCapsuleStore.setState({ capsules: [], isLoading: false, error: null })
  })

  it('redirects to login if token is missing', async () => {
    const router = useRouter()

    render(
      <ToastProvider>
        <ProjectsPage />
      </ToastProvider>,
    )

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/login')
    })
  })

  it('renders project cards and supports search', async () => {
    window.localStorage.setItem('n1hub_vault_token', 'mock-token')

    useCapsuleStore.setState({
      capsules: [
        makeProject('capsule.project.tilesims.v1', 'TileSims'),
        makeProject('capsule.project.n1hub-v0.v1', 'N1Hub V0'),
      ],
      isLoading: false,
      error: null,
      fetchCapsules: vi.fn(async () => undefined),
    })

    render(
      <ToastProvider>
        <ProjectsPage />
      </ToastProvider>,
    )

    expect(screen.getByText('TileSims')).toBeInTheDocument()
    expect(screen.getByText('N1Hub V0')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(/Search project names/i), {
      target: { value: 'tilesims' },
    })

    await waitFor(() => {
      expect(screen.getByText('TileSims')).toBeInTheDocument()
      expect(screen.queryByText('N1Hub V0')).not.toBeInTheDocument()
    })
  })

  it('toggles to tree view', async () => {
    window.localStorage.setItem('n1hub_vault_token', 'mock-token')

    useCapsuleStore.setState({
      capsules: [makeProject('capsule.project.tilesims.v1', 'TileSims')],
      isLoading: false,
      error: null,
      fetchCapsules: vi.fn(async () => undefined),
    })

    render(
      <ToastProvider>
        <ProjectsPage />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tree' }))
    expect(screen.getByText('TileSims')).toBeInTheDocument()
  })
})
