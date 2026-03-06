import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import ProjectForm from '@/components/projects/ProjectForm'
import { ToastProvider } from '@/contexts/ToastContext'
import { useCapsuleStore } from '@/store/capsuleStore'
import type { ProjectCapsule } from '@/types/project'

const rootProject: ProjectCapsule = {
  metadata: {
    capsule_id: 'capsule.project.root.v1',
    type: 'project',
    subtype: 'hub',
    status: 'active',
    semantic_hash: 'project-semantic-hash-tokenized-lineage-graph-proof-state',
    name: 'Root',
    author: 'architect',
    version: '1.0.0',
  },
  core_payload: { content_type: 'markdown', content: '# Root' },
  neuro_concentrate: {
    summary:
      'Root summary text that remains sufficiently descriptive for form tests and hierarchy interactions in project workflows.',
    keywords: ['root', 'project', 'capsule', 'graph', 'hierarchy'],
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
}

const childProject: ProjectCapsule = {
  ...rootProject,
  metadata: {
    ...rootProject.metadata,
    capsule_id: 'capsule.project.child.v1',
    name: 'Child',
  },
  recursive_layer: {
    links: [{ target_id: 'capsule.project.root.v1', relation_type: 'part_of' }],
  },
}

describe('ProjectForm', () => {
  beforeEach(() => {
    useCapsuleStore.setState({
      capsules: [rootProject, childProject],
      isLoading: false,
      error: null,
      fetchCapsules: vi.fn(async () => undefined),
    })
  })

  it('shows cycle warning and disables submit for cyclic parent selection', () => {
    render(
      <ToastProvider>
        <ProjectForm initialData={rootProject} />
      </ToastProvider>,
    )

    fireEvent.change(screen.getByLabelText('Parent Project (optional)'), {
      target: { value: 'capsule.project.child.v1' },
    })

    expect(screen.getByText(/would create a cycle/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update Project' })).toBeDisabled()
  })
})
