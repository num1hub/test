import type {
  Conflict,
  DiffMetrics,
  LinkChange,
  NodeChange,
  TaskCapsule,
} from '@/contracts/diff';
import type { RemovedCapsuleRef } from '@/lib/diff/types';
import { stableHash } from '@/lib/validator/utils';

export interface MetricsInterpreter {
  estimateTimeImpact: (nodeChange: NodeChange) => number;
  estimateCostImpact: (nodeChange: NodeChange) => number;
}

export interface ActionPlanAdapter {
  additionalTasks: (
    nodeChange: NodeChange,
    branchA: string,
    branchB: string,
  ) => TaskCapsule[];
}

const metricsRegistry = new Map<string, MetricsInterpreter>();
const actionPlanRegistry = new Map<string, ActionPlanAdapter>();

const DEFAULT_HOURS: Record<TaskCapsule['kind'], number> = {
  'create-capsule': 2,
  'remove-capsule': 0.5,
  'update-field': 0.5,
  'add-link': 0.5,
  'remove-link': 0.5,
  'resolve-conflict': 1.5,
};

function extractPartOfTargets(capsule?: NodeChange['before'] | RemovedCapsuleRef['before']): string[] {
  if (!capsule || !Array.isArray(capsule.recursive_layer.links)) return [];
  return capsule.recursive_layer.links
    .filter((link) => link.relation_type === 'part_of' && typeof link.target_id === 'string')
    .map((link) => link.target_id);
}

function taskId(kind: TaskCapsule['kind'], payload: unknown): string {
  return stableHash({ kind, payload });
}

function hoursHint(node: NodeChange | { before?: NodeChange['before']; after?: NodeChange['after'] }): number | undefined {
  const after = node.after;
  const before = node.before;
  const candidates = [
    after?.metadata.estimatedHours,
    after?.core_payload.estimatedHours,
    before?.metadata.estimatedHours,
    before?.core_payload.estimatedHours,
  ];
  return candidates.find((candidate): candidate is number => typeof candidate === 'number');
}

function costHint(capsule?: NodeChange['before']): number | undefined {
  if (!capsule) return undefined;
  const candidates = [
    capsule.metadata.estimatedCost,
    capsule.metadata.cost,
    capsule.core_payload.estimatedCost,
    capsule.core_payload.cost,
  ];
  return candidates.find((candidate): candidate is number => typeof candidate === 'number');
}

function priorityForFieldChange(nodeChange: NodeChange, path: string): TaskCapsule['priority'] {
  const afterStatus = typeof nodeChange.after?.metadata.status === 'string' ? nodeChange.after.metadata.status : '';
  if (path === '$.metadata.status' && ['blocked', 'quarantined'].includes(afterStatus)) {
    return 'high';
  }
  if (path === '$.metadata.dueDate') {
    const oldDue = Date.parse(String(nodeChange.before?.metadata.dueDate ?? ''));
    const newDue = Date.parse(String(nodeChange.after?.metadata.dueDate ?? ''));
    if (
      Number.isFinite(oldDue) &&
      Number.isFinite(newDue) &&
      newDue < oldDue &&
      afterStatus !== 'archived'
    ) {
      return 'high';
    }
  }
  if (path === '$.metadata.type' || path === '$.metadata.subtype') return 'high';
  if (path.startsWith('$.recursive_layer.links')) return 'medium';
  if (path === '$.core_payload.content' || path === '$.neuro_concentrate.summary') return 'medium';
  if (path === '$.metadata.name') return 'low';
  return 'medium';
}

function buildConflictTasks(
  conflicts: Conflict[],
  branchA: string,
  branchB: string,
): TaskCapsule[] {
  return conflicts.map((conflict) => ({
    id: taskId('resolve-conflict', { ...conflict }),
    kind: 'resolve-conflict',
    title: `Resolve conflict in ${conflict.capsuleId}`,
    description: conflict.message,
    status: 'todo',
    priority: 'critical',
    capsuleId: conflict.capsuleId,
    path: conflict.path,
    sourceBranch: branchA,
    targetBranch: branchB,
    estimatedHours: DEFAULT_HOURS['resolve-conflict'],
    metadata: {
      conflictType: conflict.conflictType,
    },
  }));
}

export function registerMetricsInterpreter(
  capsuleType: string,
  interpreter: MetricsInterpreter,
): void {
  metricsRegistry.set(capsuleType, interpreter);
}

export function registerActionPlanAdapter(
  capsuleType: string,
  adapter: ActionPlanAdapter,
): void {
  actionPlanRegistry.set(capsuleType, adapter);
}

/**
 * Action plan tasks are deterministic so downstream planners can de-duplicate
 * repeated diffs and track the same operational item across refreshes.
 */
export function generateActionPlan(input: {
  branchA: string;
  branchB: string;
  added: Array<NonNullable<NodeChange['after']>>;
  removed: RemovedCapsuleRef[];
  modified: NodeChange[];
  linkChanges: LinkChange[];
  conflicts?: Conflict[];
  cascadeDeletes: boolean;
}): TaskCapsule[] {
  const tasks: TaskCapsule[] = [];
  const removedIds = new Set(input.removed.map((removed) => removed.id));
  const suppressedDeleteIds = new Set<string>();

  if (input.cascadeDeletes) {
    for (const removed of input.removed) {
      const parents = extractPartOfTargets(removed.before);
      if (parents.some((parentId) => removedIds.has(parentId))) {
        suppressedDeleteIds.add(removed.id);
      }
    }
  }

  for (const capsule of input.added) {
    if (!capsule) continue;
    tasks.push({
      id: taskId('create-capsule', { capsuleId: capsule.metadata.capsule_id }),
      kind: 'create-capsule',
      title: `Create ${capsule.metadata.capsule_id}`,
      description: `Materialize capsule ${capsule.metadata.capsule_id} in ${input.branchB}.`,
      status: 'todo',
      priority: 'medium',
      capsuleId: capsule.metadata.capsule_id,
      sourceBranch: input.branchA,
      targetBranch: input.branchB,
      estimatedHours: capsule.metadata.estimatedHours ?? capsule.core_payload.estimatedHours ?? DEFAULT_HOURS['create-capsule'],
    });
  }

  for (const removed of input.removed) {
    if (suppressedDeleteIds.has(removed.id)) continue;
    tasks.push({
      id: taskId('remove-capsule', { capsuleId: removed.id }),
      kind: 'remove-capsule',
      title: `Remove ${removed.id}`,
      description: `Remove capsule ${removed.summary} from ${input.branchB}.`,
      status: 'todo',
      priority: 'high',
      capsuleId: removed.id,
      sourceBranch: input.branchA,
      targetBranch: input.branchB,
      estimatedHours: removed.before?.metadata.estimatedHours ?? removed.before?.core_payload.estimatedHours ?? DEFAULT_HOURS['remove-capsule'],
    });
  }

  for (const nodeChange of input.modified) {
    for (const change of nodeChange.changes) {
      tasks.push({
        id: taskId('update-field', {
          capsuleId: nodeChange.id,
          path: change.path,
          oldValue: change.oldValue,
          newValue: change.newValue,
        }),
        kind: 'update-field',
        title: `Update ${change.path}`,
        description: `Update ${change.path} on ${nodeChange.summary ?? nodeChange.id}.`,
        status: 'todo',
        priority: priorityForFieldChange(nodeChange, change.path),
        capsuleId: nodeChange.id,
        path: change.path,
        sourceBranch: input.branchA,
        targetBranch: input.branchB,
        estimatedHours:
          (typeof change.newValue === 'number' && typeof change.oldValue === 'number'
            ? Math.abs(change.newValue - change.oldValue)
            : undefined) ??
          hoursHint(nodeChange) ??
          DEFAULT_HOURS['update-field'],
      });
    }

    const adapter = nodeChange.capsuleType ? actionPlanRegistry.get(nodeChange.capsuleType) : undefined;
    if (adapter) {
      tasks.push(...adapter.additionalTasks(nodeChange, input.branchA, input.branchB));
    }
  }

  for (const linkChange of input.linkChanges) {
    const kind = linkChange.change === 'removed' ? 'remove-link' : 'add-link';
    tasks.push({
      id: taskId(kind, linkChange),
      kind,
      title:
        kind === 'add-link'
          ? `Add ${linkChange.relation} link`
          : `Remove ${linkChange.relation} link`,
      description: `${linkChange.source} ${kind === 'add-link' ? 'links to' : 'unlinks from'} ${linkChange.target} via ${linkChange.relation}.`,
      status: 'todo',
      priority: linkChange.relation === 'part_of' ? 'high' : 'medium',
      capsuleId: linkChange.source,
      path: `$.recursive_layer.links.${linkChange.relation}`,
      sourceBranch: input.branchA,
      targetBranch: input.branchB,
      estimatedHours: DEFAULT_HOURS[kind],
    });
  }

  if (input.conflicts?.length) {
    tasks.push(...buildConflictTasks(input.conflicts, input.branchA, input.branchB));
  }

  return tasks.sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * Metrics stay derived from the diff payload so cached diffs and API callers do
 * not need a second pass to understand scope, effort, or cost impact.
 */
export function buildDiffMetrics(input: {
  added: Array<NonNullable<NodeChange['after']>>;
  removed: RemovedCapsuleRef[];
  modified: NodeChange[];
  linkChanges: LinkChange[];
  semanticEvents: { type: string }[];
  unchangedCount: number;
  cacheHit: boolean;
  scopedCapsuleCount: number;
  durationMs: number;
  actionPlan: TaskCapsule[];
}): DiffMetrics {
  const addedLinks = input.linkChanges.filter((change) => change.change === 'added').length;
  const removedLinks = input.linkChanges.filter((change) => change.change === 'removed').length;
  const modifiedLinks = input.linkChanges.filter((change) => change.change === 'modified').length;

  const interpreterTimeImpact = input.modified.reduce((sum, nodeChange) => {
    const interpreter = nodeChange.capsuleType ? metricsRegistry.get(nodeChange.capsuleType) : undefined;
    return sum + (interpreter ? interpreter.estimateTimeImpact(nodeChange) : 0);
  }, 0);

  const timeImpactFromTasks = input.actionPlan.reduce(
    (sum, task) => sum + (typeof task.estimatedHours === 'number' ? task.estimatedHours : 0),
    0,
  );

  const interpreterCostImpact = input.modified.reduce((sum, nodeChange) => {
    const interpreter = nodeChange.capsuleType ? metricsRegistry.get(nodeChange.capsuleType) : undefined;
    return sum + (interpreter ? interpreter.estimateCostImpact(nodeChange) : 0);
  }, 0);

  const defaultCostImpact =
    input.added.reduce((sum, capsule) => sum + (costHint(capsule) ?? 0), 0) -
    input.removed.reduce((sum, capsule) => sum + (costHint(capsule.before) ?? 0), 0) +
    input.modified.reduce((sum, nodeChange) => {
      return sum + ((costHint(nodeChange.after) ?? 0) - (costHint(nodeChange.before) ?? 0));
    }, 0);

  return {
    addedCount: input.added.length,
    removedCount: input.removed.length,
    modifiedCount: input.modified.length,
    unchangedCount: input.unchangedCount,
    addedLinks,
    removedLinks,
    modifiedLinks,
    semanticEventCount: input.semanticEvents.length,
    estimatedTimeImpactHours: interpreterTimeImpact > 0 ? interpreterTimeImpact : timeImpactFromTasks,
    estimatedCostImpact: interpreterCostImpact !== 0 ? interpreterCostImpact : defaultCostImpact,
    durationMs: input.durationMs,
    cacheHit: input.cacheHit,
    scopedCapsuleCount: input.scopedCapsuleCount,
  };
}

export function buildTemplateSummary(input: {
  added: unknown[];
  removed: unknown[];
  modified: unknown[];
  linkChanges: unknown[];
  metrics: DiffMetrics;
}): string {
  return [
    `${input.metrics.addedCount} added`,
    `${input.metrics.removedCount} removed`,
    `${input.metrics.modifiedCount} modified`,
    `${input.metrics.addedLinks + input.metrics.removedLinks + input.metrics.modifiedLinks} link changes`,
  ].join(' · ');
}
