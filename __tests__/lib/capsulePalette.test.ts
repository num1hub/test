import { resolveCapsulePalette, withAlpha } from '@/lib/capsulePalette'

describe('lib/capsulePalette.ts', () => {
  it('maps CapsuleOS foundation surfaces into distinct visual families', () => {
    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.foundation.capsuleos.v1',
        type: 'foundation',
      }),
    ).toMatchObject({
      key: 'capsuleos-core',
      label: 'CapsuleOS Core',
      tone: 'Brass Gold',
      sigil: 'OS',
      rankLabel: 'Constitutional Axis',
      silhouette: 'circle',
      heroMark: 'axis',
      hierarchyDepth: 4,
      motif: 'Sovereign orbit',
      shape: 'orbit',
      accent: '#d8b35a',
    })

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.foundation.capsuleos.16-gates.v1',
        type: 'foundation',
      }),
    ).toMatchObject({
      key: 'capsuleos-gates',
      label: 'Validation Gates',
      tone: 'Ember',
      sigil: 'GT',
      rankLabel: 'Gate Surface',
      silhouette: 'octagon',
      heroMark: 'gates',
      hierarchyDepth: 4,
      motif: 'Gate teeth',
      shape: 'gates',
      accent: '#d87a5f',
    })

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.foundation.capsuleos-schema.v1',
        type: 'foundation',
      }),
    ).toMatchObject({
      key: 'capsuleos-law',
      label: 'CapsuleOS Law',
      tone: 'Archive Gold',
      sigil: 'LW',
      rankLabel: 'Law Surface',
      silhouette: 'hex',
      heroMark: 'law',
      hierarchyDepth: 4,
      motif: 'Double law ring',
      shape: 'double-ring',
      accent: '#e0c57a',
    })
  })

  it('keeps major runtime families on distinct palette tracks', () => {
    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.foundation.workspace.v1',
        type: 'foundation',
      }).key,
    ).toBe('workspace')

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.foundation.symphony.v1',
        type: 'foundation',
      }).key,
    ).toBe('symphony')

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.concept.generative-ai-tile.v1',
        type: 'concept',
      }),
    ).toMatchObject({
      key: 'spatial',
      label: 'Spatial',
      tone: 'Ceramic Aqua',
      sigil: 'SP',
      rankLabel: 'Spatial Surface',
      silhouette: 'diamond',
      heroMark: 'spatial',
      motif: 'Spatial grid',
      shape: 'grid',
      accent: '#75b9c6',
    })
  })

  it('reduces generic foundation collapse for major vault families', () => {
    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.foundation.n1hub.v1',
        type: 'foundation',
      }),
    ).toMatchObject({
      key: 'n1hub',
      sigil: 'NH',
      rankLabel: 'Habitat Axis',
      silhouette: 'circle',
      heroMark: 'world',
      motif: 'Habitat constellation',
      shape: 'constellation',
    })

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.foundation.capsule-graph-maintenance.v1',
        type: 'foundation',
      }),
    ).toMatchObject({
      key: 'graph-maintenance',
      sigil: 'CG',
      rankLabel: 'Maintenance Surface',
      silhouette: 'square',
      heroMark: 'architecture',
      motif: 'Maintenance mesh',
      shape: 'grid',
    })

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.foundation.key-agents.v1',
        type: 'foundation',
      }),
    ).toMatchObject({
      key: 'key-agents',
      sigil: 'KA',
      rankLabel: 'Lane Surface',
      silhouette: 'hex',
      heroMark: 'interface',
      motif: 'Lane roster',
      shape: 'lanes',
    })

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.foundation.ai-friendly-engineering.v1',
        type: 'foundation',
      }),
    ).toMatchObject({
      key: 'architecture',
      sigil: 'AR',
      rankLabel: 'Architecture Surface',
      silhouette: 'hex',
      motif: 'Scaffold frame',
      shape: 'frame',
    })

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.foundation.api-gateway.v1',
        type: 'foundation',
      }),
    ).toMatchObject({
      key: 'integration',
      sigil: 'IX',
      rankLabel: 'Boundary Surface',
      silhouette: 'diamond',
      motif: 'Boundary diamond',
      shape: 'diamond',
    })

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.foundation.capsule-generation-protocol.v1',
        type: 'foundation',
      }),
    ).toMatchObject({
      key: 'a2c',
      sigil: 'A2',
      rankLabel: 'Refinery Surface',
      silhouette: 'diamond',
      motif: 'Refinery diamond',
      shape: 'diamond',
    })
  })

  it('covers cross-vault families beyond foundation defaults', () => {
    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.person.egor-n1.v1',
        type: 'concept',
      }),
    ).toMatchObject({
      key: 'identity',
      sigil: 'ID',
      motif: 'Identity spine',
      shape: 'spine',
    })

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.project.deepmine.v1',
        type: 'project',
      }),
    ).toMatchObject({
      key: 'deepmine',
      sigil: 'DM',
      motif: 'Excavation strata',
      shape: 'strata',
    })

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.foundation.to-dig-deep.v1',
        type: 'foundation',
      }),
    ).toMatchObject({
      key: 'origin',
      sigil: 'OR',
      motif: 'Compass crosshair',
      shape: 'compass',
    })

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.project.n1hub-v0.v1',
        type: 'project',
      }),
    ).toMatchObject({
      key: 'n1hub',
      sigil: 'NH',
      motif: 'Habitat constellation',
      shape: 'constellation',
    })

    expect(
      resolveCapsulePalette({
        capsule_id: 'capsule.operations.vault-steward.plan.v1',
        type: 'operations',
      }),
    ).toMatchObject({
      key: 'runtime',
      sigil: 'BG',
      motif: 'Service wave',
      shape: 'wave',
    })
  })

  it('builds rgba variants from a hex accent', () => {
    expect(withAlpha('#d8b35a', 0.5)).toBe('rgba(216, 179, 90, 0.5)')
  })
})
