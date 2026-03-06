import { fireEvent, render, screen } from '@testing-library/react'
import ProjectTree from '@/components/projects/ProjectTree'
import type { ProjectTreeNode } from '@/types/project'

const tree: ProjectTreeNode[] = [
  {
    metadata: {
      capsule_id: 'capsule.project.root.v1',
      type: 'project',
      subtype: 'hub',
      status: 'active',
      semantic_hash: 'project-semantic-hash-tokenized-lineage-graph-proof-state',
      name: 'Root',
    },
    core_payload: { content_type: 'markdown', content: '# Root' },
    neuro_concentrate: {
      summary: 'Root project summary used for tree rendering tests in the component suite.',
      keywords: ['root', 'project', 'tree', 'capsule', 'graph'],
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
    children: [
      {
        metadata: {
          capsule_id: 'capsule.project.child.v1',
          type: 'project',
          subtype: 'hub',
          status: 'draft',
          semantic_hash: 'project-semantic-hash-tokenized-lineage-graph-proof-state',
          name: 'Child',
        },
        core_payload: { content_type: 'markdown', content: '# Child' },
        neuro_concentrate: {
          summary: 'Child project summary for nested tree rendering behavior and collapsing tests.',
          keywords: ['child', 'project', 'tree', 'capsule', 'graph'],
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
        recursive_layer: {
          links: [{ target_id: 'capsule.project.root.v1', relation_type: 'part_of' }],
        },
        integrity_sha3_512: 'b'.repeat(128),
        children: [],
      },
    ],
  },
]

describe('ProjectTree', () => {
  it('renders nested project nodes', () => {
    render(<ProjectTree tree={tree} />)

    expect(screen.getByText('Root')).toBeInTheDocument()
    expect(screen.getByText('Child')).toBeInTheDocument()
    expect(screen.getByText('(1)')).toBeInTheDocument()
  })

  it('supports expand and collapse interactions', () => {
    render(<ProjectTree tree={tree} />)

    const rootLink = screen.getByRole('link', { name: /Root/ })
    fireEvent.click(rootLink.parentElement as HTMLElement)

    expect(screen.queryByText('Child')).not.toBeInTheDocument()

    fireEvent.click(rootLink.parentElement as HTMLElement)
    expect(screen.getByText('Child')).toBeInTheDocument()
  })

  it('shows empty state when no tree nodes exist', () => {
    render(<ProjectTree tree={[]} />)
    expect(screen.getByText('No projects found.')).toBeInTheDocument()
  })
})
