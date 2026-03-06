import type { CapsuleType, SovereignCapsule } from '@/types/capsule';

export type CapsuleGraphNodeData = {
  id: string;
  name: string;
  fullName: string;
  type: string;
  summary: string;
  val: number;
  color: string;
  originalColor: string;
};

export type CapsuleGraphLinkData = {
  source: string;
  target: string;
  name: string;
  color: string;
};

export type CapsuleGraphData = {
  nodes: CapsuleGraphNodeData[];
  links: CapsuleGraphLinkData[];
};

const DEFAULT_NODE_COLOR = '#94a3b8';
const DEFAULT_LINK_COLOR = '#475569';
const DEFAULT_SUMMARY = 'No summary available';

const TYPE_COLORS: Record<CapsuleType, string> = {
  foundation: '#fbbf24',
  concept: '#60a5fa',
  operations: '#34d399',
  physical_object: '#fb923c',
  project: '#a78bfa',
};

export const DEFAULT_GRAPH_DIMENSIONS = {
  width: 800,
  height: 600,
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function getCapsuleDisplayName(capsule: SovereignCapsule): string {
  const metadataName =
    typeof capsule.metadata.name === 'string'
      ? capsule.metadata.name.trim()
      : '';

  if (metadataName) return metadataName;

  const parts = capsule.metadata.capsule_id.split('.');
  return parts[parts.length - 2] || capsule.metadata.capsule_id;
}

function getNodeColor(type?: CapsuleType): string {
  if (!type) return DEFAULT_NODE_COLOR;
  return TYPE_COLORS[type] ?? DEFAULT_NODE_COLOR;
}

export function extractGraphEndpointId(endpoint: unknown): string | null {
  if (typeof endpoint === 'string' || typeof endpoint === 'number') {
    return String(endpoint);
  }

  if (endpoint && typeof endpoint === 'object' && 'id' in endpoint) {
    const maybeId = (endpoint as { id?: string | number }).id;
    return maybeId === undefined ? null : String(maybeId);
  }

  return null;
}

export function isIncidentLink(
  link: Pick<CapsuleGraphLinkData, 'source' | 'target'>,
  nodeId: string | null,
): boolean {
  if (!nodeId) return false;
  return (
    extractGraphEndpointId(link.source) === nodeId ||
    extractGraphEndpointId(link.target) === nodeId
  );
}

export function buildCapsuleGraphData(
  capsules: SovereignCapsule[],
): CapsuleGraphData {
  const linkCounts = new Map<string, number>();

  capsules.forEach((capsule) => {
    (capsule.recursive_layer?.links ?? []).forEach((link) => {
      const sourceId = capsule.metadata.capsule_id;
      linkCounts.set(sourceId, (linkCounts.get(sourceId) ?? 0) + 1);
      linkCounts.set(link.target_id, (linkCounts.get(link.target_id) ?? 0) + 1);
    });
  });

  const nodes: CapsuleGraphNodeData[] = capsules.map((capsule) => {
    const color = getNodeColor(capsule.metadata.type);
    const connections = linkCounts.get(capsule.metadata.capsule_id) ?? 0;
    const summary =
      typeof capsule.neuro_concentrate?.summary === 'string' &&
      capsule.neuro_concentrate.summary.trim().length > 0
        ? capsule.neuro_concentrate.summary.trim()
        : DEFAULT_SUMMARY;

    return {
      id: capsule.metadata.capsule_id,
      name: getCapsuleDisplayName(capsule),
      fullName: capsule.metadata.capsule_id,
      type: capsule.metadata.type || 'unknown',
      summary: truncateText(summary, 100),
      val: 5 + connections * 1.5 + (capsule.metadata.subtype === 'hub' ? 8 : 0),
      color,
      originalColor: color,
    };
  });

  const validNodeIds = new Set(nodes.map((node) => node.id));

  const links: CapsuleGraphLinkData[] = capsules.flatMap((capsule) =>
    (capsule.recursive_layer?.links ?? [])
      .filter((link) => validNodeIds.has(link.target_id))
      .map((link) => ({
        source: capsule.metadata.capsule_id,
        target: link.target_id,
        name: link.relation_type || 'link',
        color: DEFAULT_LINK_COLOR,
      })),
  );

  return { nodes, links };
}

export function buildCapsuleGraphTooltip(node: CapsuleGraphNodeData): string {
  return `
    <div style="background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 8px; max-width: 300px; color: #e2e8f0; font-family: ui-sans-serif, system-ui, sans-serif; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${escapeHtml(node.originalColor)}; margin-bottom: 4px;">${escapeHtml(node.type)}</div>
      <strong style="display: block; margin-bottom: 8px; font-size: 14px; word-break: break-all;">${escapeHtml(node.fullName)}</strong>
      <p style="font-size: 12px; color: #94a3b8; line-height: 1.4; margin: 0;">${escapeHtml(node.summary)}</p>
    </div>
  `;
}
