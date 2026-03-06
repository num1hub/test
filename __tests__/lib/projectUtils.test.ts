import {
  buildProjectTree,
  deriveDisplayName,
  getAllProjects,
  getProjectChildren,
  getProjectParent,
  wouldCreateCycle,
} from '@/lib/projectUtils'
import type { SovereignCapsule } from '@/types/capsule'

const makeProject = (
  id: string,
  parentId?: string,
): SovereignCapsule => ({
  metadata: {
    capsule_id: id,
    type: 'project',
    subtype: 'hub',
    status: 'active',
    semantic_hash: 'project-semantic-hash-tokenized-lineage-graph-proof-state',
  },
  core_payload: { content_type: 'markdown', content: `# ${id}` },
  neuro_concentrate: {
    summary:
      'Project summary text with enough language to remain meaningful for tests and representative of graph behavior.',
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
  recursive_layer: {
    links: parentId
      ? [{ target_id: parentId, relation_type: 'part_of' }]
      : [],
  },
  integrity_sha3_512: 'a'.repeat(128),
})

const makeAtomic = (id: string, parentId: string): SovereignCapsule => ({
  metadata: {
    capsule_id: id,
    type: 'concept',
    subtype: 'atomic',
    status: 'active',
    semantic_hash: 'atomic-semantic-hash-tokenized-lineage-graph-proof-state',
  },
  core_payload: { content_type: 'markdown', content: `# ${id}` },
  neuro_concentrate: {
    summary:
      'Atomic summary text with enough detail to satisfy test fixture expectations for capsule validity checks.',
    keywords: ['atomic', 'capsule', 'project', 'graph', 'link'],
    confidence_vector: {
      extraction: 1,
      synthesis: 1,
      linking: 1,
      provenance_coverage: 1,
      validation_score: 1,
      contradiction_pressure: 0,
    },
    semantic_hash: 'atomic-semantic-hash-tokenized-lineage-graph-proof-state',
  },
  recursive_layer: {
    links: [{ target_id: parentId, relation_type: 'part_of' }],
  },
  integrity_sha3_512: 'b'.repeat(128),
})

describe('projectUtils', () => {
  it('getAllProjects returns only project hubs', () => {
    const capsules = [
      makeProject('capsule.project.root.v1'),
      makeAtomic('capsule.concept.atom.v1', 'capsule.project.root.v1'),
    ]

    const projects = getAllProjects(capsules)
    expect(projects).toHaveLength(1)
    expect(projects[0].metadata.capsule_id).toBe('capsule.project.root.v1')
  })

  it('buildProjectTree handles nested hierarchy and roots', () => {
    const root = makeProject('capsule.project.root.v1')
    const child = makeProject('capsule.project.child.v1', 'capsule.project.root.v1')
    const grandchild = makeProject('capsule.project.grandchild.v1', 'capsule.project.child.v1')
    const orphan = makeProject('capsule.project.orphan.v1', 'capsule.project.missing.v1')

    const tree = buildProjectTree([root, child, grandchild, orphan])
    expect(tree).toHaveLength(2)

    const rootNode = tree.find((node) => node.metadata.capsule_id === root.metadata.capsule_id)
    expect(rootNode?.children).toHaveLength(1)
    expect(rootNode?.children[0].metadata.capsule_id).toBe(child.metadata.capsule_id)
    expect(rootNode?.children[0].children[0].metadata.capsule_id).toBe(grandchild.metadata.capsule_id)

    const orphanNode = tree.find((node) => node.metadata.capsule_id === orphan.metadata.capsule_id)
    expect(orphanNode).toBeDefined()
  })

  it('getProjectChildren and getProjectParent resolve project links', () => {
    const root = makeProject('capsule.project.root.v1')
    const child = makeProject('capsule.project.child.v1', 'capsule.project.root.v1')
    const atom = makeAtomic('capsule.concept.atom.v1', 'capsule.project.root.v1')

    const capsules = [root, child, atom]
    const children = getProjectChildren('capsule.project.root.v1', capsules)
    expect(children.map((capsule) => capsule.metadata.capsule_id).sort()).toEqual(
      ['capsule.concept.atom.v1', 'capsule.project.child.v1'],
    )

    const parent = getProjectParent('capsule.project.child.v1', capsules)
    expect(parent?.metadata.capsule_id).toBe('capsule.project.root.v1')
  })

  it('wouldCreateCycle detects direct and indirect cycles', () => {
    const root = makeProject('capsule.project.root.v1')
    const child = makeProject('capsule.project.child.v1', 'capsule.project.root.v1')
    const grandchild = makeProject('capsule.project.grandchild.v1', 'capsule.project.child.v1')

    const capsules = [root, child, grandchild]

    expect(wouldCreateCycle(capsules, 'capsule.project.root.v1', 'capsule.project.root.v1')).toBe(true)
    expect(wouldCreateCycle(capsules, 'capsule.project.root.v1', 'capsule.project.child.v1')).toBe(true)
    expect(wouldCreateCycle(capsules, 'capsule.project.root.v1', 'capsule.project.grandchild.v1')).toBe(
      true,
    )
    expect(wouldCreateCycle(capsules, 'capsule.project.grandchild.v1', 'capsule.project.root.v1')).toBe(
      false,
    )
  })

  it('deriveDisplayName converts canonical IDs', () => {
    expect(deriveDisplayName('capsule.project.tilesims.v1')).toBe('Tilesims')
    expect(deriveDisplayName('capsule.project.n1hub-v0.v1')).toBe('N1hub V0')
    expect(deriveDisplayName('custom-id')).toBe('Custom Id')
  })
})
