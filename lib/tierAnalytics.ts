import type { DiffResult } from '@/contracts/diff';
import { coerceCapsuleTier } from '@/lib/capsuleTier';
import type { CapsuleTier, SovereignCapsule } from '@/types/capsule';
import { isProject } from '@/types/project';

export type TierCounts = Record<CapsuleTier, number>;

export interface ProjectTierHeatmapRow {
  projectId: string;
  projectName: string;
  counts: TierCounts;
  total: number;
}

export interface DiffTierTransition {
  capsuleId: string;
  summary: string;
  capsuleType?: string;
  fromTier: CapsuleTier | null;
  toTier: CapsuleTier | null;
  direction: 'elevated' | 'deferred' | 'assigned' | 'cleared';
}

export interface DiffTierInsights {
  addedCounts: TierCounts;
  changedSurfaceCounts: TierCounts;
  incomingCounts: TierCounts;
  outgoingCounts: TierCounts;
  transitions: DiffTierTransition[];
  elevatedCount: number;
  deferredCount: number;
  assignedCount: number;
  clearedCount: number;
}

export function emptyTierCounts(): TierCounts {
  return { 1: 0, 2: 0, 3: 0, 4: 0 };
}

export function countCapsulesByTier(capsules: SovereignCapsule[]): TierCounts {
  const counts = emptyTierCounts();

  for (const capsule of capsules) {
    const tier = capsule.metadata.tier;
    if (tier === 1 || tier === 2 || tier === 3 || tier === 4) {
      counts[tier] += 1;
    }
  }

  return counts;
}

function getPartOfParents(capsule: SovereignCapsule): string[] {
  return (capsule.recursive_layer?.links ?? [])
    .filter((link) => link.relation_type === 'part_of' && typeof link.target_id === 'string')
    .map((link) => link.target_id)
    .sort((left, right) => left.localeCompare(right));
}

export function buildProjectTierHeatmap(capsules: SovereignCapsule[]): ProjectTierHeatmapRow[] {
  const byId = new Map(capsules.map((capsule) => [capsule.metadata.capsule_id, capsule]));
  const memo = new Map<string, string | null>();

  const resolveRootProjectId = (capsuleId: string, seen: Set<string> = new Set()): string | null => {
    if (memo.has(capsuleId)) return memo.get(capsuleId) ?? null;
    if (seen.has(capsuleId)) return null;

    const capsule = byId.get(capsuleId);
    if (!capsule) return null;

    seen.add(capsuleId);

    let rootProjectId: string | null = null;
    const parentIds = getPartOfParents(capsule);

    if (isProject(capsule)) {
      const parentProjectId = parentIds.find((parentId) => {
        const parent = byId.get(parentId);
        return parent ? isProject(parent) : false;
      });
      rootProjectId = parentProjectId
        ? resolveRootProjectId(parentProjectId, seen) ?? capsuleId
        : capsuleId;
    } else {
      for (const parentId of parentIds) {
        const parentRoot = resolveRootProjectId(parentId, seen);
        if (parentRoot) {
          rootProjectId = parentRoot;
          break;
        }
      }
    }

    seen.delete(capsuleId);
    memo.set(capsuleId, rootProjectId);
    return rootProjectId;
  };

  const rows = new Map<string, ProjectTierHeatmapRow>();

  for (const capsule of capsules) {
    const rootProjectId = resolveRootProjectId(capsule.metadata.capsule_id);
    const tier = capsule.metadata.tier;
    if (!rootProjectId || !(tier === 1 || tier === 2 || tier === 3 || tier === 4)) continue;

    const rootProject = byId.get(rootProjectId);
    if (!rootProject || !isProject(rootProject)) continue;

    const existing = rows.get(rootProjectId) ?? {
      projectId: rootProjectId,
      projectName: rootProject.metadata.name ?? rootProjectId,
      counts: emptyTierCounts(),
      total: 0,
    };

    existing.counts[tier] += 1;
    existing.total += 1;
    rows.set(rootProjectId, existing);
  }

  return [...rows.values()].sort((left, right) => {
    if (right.total !== left.total) return right.total - left.total;
    return left.projectName.localeCompare(right.projectName);
  });
}

function compareTransitionPriority(left: DiffTierTransition, right: DiffTierTransition): number {
  const directionOrder = {
    elevated: 0,
    assigned: 1,
    deferred: 2,
    cleared: 3,
  } as const;

  if (directionOrder[left.direction] !== directionOrder[right.direction]) {
    return directionOrder[left.direction] - directionOrder[right.direction];
  }

  if ((left.toTier ?? 99) !== (right.toTier ?? 99)) {
    return (left.toTier ?? 99) - (right.toTier ?? 99);
  }

  if ((left.fromTier ?? 99) !== (right.fromTier ?? 99)) {
    return (left.fromTier ?? 99) - (right.fromTier ?? 99);
  }

  return left.summary.localeCompare(right.summary);
}

export function buildDiffTierInsights(diff: DiffResult): DiffTierInsights {
  const addedCounts = emptyTierCounts();
  const changedSurfaceCounts = emptyTierCounts();
  const incomingCounts = emptyTierCounts();
  const outgoingCounts = emptyTierCounts();
  const transitions: DiffTierTransition[] = [];

  let elevatedCount = 0;
  let deferredCount = 0;
  let assignedCount = 0;
  let clearedCount = 0;

  for (const capsule of diff.added) {
    const tier = coerceCapsuleTier(capsule.metadata.tier);
    if (tier) addedCounts[tier] += 1;
  }

  for (const node of diff.modified) {
    const beforeTier = coerceCapsuleTier(node.before?.metadata?.tier);
    const afterTier = coerceCapsuleTier(node.after?.metadata?.tier);
    const surfaceTier = afterTier ?? beforeTier;

    if (surfaceTier) changedSurfaceCounts[surfaceTier] += 1;

    const tierChange = node.changes.find((change) => change.path === '$.metadata.tier');
    if (!tierChange) continue;

    const fromTier = coerceCapsuleTier(tierChange.oldValue ?? beforeTier);
    const toTier = coerceCapsuleTier(tierChange.newValue ?? afterTier);

    if (fromTier) outgoingCounts[fromTier] += 1;
    if (toTier) incomingCounts[toTier] += 1;

    let direction: DiffTierTransition['direction'] | null = null;

    if (fromTier && toTier) {
      direction = toTier < fromTier ? 'elevated' : 'deferred';
      if (direction === 'elevated') elevatedCount += 1;
      if (direction === 'deferred') deferredCount += 1;
    } else if (!fromTier && toTier) {
      direction = 'assigned';
      assignedCount += 1;
    } else if (fromTier && !toTier) {
      direction = 'cleared';
      clearedCount += 1;
    }

    if (!direction) continue;

    transitions.push({
      capsuleId: node.id,
      summary: node.summary ?? node.after?.metadata?.name ?? node.id,
      capsuleType: node.capsuleType,
      fromTier,
      toTier,
      direction,
    });
  }

  transitions.sort(compareTransitionPriority);

  return {
    addedCounts,
    changedSurfaceCounts,
    incomingCounts,
    outgoingCounts,
    transitions,
    elevatedCount,
    deferredCount,
    assignedCount,
    clearedCount,
  };
}
