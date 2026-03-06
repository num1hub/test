import fs from 'fs/promises';
import path from 'path';
import type { SovereignCapsule } from '@/types/capsule';
import type { BranchName } from '@/types/branch';
import { normalizeBranchName } from '@/types/branch';
import { logActivity } from '@/lib/activity';
import { dataPath } from '@/lib/dataPath';

const CAPSULES_DIR = dataPath('capsules');
const VERSIONS_DIR = dataPath('versions');

const isRecord = (input: unknown): input is Record<string, unknown> => {
  return Boolean(input && typeof input === 'object' && !Array.isArray(input));
};

const isSovereignCapsule = (input: unknown): input is SovereignCapsule => {
  if (!isRecord(input)) return false;
  if (!isRecord(input.metadata)) return false;
  if (typeof input.metadata.capsule_id !== 'string') return false;
  return Boolean(
    input.core_payload &&
      input.neuro_concentrate &&
      input.recursive_layer &&
      input.integrity_sha3_512,
  );
};

async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

function getSafeTimestamp(isoDate: string = new Date().toISOString()): string {
  return isoDate.replace(/[:.]/g, '-');
}

function safeTimestampToIso(timestamp: string): string {
  const match = timestamp.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
  if (!match) return timestamp;
  const [, date, hh, mm, ss, ms] = match;
  return `${date}T${hh}:${mm}:${ss}.${ms}Z`;
}

function resolveBranch(branch?: BranchName): BranchName {
  return normalizeBranchName(branch ?? 'real') ?? 'real';
}

function getActiveCapsulePath(capsuleId: string, branch: BranchName): string {
  const safeId = path.basename(capsuleId);
  if (branch === 'real') {
    return path.join(CAPSULES_DIR, `${safeId}.json`);
  }
  return path.join(CAPSULES_DIR, `${safeId}@${path.basename(branch)}.json`);
}

function getBranchVersionDir(capsuleId: string, branch: BranchName): string {
  const safeId = path.basename(capsuleId);
  if (branch === 'real') {
    return path.join(VERSIONS_DIR, safeId, 'real');
  }
  return path.join(VERSIONS_DIR, safeId, 'branches', path.basename(branch));
}

function getLegacyRealVersionDir(capsuleId: string): string {
  return path.join(VERSIONS_DIR, path.basename(capsuleId));
}

async function listVersionFiles(dirPath: string): Promise<string[]> {
  try {
    await fs.access(dirPath);
    return (await fs.readdir(dirPath)).filter((file) => file.endsWith('.json'));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/**
 * Persists the active branch state and records the previous branch snapshot in
 * a branch-scoped history directory so restore and merge flows can target both
 * the real baseline and non-real overlays with the same API.
 */
export async function saveVersionedCapsule(
  capsule: SovereignCapsule,
  options: { branch?: BranchName; seedInitialSnapshot?: boolean } = {},
): Promise<void> {
  const safeId = path.basename(capsule.metadata.capsule_id);
  const branch = resolveBranch(options.branch);
  const activePath = getActiveCapsulePath(safeId, branch);
  const versionDir = getBranchVersionDir(safeId, branch);

  await ensureDir(CAPSULES_DIR);
  await ensureDir(versionDir);

  try {
    const existingContent = await fs.readFile(activePath, 'utf-8');
    const parsed = JSON.parse(existingContent) as unknown;
    const historicalTime =
      isRecord(parsed) && isRecord(parsed.metadata)
        ? (typeof parsed.metadata.updated_at === 'string'
            ? parsed.metadata.updated_at
            : typeof parsed.metadata.created_at === 'string'
              ? parsed.metadata.created_at
              : new Date().toISOString())
        : new Date().toISOString();

    const safeHistoricalTime = getSafeTimestamp(historicalTime);
    const versionPath = path.join(versionDir, `${safeHistoricalTime}.json`);

    try {
      await fs.access(versionPath);
    } catch {
      await fs.writeFile(versionPath, existingContent, 'utf-8');
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Error backing up previous version:', error);
    }
  }

  if (options.seedInitialSnapshot) {
    const seedTimestamp = getSafeTimestamp(
      typeof capsule.metadata.updated_at === 'string'
        ? capsule.metadata.updated_at
        : typeof capsule.metadata.created_at === 'string'
          ? capsule.metadata.created_at
          : new Date().toISOString(),
    );
    const seedPath = path.join(versionDir, `${seedTimestamp}.json`);

    try {
      await fs.access(seedPath);
    } catch {
      await fs.writeFile(seedPath, JSON.stringify(capsule, null, 2), 'utf-8');
    }
  }

  await fs.writeFile(activePath, JSON.stringify(capsule, null, 2), 'utf-8');
}

export interface VersionMeta {
  timestamp: string;
  isoDate: string;
}

/**
 * Lists versions from the branch-specific layout while still reading the old
 * real-branch directory so existing history remains visible after the upgrade.
 */
export async function listVersions(
  capsuleId: string,
  options: { branch?: BranchName } = {},
): Promise<VersionMeta[]> {
  const safeId = path.basename(capsuleId);
  const branch = resolveBranch(options.branch);
  const branchFiles = new Set<string>(await listVersionFiles(getBranchVersionDir(safeId, branch)));

  if (branch === 'real') {
    const legacyFiles = await listVersionFiles(getLegacyRealVersionDir(safeId));
    legacyFiles.forEach((file) => branchFiles.add(file));
  }

  return [...branchFiles]
    .map((file) => {
      const timestamp = file.replace(/\.json$/, '');
      return {
        timestamp,
        isoDate: safeTimestampToIso(timestamp),
      };
    })
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

/**
 * Retrieves a single historical snapshot from the requested branch and falls
 * back to the legacy real-branch location so old backups stay restorable.
 */
export async function getVersion(
  capsuleId: string,
  timestamp: string,
  options: { branch?: BranchName } = {},
): Promise<unknown> {
  const safeId = path.basename(capsuleId);
  const safeTimestamp = path.basename(timestamp);
  const branch = resolveBranch(options.branch);
  const candidatePaths = [path.join(getBranchVersionDir(safeId, branch), `${safeTimestamp}.json`)];

  if (branch === 'real') {
    candidatePaths.push(path.join(getLegacyRealVersionDir(safeId), `${safeTimestamp}.json`));
  }

  for (const candidatePath of candidatePaths) {
    try {
      const content = await fs.readFile(candidatePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  const error = new Error('Version not found') as NodeJS.ErrnoException;
  error.code = 'ENOENT';
  throw error;
}

/**
 * Restores a historical snapshot back into the active branch path so callers
 * can recover either real or non-real branch state without a separate API.
 */
export async function restoreVersion(
  capsuleId: string,
  timestamp: string,
  options: { branch?: BranchName } = {},
): Promise<SovereignCapsule> {
  const branch = resolveBranch(options.branch);
  const restored = await getVersion(capsuleId, timestamp, { branch });
  if (!isSovereignCapsule(restored)) {
    throw new Error('Invalid version payload');
  }

  restored.metadata.capsule_id = capsuleId;
  restored.metadata.updated_at = new Date().toISOString();

  await saveVersionedCapsule(restored, { branch });
  await logActivity('update', {
    capsule_id: capsuleId,
    message: `Restored ${branch} branch to historical state from ${timestamp}`,
  });

  return restored;
}
