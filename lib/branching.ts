import fs from 'fs/promises';
import path from 'path';
import type { SovereignCapsule } from '@/types/capsule';
import type { BranchType } from '@/types/branch';
import { saveVersionedCapsule } from '@/lib/versioning';
import { logActivity } from '@/lib/activity';
import { dataPath } from '@/lib/dataPath';

const CAPSULES_DIR = dataPath('capsules');

async function ensureCapsulesDir() {
  try {
    await fs.access(CAPSULES_DIR);
  } catch {
    await fs.mkdir(CAPSULES_DIR, { recursive: true });
  }
}

/**
 * Generates the file path for a specific capsule branch.
 * Real branch: `capsule_id.json`
 * Dream branch: `capsule_id.dream.json`
 */
export function getCapsulePath(baseId: string, branch: BranchType): string {
  const safeId = path.basename(baseId);
  if (branch === 'dream') {
    return path.join(CAPSULES_DIR, `${safeId}.dream.json`);
  }
  return path.join(CAPSULES_DIR, `${safeId}.json`);
}

/**
 * Checks if a specific branch exists for a capsule.
 */
export async function branchExists(baseId: string, branch: BranchType): Promise<boolean> {
  try {
    await fs.access(getCapsulePath(baseId, branch));
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a capsule from a specific branch.
 */
export async function readCapsuleBranch(
  baseId: string,
  branch: BranchType,
): Promise<SovereignCapsule> {
  const filePath = getCapsulePath(baseId, branch);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as SovereignCapsule;
}

/**
 * Writes a capsule to a specific branch.
 * For the 'real' branch, it also creates a version backup.
 */
export async function writeCapsuleBranch(
  baseId: string,
  branch: BranchType,
  capsule: SovereignCapsule,
): Promise<void> {
  const normalizedCapsule: SovereignCapsule = {
    ...capsule,
    metadata: {
      ...capsule.metadata,
      capsule_id: baseId,
    },
  };

  if (branch === 'real') {
    await saveVersionedCapsule(normalizedCapsule);
  } else {
    await ensureCapsulesDir();
    const filePath = getCapsulePath(baseId, branch);
    await fs.writeFile(filePath, JSON.stringify(normalizedCapsule, null, 2), 'utf-8');
  }
}

/**
 * Forks a capsule: Copies the 'real' state to the 'dream' state.
 */
export async function forkCapsule(baseId: string): Promise<SovereignCapsule> {
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
 * Promotes a capsule: Overwrites 'real' with 'dream', backs up old 'real', and deletes 'dream'.
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

  const dreamPath = getCapsulePath(baseId, 'dream');
  await fs.unlink(dreamPath);

  await logActivity('update', {
    capsule_id: baseId,
    message: 'Promoted Dream branch to Real branch.',
  });

  return promotedCapsule;
}
