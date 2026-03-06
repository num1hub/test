import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import ProjectCard from '@/components/projects/ProjectCard'
import type { ProjectCapsule } from '@/types/project'

const makeProject = (name?: string): ProjectCapsule => ({
  metadata: {
    capsule_id: 'capsule.project.tilesims.v1',
    type: 'project',
    subtype: 'hub',
    status: 'active',
    semantic_hash: 'project-semantic-hash-tokenized-lineage-graph-proof-state',
    name,
  },
  core_payload: {
    content_type: 'markdown',
    content: '# TileSims',
  },
  neuro_concentrate: {
    summary:
      'TileSims is a sovereign simulation project with a focused mission to connect capsule graph logic with generation and planning layers.',
    keywords: ['project', 'tilesims', 'graph', 'simulation', 'capsule'],
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

describe('ProjectCard', () => {
  it('renders name, status, summary, and child count', () => {
    render(<ProjectCard project={makeProject('TileSims')} childCount={2} />)

    expect(screen.getByText('TileSims')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText(/2 sub-projects/)).toBeInTheDocument()
    expect(screen.getByText(/TileSims is a sovereign simulation project/i)).toBeInTheDocument()
  })

  it('falls back to capsule_id when name is absent', () => {
    render(<ProjectCard project={makeProject(undefined)} />)
    expect(screen.getAllByText('capsule.project.tilesims.v1').length).toBeGreaterThan(0)
  })

  it('supports selection toggling', () => {
    const onToggleSelect = vi.fn()
    render(<ProjectCard project={makeProject('TileSims')} selected onToggleSelect={onToggleSelect} />)

    fireEvent.click(screen.getByLabelText('Select TileSims'))
    expect(onToggleSelect).toHaveBeenCalledTimes(1)
  })
})
