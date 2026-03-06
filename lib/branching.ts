import type { SovereignCapsule } from '@/types/capsule';
import type { BranchType } from '@/types/branch';
import { logActivity } from '@/lib/activity';
import {
  branchFileExists,
  ensureCapsulesInBranch,
  getCanonicalBranchPath,
  getRealCapsulePath,
  getTombstonePath,
  normalizeBranchName,
  readOverlayCapsule,
  tombstoneCapsule,
  writeOverlayCapsule,
} from '@/lib/diff/branch-manager';

/**
 * Compatibility wrapper for legacy callers that still need a direct branch
 * path. Real keeps the unsuffixed file and non-real branches resolve to the
 * canonical @branch overlay path.
 */
export function getCapsulePath(baseId: string, branch: BranchType): string {
  const normalizedBranch = normalizeBranchName(branch);
  return normalizedBranch === 'real'
    ? getRealCapsulePath(baseId)
    : getCanonicalBranchPath(baseId, normalizedBranch);
}

/**
 * Legacy branch existence continues to mean an explicit branch artifact exists,
 * which preserves the old "dream instantiated or not" behavior in the UI.
 */
export async function branchExists(baseId: string, branch: BranchType): Promise<boolean> {
  return branchFileExists(baseId, branch);
}

/**
 * Branch reads now use sparse overlay semantics so non-real branches inherit
 * real state unless an explicit file or tombstone overrides it.
 */
export async function readCapsuleBranch(
  baseId: string,
  branch: BranchType,
): Promise<SovereignCapsule> {
  const capsule = await readOverlayCapsule(baseId, branch);
  if (!capsule) {
    const error = new Error('Capsule branch not found') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  }
  return capsule;
}

/**
 * Writes route through the branch manager so manifests, histories, and overlay
 * files stay synchronized behind the existing branching API.
 */
export async function writeCapsuleBranch(
  baseId: string,
  branch: BranchType,
  capsule: SovereignCapsule,
): Promise<void> {
  await writeOverlayCapsule(
    {
      ...capsule,
      metadata: {
        ...capsule.metadata,
        capsule_id: baseId,
      },
    },
    branch,
  );
}

/**
 * Fork-to-Dream now lazily seeds the dream branch while keeping the historical
 * status mutation that current callers expect from the old UX.
 */
export async function forkCapsule(baseId: string): Promise<SovereignCapsule> {
  await ensureCapsulesInBranch({
    branch: 'dream',
    capsuleIds: [baseId],
    sourceBranch: 'real',
    scopeSeed: {
      scopeType: 'capsule',
      scopeRootId: baseId,
      recursive: false,
    },
  });

  const realCapsule = await readCapsuleBranch(baseId, 'real');
  const dreamCapsule: SovereignCapsule = {
    ...realCapsule,
    metadata: {
      ...realCapsule.metadata,
      status: 'draft',
      updated_at: new Date().toISOString(),
      capsule_id: baseId,
    },
  };

  await writeCapsuleBranch(baseId, 'dream', dreamCapsule);
  await logActivity('create', {
    capsule_id: baseId,
    message: 'Forked Real branch to Dream branch.',
  });

  return dreamCapsule;
}

/**
 * This compatibility promote path keeps older callers working until they are
 * rewired to the merge engine. It writes Dream into Real and then clears the
 * explicit dream overlay so the branch falls back to real again.
 */
export async function promoteCapsule(baseId: string): Promise<SovereignCapsule> {
  const dreamCapsule = await readCapsuleBranch(baseId, 'dream');
  const promotedCapsule: SovereignCapsule = {
    ...dreamCapsule,
    metadata: {
      ...dreamCapsule.metadata,
      status: 'active',
      updated_at: new Date().toISOString(),
      capsule_id: baseId,
    },
  };

  await writeCapsuleBranch(baseId, 'real', promotedCapsule);
  await tombstoneCapsule(baseId, 'dream', 'Promoted to real baseline');
  try {
    await (await import('fs/promises')).unlink(getTombstonePath(baseId, 'dream'));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  await logActivity('update', {
    capsule_id: baseId,
    message: 'Promoted Dream branch to Real branch.',
  });

  return promotedCapsule;
}
