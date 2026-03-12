import {
  buildCapsuleGraphData,
  buildCapsuleGraphTooltip,
  extractGraphEndpointId,
  isIncidentLink,
} from '@/lib/graph/capsuleGraph'
import type { SovereignCapsule } from '@/types/capsule'

const makeCapsule = (
  id: string,
  type: SovereignCapsule['metadata']['type'],
  options?: {
    name?: string
    subtype?: SovereignCapsule['metadata']['subtype']
    summary?: string
    links?: Array<{ target_id: string; relation_type?: string }>
  },
): SovereignCapsule => ({
  metadata: {
    capsule_id: id,
    type,
    subtype: options?.subtype ?? 'atomic',
    status: 'sovereign',
    name: options?.name,
    semantic_hash: 'capsule-graph-refactor-safety-topology-proof-core-state',
  },
  core_payload: {
    content_type: 'markdown',
    content: `# ${id}`,
  },
  neuro_concentrate: {
    summary: options?.summary,
    confidence_vector: {
      extraction: 1,
      synthesis: 1,
      linking: 1,
      provenance_coverage: 1,
      validation_score: 1,
      contradiction_pressure: 0,
    },
    semantic_hash: 'capsule-graph-refactor-safety-topology-proof-core-state',
  },
  recursive_layer: {
    links: options?.links ?? [],
  },
  integrity_sha3_512: 'a'.repeat(128),
})

describe('lib/graph/capsuleGraph.ts', () => {
  it('builds nodes and resolves link-derived connection weights', () => {
    const foundation = makeCapsule('capsule.foundation.core.v1', 'foundation', {
      name: 'Core',
      subtype: 'hub',
      summary: 'Core capsule summary.',
      links: [{ target_id: 'capsule.concept.map.v1', relation_type: 'references' }],
    })
    const concept = makeCapsule('capsule.concept.map.v1', 'concept', {
      summary: 'Concept capsule summary.',
    })

    const graphData = buildCapsuleGraphData([foundation, concept])
    expect(graphData.nodes).toHaveLength(2)
    expect(graphData.links).toHaveLength(1)

    const coreNode = graphData.nodes.find((node) => node.id === foundation.metadata.capsule_id)
    expect(coreNode).toBeDefined()
    expect(coreNode?.name).toBe('Core')
    expect(coreNode?.color).toBe('#d4b15a')
    expect(coreNode?.paletteKey).toBe('foundation')
    expect(coreNode?.paletteLabel).toBe('Foundation')
    expect(coreNode?.paletteTone).toBe('Gold')
    expect(coreNode?.paletteSigil).toBe('FD')
    expect(coreNode?.paletteRankLabel).toBe('Capsule Surface')
    expect(coreNode?.paletteMotif).toBe('Vault pulse')
    expect(coreNode?.paletteShape).toBe('orbit')
    expect(coreNode?.paletteSilhouette).toBe('circle')
    expect(coreNode?.paletteHeroMark).toBe('neutral')
    expect(coreNode?.paletteHierarchyDepth).toBe(1)
    expect(coreNode?.paletteMemoryCue).toBe('neutral capsule signature')
    expect(coreNode?.presenceLabel).toBe('Hub Surface')
    expect(coreNode?.presenceTier).toBe('hub')
    expect(coreNode?.presenceScale).toBe(1.11)
    expect(coreNode?.connectionCount).toBe(1)
    expect(coreNode?.faceTag).toBe('COR')
    expect(coreNode?.faceGlyph).toBeDefined()
    expect(coreNode?.faceRingCount).toBeGreaterThanOrEqual(1)
    expect(coreNode?.faceConstellation.length).toBeGreaterThanOrEqual(3)
    expect(coreNode?.val).toBeCloseTo(16.12)
    expect(graphData.links[0]?.color).toBe('#d4b15a')
  })

  it('drops links pointing outside the visible graph', () => {
    const capsule = makeCapsule('capsule.concept.local.v1', 'concept', {
      links: [{ target_id: 'capsule.concept.missing.v1', relation_type: 'references' }],
    })

    const graphData = buildCapsuleGraphData([capsule])
    expect(graphData.links).toEqual([])
  })

  it('escapes tooltip HTML content to avoid injection', () => {
    const tooltip = buildCapsuleGraphTooltip({
      id: 'capsule.concept.test.v1',
      capsuleId: 'capsule.concept.test.v1',
      branch: null,
      name: 'Test',
      fullName: 'capsule.concept.test.v1',
      type: '<script>alert(1)</script>',
      subtype: 'atomic',
      summary: 'summary with <b>unsafe</b> HTML',
      val: 5,
      paletteKey: 'concept',
      paletteLabel: 'Concept',
      paletteTone: 'Blue',
      paletteSigil: 'CN',
      paletteRankLabel: 'Capsule Surface',
      paletteMotif: 'Vault pulse',
      paletteShape: 'orbit',
      paletteSilhouette: 'circle',
      paletteHeroMark: 'neutral',
      paletteHierarchyDepth: 1,
      paletteMemoryCue: 'neutral capsule signature',
      presenceLabel: 'Capsule Surface',
      presenceTier: 'capsule',
      presenceScale: 1,
      connectionCount: 0,
      faceTag: 'TES',
      faceGlyph: 'diamond',
      faceRingCount: 2,
      faceBandMask: [true, false, true],
      faceConstellation: [{ x: 0.12, y: -0.24, r: 0.08, opacity: 0.62 }],
      color: '#60a5fa',
      originalColor: '#60a5fa"><script>alert(1)</script>',
    })

    expect(tooltip).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(tooltip).toContain('&lt;b&gt;unsafe&lt;/b&gt;')
    expect(tooltip).toContain('Face TES')
    expect(tooltip).not.toContain('<script>')
  })

  it('extracts endpoint ids and evaluates incident links', () => {
    expect(extractGraphEndpointId('capsule.a')).toBe('capsule.a')
    expect(extractGraphEndpointId({ id: 'capsule.b' })).toBe('capsule.b')
    expect(extractGraphEndpointId({ nope: 'x' })).toBeNull()

    expect(
      isIncidentLink(
        { source: 'capsule.a', target: 'capsule.b' },
        'capsule.a',
      ),
    ).toBe(true)
    expect(
      isIncidentLink(
        { source: 'capsule.a', target: { id: 'capsule.b' } as never },
        'capsule.c',
      ),
    ).toBe(false)
  })
})
