// @anchor arch:graph.runtime links=doc:projects.reference,doc:branching.real-dream-diff,doc:n1hub.readme note="Capsule graph runtime surface shared by project and vault graph views."
import type { CapsuleType, SovereignCapsule } from '@/types/capsule';

export type CapsuleGraphNodeData = {
  id: string;
  capsuleId: string;
  branch: string | null;
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
  weight: number;
};

export type CapsuleGraphData = {
  nodes: CapsuleGraphNodeData[];
  links: CapsuleGraphLinkData[];
};

export type BuildCapsuleGraphOptions = {
  activeBranch?: string | null;
  getBranchId?: ((capsule: SovereignCapsule) => string | null | undefined) | null;
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

function normalizeRelationType(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return 'link';
  return trimmed;
}

function getAggregatedLinkKey(sourceId: string, targetId: string, relationType: string): string {
  return `${sourceId}::${targetId}::${relationType}`;
}

type LinkFrequencyBucket = {
  sourceId: string;
  targetId: string;
  relationType: string;
  count: number;
};

type CapsuleGraphEntry = {
  capsule: SovereignCapsule;
  capsuleId: string;
  branch: string | null;
  nodeId: string;
};

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
  options: BuildCapsuleGraphOptions = {},
): CapsuleGraphData {
  const entries = capsules.map((capsule) => {
    const branchValue = options.getBranchId?.(capsule) ?? options.activeBranch ?? null;
    const branch =
      typeof branchValue === 'string' && branchValue.trim().length > 0
        ? branchValue.trim().toLowerCase()
        : null;
    const capsuleId = capsule.metadata.capsule_id;

    return {
      capsule,
      capsuleId,
      branch,
      nodeId: branch ? `${branch}:${capsuleId}` : capsuleId,
    } satisfies CapsuleGraphEntry;
  });
  const entriesByCapsuleId = new Map<string, CapsuleGraphEntry[]>();
  const linkCounts = new Map<string, number>();
  const aggregatedLinks = new Map<string, LinkFrequencyBucket>();
  const validNodeIds = new Set(entries.map((entry) => entry.nodeId));

  entries.forEach((entry) => {
    const existingEntries = entriesByCapsuleId.get(entry.capsuleId);
    if (existingEntries) {
      existingEntries.push(entry);
      return;
    }

    entriesByCapsuleId.set(entry.capsuleId, [entry]);
  });

  const resolveTargetNodeId = (sourceEntry: CapsuleGraphEntry, targetCapsuleId: string) => {
    const candidates = entriesByCapsuleId.get(targetCapsuleId);

    if (!candidates || candidates.length === 0) {
      return null;
    }

    if (sourceEntry.branch) {
      const sameBranchCandidate = candidates.find((candidate) => candidate.branch === sourceEntry.branch);
      if (sameBranchCandidate) {
        return sameBranchCandidate.nodeId;
      }
    }

    const branchlessCandidate = candidates.find((candidate) => candidate.branch === null);
    if (branchlessCandidate) {
      return branchlessCandidate.nodeId;
    }

    if (candidates.length === 1) {
      return candidates[0].nodeId;
    }

    return null;
  };

  entries.forEach((entry) => {
    (entry.capsule.recursive_layer?.links ?? []).forEach((link) => {
      const sourceId = entry.nodeId;
      const targetId = resolveTargetNodeId(entry, link.target_id);
      const relationType = normalizeRelationType(link.relation_type);

      if (!targetId) return;
      if (sourceId === targetId) return;
      if (!validNodeIds.has(targetId)) return;

      const key = getAggregatedLinkKey(sourceId, targetId, relationType);
      const existingBucket = aggregatedLinks.get(key);

      if (existingBucket) {
        existingBucket.count += 1;
      } else {
        aggregatedLinks.set(key, {
          sourceId,
          targetId,
          relationType,
          count: 1,
        });
      }

      linkCounts.set(sourceId, (linkCounts.get(sourceId) ?? 0) + 1);
      linkCounts.set(targetId, (linkCounts.get(targetId) ?? 0) + 1);
    });
  });

  const nodes: CapsuleGraphNodeData[] = entries.map((entry) => {
    const { capsule } = entry;
    const color = getNodeColor(capsule.metadata.type);
    const connections = linkCounts.get(entry.nodeId) ?? 0;
    const summary =
      typeof capsule.neuro_concentrate?.summary === 'string' &&
      capsule.neuro_concentrate.summary.trim().length > 0
        ? capsule.neuro_concentrate.summary.trim()
        : DEFAULT_SUMMARY;

    return {
      id: entry.nodeId,
      capsuleId: entry.capsuleId,
      branch: entry.branch,
      name: getCapsuleDisplayName(capsule),
      fullName: entry.capsuleId,
      type: capsule.metadata.type || 'unknown',
      summary: truncateText(summary, 100),
      val: 5 + connections * 1.5 + (capsule.metadata.subtype === 'hub' ? 8 : 0),
      color,
      originalColor: color,
    };
  });

  const links: CapsuleGraphLinkData[] = Array.from(aggregatedLinks.values())
    .filter((link) => validNodeIds.has(link.sourceId) && validNodeIds.has(link.targetId))
    .map((link) => ({
      source: link.sourceId,
      target: link.targetId,
      name: link.relationType,
      color: DEFAULT_LINK_COLOR,
      weight: link.count,
    }));

  return { nodes, links };
}

export function buildCapsuleGraphTooltip(node: CapsuleGraphNodeData): string {
  const showIdentifier = node.name !== node.fullName;

  return `
    <div style="background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 8px; max-width: 300px; color: #e2e8f0; font-family: ui-sans-serif, system-ui, sans-serif; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${escapeHtml(node.originalColor)}; margin-bottom: 4px;">${escapeHtml(node.type)}</div>
      <strong style="display: block; margin-bottom: 4px; font-size: 14px; word-break: break-word;">${escapeHtml(node.name)}</strong>
      ${showIdentifier ? `<div style="margin-bottom: 8px; font-size: 11px; color: #64748b; word-break: break-all;">${escapeHtml(node.fullName)}</div>` : ''}
      <p style="font-size: 12px; color: #94a3b8; line-height: 1.4; margin: 0;">${escapeHtml(node.summary)}</p>
    </div>
  `;
}
