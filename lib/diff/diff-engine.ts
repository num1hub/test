import type {
  DiffOptions,
  DiffResult,
  LinkChange,
  SemanticEvent,
} from '@/contracts/diff';
import type { SovereignCapsule } from '@/types/capsule';
import { normalizeBranchName, loadOverlayGraph } from '@/lib/diff/branch-manager';
import { buildDiffMetrics, buildTemplateSummary, generateActionPlan } from '@/lib/diff/action-plan';
import { diffCapsuleFields } from '@/lib/diff/field-diff';
import { diffCapsuleLinks } from '@/lib/diff/link-diff';
import { getSummary, indexByCapsuleId, toRemovedRef, unionKeys } from '@/lib/diff/node-diff';
import type { RemovedCapsuleRef, ResolvedDiffOptions } from '@/lib/diff/types';
import {
  buildDiffCacheKey,
  clampRecursionDepth,
  getCachedDiff,
  getDefaultIgnorePaths,
  setCachedDiff,
} from '@/lib/diff/utils';

function normalizeScope(options: ResolvedDiffOptions): DiffResult['scope'] {
  return {
    scopeType: options.scopeType,
    scopeRootId: options.scopeRootId,
    capsuleIds: options.capsuleIds,
    recursive: options.recursive,
  };
}

function resolveDiffOptions(
  branchA: string,
  branchB: string,
  options: DiffOptions = {},
): ResolvedDiffOptions {
  const scopeType = options.scopeType ?? (options.scopeRootId || options.capsuleIds?.length ? 'capsule' : 'vault');
  return {
    branchA: normalizeBranchName(branchA),
    branchB: normalizeBranchName(branchB),
    scopeType,
    scopeRootId: options.scopeRootId,
    capsuleIds: options.capsuleIds?.slice(),
    recursive: options.recursive ?? false,
    cascadeDeletes: options.cascadeDeletes ?? false,
    ignorePaths: getDefaultIgnorePaths(options.ignorePaths),
    textMode: options.textMode ?? 'exact',
    recursionDepthCap: clampRecursionDepth(undefined),
  };
}

function semanticSeverityFromField(
  tag: SemanticEvent['type'],
  oldValue: unknown,
  newValue: unknown,
): SemanticEvent['severity'] {
  if (tag === 'status-transition') {
    const next = typeof newValue === 'string' ? newValue.toLowerCase() : '';
    if (next === 'blocked' || next === 'quarantined') return 'critical';
  }

  if (tag === 'due-date-change') {
    const previous = Date.parse(String(oldValue ?? ''));
    const next = Date.parse(String(newValue ?? ''));
    if (Number.isFinite(previous) && Number.isFinite(next) && next < previous) {
      return 'warning';
    }
  }

  return 'info';
}

function deriveSemanticEvents(
  capsuleId: string,
  fieldChanges: DiffResult['modified'][number]['changes'],
): SemanticEvent[] {
  return fieldChanges
    .filter((change) => change.semanticTag)
    .map((change) => ({
      type: change.semanticTag!,
      capsuleId,
      path: change.path,
      message: `${change.semanticTag} at ${change.path}`,
      oldValue: change.oldValue,
      newValue: change.newValue,
      severity: semanticSeverityFromField(change.semanticTag!, change.oldValue, change.newValue),
    }));
}

function deriveLinkSemanticEvents(capsuleId: string, linkChanges: LinkChange[]): SemanticEvent[] {
  return linkChanges.map((change) => ({
    type: 'link-change',
    capsuleId,
    path: `$.recursive_layer.links.${change.relation}`,
    message: `${change.change} link ${change.source} -> ${change.target} (${change.relation})`,
    oldValue: change.oldLink,
    newValue: change.newLink,
    severity:
      change.relation.includes('depends') || change.relation === 'part_of' ? 'warning' : 'info',
  }));
}

function buildAddedEvents(capsules: SovereignCapsule[]): SemanticEvent[] {
  return capsules.map((capsule) => ({
    type: 'capsule-added',
    capsuleId: capsule.metadata.capsule_id,
    message: `Added capsule ${getSummary(capsule) ?? capsule.metadata.capsule_id}`,
    newValue: capsule,
    severity: 'info',
  }));
}

function buildRemovedEvents(capsules: RemovedCapsuleRef[]): SemanticEvent[] {
  return capsules.map((capsule) => ({
    type: 'capsule-removed',
    capsuleId: capsule.id,
    message: `Removed capsule ${capsule.summary}`,
    oldValue: capsule.before,
    severity: 'info',
  }));
}

/**
 * The pure diff pipeline keeps comparison deterministic and cacheable so the
 * same engine can later run inside a worker without any route-specific state.
 */
export function diffBranchSnapshots(
  graphA: SovereignCapsule[],
  graphB: SovereignCapsule[],
  options: ResolvedDiffOptions,
): DiffResult {
  const t0 = Date.now();
  const mapA = indexByCapsuleId(graphA);
  const mapB = indexByCapsuleId(graphB);
  const allIds = unionKeys(mapA, mapB);

  const added: SovereignCapsule[] = [];
  const removed: RemovedCapsuleRef[] = [];
  const modified: DiffResult['modified'] = [];
  const linkChanges: LinkChange[] = [];
  const semanticEvents: SemanticEvent[] = [];
  let unchangedCount = 0;

  for (const id of allIds) {
    const a = mapA.get(id);
    const b = mapB.get(id);

    if (!a && b) {
      added.push(b);
      continue;
    }

    if (a && !b) {
      removed.push(toRemovedRef(a));
      continue;
    }

    if (!a || !b) continue;

    if (
      typeof a.integrity_sha3_512 === 'string' &&
      a.integrity_sha3_512 === b.integrity_sha3_512
    ) {
      unchangedCount += 1;
      continue;
    }

    const fieldChanges = diffCapsuleFields(a, b, options);
    const nodeSemanticEvents = deriveSemanticEvents(id, fieldChanges);
    const capsuleLinkChanges = diffCapsuleLinks(a, b);
    const linkSemanticEvents = deriveLinkSemanticEvents(id, capsuleLinkChanges);

    if (fieldChanges.length > 0) {
      modified.push({
        id,
        capsuleType: String(b.metadata?.type ?? a.metadata?.type ?? ''),
        summary: getSummary(b) ?? getSummary(a) ?? id,
        before: a,
        after: b,
        changes: fieldChanges,
        semanticEvents: nodeSemanticEvents,
      });
    }

    if (fieldChanges.length === 0 && capsuleLinkChanges.length === 0) {
      unchangedCount += 1;
    }

    linkChanges.push(...capsuleLinkChanges);
    semanticEvents.push(...nodeSemanticEvents, ...linkSemanticEvents);
  }

  semanticEvents.push(...buildAddedEvents(added), ...buildRemovedEvents(removed));

  const actionPlan = generateActionPlan({
    branchA: options.branchA,
    branchB: options.branchB,
    added,
    removed,
    modified,
    linkChanges,
    cascadeDeletes: options.cascadeDeletes ?? false,
  });

  const metrics = buildDiffMetrics({
    added,
    removed,
    modified,
    linkChanges,
    semanticEvents,
    unchangedCount,
    cacheHit: false,
    scopedCapsuleCount: allIds.length,
    durationMs: Date.now() - t0,
    actionPlan,
  });

  return {
    branchA: options.branchA,
    branchB: options.branchB,
    scope: normalizeScope(options),
    added,
    removed: removed.map(({ id, summary, capsuleType }) => ({ id, summary, capsuleType })),
    modified,
    linkChanges,
    semanticEvents,
    metrics,
    actionPlan,
    summary: buildTemplateSummary({ added, removed, modified, linkChanges, metrics }),
    conflicts: undefined,
  };
}

export async function computeDiff(
  branchA: string,
  branchB: string,
  options: DiffOptions = {},
): Promise<DiffResult> {
  const resolved = resolveDiffOptions(branchA, branchB, options);
  const [graphA, graphB] = await Promise.all([
    loadOverlayGraph(resolved.branchA, {
      scopeType: resolved.scopeType,
      scopeRootId: resolved.scopeRootId,
      capsuleIds: resolved.capsuleIds,
      recursive: resolved.recursive,
    }),
    loadOverlayGraph(resolved.branchB, {
      scopeType: resolved.scopeType,
      scopeRootId: resolved.scopeRootId,
      capsuleIds: resolved.capsuleIds,
      recursive: resolved.recursive,
    }),
  ]);

  const cacheKey = buildDiffCacheKey({
    branchA: resolved.branchA,
    branchB: resolved.branchB,
    scope: normalizeScope(resolved),
    graphA,
    graphB,
    ignorePaths: resolved.ignorePaths,
    textMode: resolved.textMode,
  });

  const cached = getCachedDiff<DiffResult>(cacheKey);
  if (cached) {
    return {
      ...cached,
      metrics: {
        ...cached.metrics,
        cacheHit: true,
      },
    };
  }

  const diff = diffBranchSnapshots(graphA, graphB, resolved);
  setCachedDiff(cacheKey, diff);
  return diff;
}
