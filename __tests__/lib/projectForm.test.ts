import {
  buildProjectPayload,
  buildProjectSemanticHash,
  ensureProjectId,
  extractExistingParentId,
  projectFormSchema,
  type ProjectFormValues,
} from '@/lib/projects/projectForm'
import type { ProjectCapsule } from '@/types/project'

const initialProject: ProjectCapsule = {
  metadata: {
    capsule_id: 'capsule.project.tilesims.v1',
    version: '1.0.0',
    status: 'active',
    type: 'project',
    subtype: 'hub',
    author: 'architect',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-02T00:00:00.000Z',
    name: 'TileSims',
    semantic_hash: 'tilesims-project-hub-n1hub-capsuleos-sovereign-knowledge-graph',
  },
  core_payload: {
    content_type: 'markdown',
    content: '# TileSims',
  },
  neuro_concentrate: {
    summary:
      'TileSims project summary text that remains descriptive enough for tests and representative of current project content.',
    keywords: ['tilesims', 'project', 'capsule', 'graph', 'hierarchy'],
    confidence_vector: {
      extraction: 1,
      synthesis: 1,
      linking: 0.95,
      provenance_coverage: 0.9,
      validation_score: 1,
      contradiction_pressure: 0,
    },
    semantic_hash: 'tilesims-project-hub-n1hub-capsuleos-sovereign-knowledge-graph',
  },
  recursive_layer: {
    links: [
      { target_id: 'capsule.project.root.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.workspace.v1', relation_type: 'references' },
    ],
  },
  integrity_sha3_512: 'a'.repeat(128),
}

const validValues: ProjectFormValues = {
  name: 'TileSims',
  capsuleId: '',
  status: 'active',
  author: 'architect',
  summary:
    'TileSims is a sovereign project capsule used in tests to verify project form validation, summary length constraints, parent link handling, semantic hash generation, and payload construction across the repository cleanup refactor. The text intentionally spans enough words to match the production rule that project summaries must be substantial, self-contained, and informative. It describes purpose, hierarchy, execution, and graph semantics so the validation layer is exercised against realistic author input rather than a minimal synthetic string.',
  keywords: 'tilesims, project, capsule, graph, hierarchy',
  parentId: 'capsule.project.root.v1',
}

describe('projectForm helpers', () => {
  it('normalizes freeform names into canonical project IDs', () => {
    expect(ensureProjectId('TileSims V2')).toBe('capsule.project.tilesims-v2.v1')
    expect(ensureProjectId('capsule.project.ready.v3')).toBe('capsule.project.ready.v3')
  })

  it('creates semantic hashes with exactly eight tokens', () => {
    const hash = buildProjectSemanticHash('TileSims', 'capsule.project.tilesims.v1')
    expect(hash.split('-')).toHaveLength(8)
  })

  it('extracts an existing parent project from recursive links', () => {
    expect(extractExistingParentId(initialProject)).toBe('capsule.project.root.v1')
    expect(extractExistingParentId()).toBe('')
  })

  it('validates the form data for summary and keywords', () => {
    expect(projectFormSchema.safeParse(validValues).success).toBe(true)

    const invalid = projectFormSchema.safeParse({
      ...validValues,
      summary: 'too short',
      keywords: 'one, two',
    })

    expect(invalid.success).toBe(false)
  })

  it('builds a payload that preserves non-hierarchy links and updates parent links', () => {
    const payload = buildProjectPayload({
      initialData: initialProject,
      values: {
        ...validValues,
        parentId: 'capsule.project.workspace.v1',
      },
      normalizedCapsuleId: 'capsule.project.tilesims.v1',
    })

    expect(payload.metadata.capsule_id).toBe('capsule.project.tilesims.v1')
    expect(payload.metadata.type).toBe('project')
    expect(payload.recursive_layer.links ?? []).toContainEqual({
      target_id: 'capsule.project.workspace.v1',
      relation_type: 'part_of',
    })
    expect(payload.recursive_layer.links ?? []).toContainEqual({
      target_id: 'capsule.foundation.workspace.v1',
      relation_type: 'references',
    })
    expect(
      (payload.recursive_layer.links ?? []).filter((link) => link.relation_type === 'part_of'),
    ).toHaveLength(1)
  })
})
