import fs from 'fs/promises';
import path from 'path';
import type {
  Conflict,
  MergeOptions,
  MergeResult,
} from '@/contracts/diff';
import type { SovereignCapsule } from '@/types/capsule';
import { logActivity } from '@/lib/activity';
import { getOverlayExistenceSet } from '@/lib/capsuleVault';
import { computeDiff } from '@/lib/diff/diff-engine';
import {
  getRealCapsulePath,
  loadOverlayGraph,
  normalizeBranchName,
  readBaseSnapshot,
  tombstoneCapsule,
  writeOverlayCapsule,
} from '@/lib/diff/branch-manager';
import { computeIntegrityHash, stableHash } from '@/lib/validator/utils';
import { validateCapsule } from '@/lib/validator';
import { saveVersionedCapsule } from '@/lib/versioning';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

function sanitizeSegment(value: string): string {
  return path.basename(value.trim());
}

function stableEqual(left: unknown, right: unknown): boolean {
  return stableHash(left) === stableHash(right);
}

function cloneCapsule(capsule: SovereignCapsule): SovereignCapsule {
  return JSON.parse(JSON.stringify(capsule)) as SovereignCapsule;
}

function conflictTypeForPath(path: string): Conflict['conflictType'] {
  return path === '$.metadata.type' ? 'type-mismatch' : 'field';
}

function resolveConflictValue(
  sourceValue: unknown,
  targetValue: unknown,
  resolution: NonNullable<MergeOptions['conflictResolution']>,
): unknown {
  if (resolution === 'source-wins') return sourceValue;
  return targetValue;
}

function mergeValue(
  baseValue: unknown,
  sourceValue: unknown,
  targetValue: unknown,
  pathString: string,
  capsuleId: string,
  resolution: NonNullable<MergeOptions['conflictResolution']>,
): { value: unknown; conflicts: Conflict[] } {
  if (stableEqual(sourceValue, targetValue)) {
    return { value: sourceValue, conflicts: [] };
  }

  if (stableEqual(baseValue, sourceValue)) {
    return { value: targetValue, conflicts: [] };
  }

  if (stableEqual(baseValue, targetValue)) {
    return { value: sourceValue, conflicts: [] };
  }

  if (Array.isArray(sourceValue) || Array.isArray(targetValue)) {
    const conflict: Conflict = {
      capsuleId,
      path: pathString,
      conflictType: conflictTypeForPath(pathString),
      message: `Array conflict at ${pathString}`,
      baseValue,
      sourceValue,
      targetValue,
    };
    return {
      value: resolveConflictValue(sourceValue, targetValue, resolution),
      conflicts: [conflict],
    };
  }

  if (isRecord(sourceValue) && isRecord(targetValue) && isRecord(baseValue)) {
    const keys = [...new Set([...Object.keys(baseValue), ...Object.keys(sourceValue), ...Object.keys(targetValue)])].sort();
    const merged: Record<string, unknown> = {};
    const conflicts: Conflict[] = [];

    for (const key of keys) {
      const nextPath = pathString === '$' ? `$.${key}` : `${pathString}.${key}`;
      const result = mergeValue(
        baseValue[key],
        sourceValue[key],
        targetValue[key],
        nextPath,
        capsuleId,
        resolution,
      );
      conflicts.push(...result.conflicts);
      if (result.value !== undefined) {
        merged[key] = result.value;
      }
    }

    return { value: merged, conflicts };
  }

  if (sourceValue === undefined && targetValue !== undefined) {
    const conflict: Conflict = {
      capsuleId,
      path: pathString,
      conflictType: 'delete-vs-modify',
      message: `Deletion conflicts with target change at ${pathString}`,
      baseValue,
      sourceValue,
      targetValue,
    };
    return {
      value: resolveConflictValue(sourceValue, targetValue, resolution),
      conflicts: [conflict],
    };
  }

  if (sourceValue !== undefined && targetValue === undefined) {
    const conflict: Conflict = {
      capsuleId,
      path: pathString,
      conflictType: 'modify-vs-delete',
      message: `Modification conflicts with target deletion at ${pathString}`,
      baseValue,
      sourceValue,
      targetValue,
    };
    return {
      value: resolveConflictValue(sourceValue, targetValue, resolution),
      conflicts: [conflict],
    };
  }

  const conflict: Conflict = {
    capsuleId,
    path: pathString,
    conflictType: conflictTypeForPath(pathString),
    message: `Conflicting updates at ${pathString}`,
    baseValue,
    sourceValue,
    targetValue,
  };

  return {
    value: resolveConflictValue(sourceValue, targetValue, resolution),
    conflicts: [conflict],
  };
}

function prepareMergedCapsule(
  capsuleId: string,
  capsule: SovereignCapsule,
): SovereignCapsule {
  const prepared = cloneCapsule(capsule);
  prepared.metadata.capsule_id = capsuleId;
  prepared.metadata.updated_at = new Date().toISOString();
  prepared.integrity_sha3_512 = computeIntegrityHash(prepared);
  return prepared;
}

async function writeLegacySnapshot(
  targetBranch: string,
  capsuleId: string,
  capsule: SovereignCapsule,
): Promise<void> {
  const filePath = path.join(
    'data',
    'branches',
    'legacy',
    sanitizeSegment(targetBranch),
    sanitizeSegment(capsuleId),
    `${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(capsule, null, 2), 'utf-8');
}

async function deleteTargetCapsule(capsuleId: string, targetBranch: string): Promise<void> {
  if (targetBranch === 'real') {
    await fs.rm(getRealCapsulePath(capsuleId), { force: true });
    return;
  }

  await tombstoneCapsule(capsuleId, targetBranch, 'Merged deletion from source branch');
}

/**
 * Merge application is intentionally conservative: conflicts are always
 * reported, and manual mode refuses to write any capsule that still carries one.
 */
export async function mergeBranches(options: MergeOptions): Promise<MergeResult> {
  const sourceBranch = normalizeBranchName(options.sourceBranch);
  const targetBranch = normalizeBranchName(options.targetBranch);
  const conflictResolution = options.conflictResolution ?? 'manual';
  const scope = {
    scopeType: options.scopeType ?? (options.scopeRootId || options.capsuleIds?.length ? 'capsule' : 'vault'),
    scopeRootId: options.scopeRootId,
    capsuleIds: options.capsuleIds,
    recursive: options.recursive ?? false,
  } as const;

  const diff = await computeDiff(targetBranch, sourceBranch, {
    ...scope,
    cascadeDeletes: options.cascadeDeletes,
  });

  const [sourceGraph, targetGraph] = await Promise.all([
    loadOverlayGraph(sourceBranch, scope),
    loadOverlayGraph(targetBranch, scope),
  ]);

  const sourceMap = new Map(sourceGraph.map((capsule) => [capsule.metadata.capsule_id, capsule] as const));
  const targetMap = new Map(targetGraph.map((capsule) => [capsule.metadata.capsule_id, capsule] as const));
  const allIds = [...new Set([...sourceMap.keys(), ...targetMap.keys()])].sort((left, right) =>
    left.localeCompare(right),
  );

  const operations = new Map<string, SovereignCapsule | null>();
  const conflicts: Conflict[] = [];
  const skippedIds: string[] = [];

  for (const capsuleId of allIds) {
    const sourceCapsule = sourceMap.get(capsuleId);
    const targetCapsule = targetMap.get(capsuleId);
    const baseCapsule = await readBaseSnapshot(capsuleId, sourceBranch);

    if (!baseCapsule) {
      if (sourceCapsule && targetCapsule && !stableEqual(sourceCapsule, targetCapsule)) {
        conflicts.push({
          capsuleId,
          path: '$',
          conflictType: 'add-collision',
          message: `Both branches materialized ${capsuleId} without a shared base snapshot`,
          sourceValue: sourceCapsule,
          targetValue: targetCapsule,
        });
      } else if (!stableEqual(sourceCapsule, targetCapsule)) {
        conflicts.push({
          capsuleId,
          path: '$',
          conflictType: 'missing-common-ancestor',
          message: `Missing common ancestor for ${capsuleId}`,
          sourceValue: sourceCapsule,
          targetValue: targetCapsule,
        });
      }

      if (conflictResolution === 'source-wins') {
        operations.set(capsuleId, sourceCapsule ?? null);
      } else if (conflictResolution === 'target-wins') {
        operations.set(capsuleId, targetCapsule ?? null);
      } else if (conflicts.some((conflict) => conflict.capsuleId === capsuleId)) {
        skippedIds.push(capsuleId);
      }
      continue;
    }

    if (!sourceCapsule && targetCapsule) {
      if (stableEqual(baseCapsule, targetCapsule)) {
        operations.set(capsuleId, null);
      } else {
        conflicts.push({
          capsuleId,
          path: '$',
          conflictType: 'delete-vs-modify',
          message: `Source deleted ${capsuleId} while target changed it`,
          baseValue: baseCapsule,
          sourceValue: null,
          targetValue: targetCapsule,
        });
        if (conflictResolution === 'source-wins') {
          operations.set(capsuleId, null);
        } else if (conflictResolution === 'target-wins') {
          operations.set(capsuleId, targetCapsule);
        } else {
          skippedIds.push(capsuleId);
        }
      }
      continue;
    }

    if (sourceCapsule && !targetCapsule) {
      if (stableEqual(baseCapsule, sourceCapsule)) {
        operations.set(capsuleId, sourceCapsule);
      } else {
        conflicts.push({
          capsuleId,
          path: '$',
          conflictType: 'modify-vs-delete',
          message: `Source changed ${capsuleId} while target deleted it`,
          baseValue: baseCapsule,
          sourceValue: sourceCapsule,
          targetValue: null,
        });
        if (conflictResolution === 'source-wins') {
          operations.set(capsuleId, sourceCapsule);
        } else if (conflictResolution === 'target-wins') {
          operations.set(capsuleId, null);
        } else {
          skippedIds.push(capsuleId);
        }
      }
      continue;
    }

    if (!sourceCapsule && !targetCapsule) {
      operations.set(capsuleId, null);
      continue;
    }

    const merged = mergeValue(
      baseCapsule,
      sourceCapsule,
      targetCapsule,
      '$',
      capsuleId,
      conflictResolution,
    );

    if (merged.conflicts.length > 0) {
      conflicts.push(...merged.conflicts);
      if (conflictResolution === 'manual') {
        skippedIds.push(capsuleId);
        continue;
      }
    }

    operations.set(capsuleId, merged.value as SovereignCapsule);
  }

  const finalExistenceSet = await getOverlayExistenceSet(targetBranch);
  for (const [capsuleId, capsule] of operations.entries()) {
    if (skippedIds.includes(capsuleId)) continue;
    if (capsule) finalExistenceSet.add(capsuleId);
    else finalExistenceSet.delete(capsuleId);
  }

  const writtenIds: string[] = [];
  const tombstonedIds: string[] = [];

  if (!options.dryRun) {
    for (const [capsuleId, capsule] of operations.entries()) {
      if (skippedIds.includes(capsuleId)) continue;
      const currentTarget = targetMap.get(capsuleId);

      if (capsule) {
        const prepared = prepareMergedCapsule(capsuleId, capsule);
        const validation = await validateCapsule(prepared, { existingIds: finalExistenceSet });
        if (!validation.valid) {
          conflicts.push({
            capsuleId,
            path: '$',
            conflictType: 'field',
            message: `Merged capsule ${capsuleId} failed validation`,
            sourceValue: prepared,
            targetValue: validation.errors,
          });
          skippedIds.push(capsuleId);
          continue;
        }

        if (options.createLegacy && currentTarget) {
          await writeLegacySnapshot(targetBranch, capsuleId, currentTarget);
        }

        await writeOverlayCapsule(prepared, targetBranch);
        writtenIds.push(capsuleId);
        continue;
      }

      if (currentTarget) {
        if (options.createLegacy) {
          await writeLegacySnapshot(targetBranch, capsuleId, currentTarget);
        }
        await saveVersionedCapsule(currentTarget, { branch: targetBranch, seedInitialSnapshot: true });
      }
      await deleteTargetCapsule(capsuleId, targetBranch);
      tombstonedIds.push(capsuleId);
    }

    await logActivity('update', {
      sourceBranch,
      targetBranch,
      writtenIds,
      tombstonedIds,
      skippedIds,
      message: `Merged ${sourceBranch} into ${targetBranch}`,
    });
  }

  return {
    applied: options.dryRun ? conflicts.length === 0 || conflictResolution !== 'manual' : skippedIds.length === 0 || conflictResolution !== 'manual',
    dryRun: options.dryRun ?? false,
    sourceBranch,
    targetBranch,
    writtenIds: writtenIds.sort((left, right) => left.localeCompare(right)),
    tombstonedIds: tombstonedIds.sort((left, right) => left.localeCompare(right)),
    skippedIds: [...new Set(skippedIds)].sort((left, right) => left.localeCompare(right)),
    conflicts,
    diff: {
      ...diff,
      conflicts,
    },
  };
}
