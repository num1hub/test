import fs from 'fs/promises';
import path from 'path';
import type { SovereignCapsule } from '@/types/capsule';
import type { BranchName } from '@/types/branch';
import { BRANCH_NAME_REGEX } from '@/types/branch';
import { dataPath } from '@/lib/dataPath';
import { isRecordObject } from '@/lib/validator/utils';

export const CAPSULES_DIR = dataPath('capsules');

export interface ParsedBranchFilename {
  capsuleId: string;
  branch: BranchName;
  isTombstone: boolean;
  isLegacyDream: boolean;
  isReal: boolean;
}

function normalizeBranchName(value: BranchName): BranchName {
  const normalized = value.trim().toLowerCase();
  if (!BRANCH_NAME_REGEX.test(normalized)) {
    throw new Error(`Invalid branch name: ${value}`);
  }
  return normalized;
}

function isRealCapsuleFilename(file: string): boolean {
  return parseBranchFilename(file)?.isReal === true;
}

export async function ensureCapsulesDir(): Promise<string> {
  try {
    await fs.access(CAPSULES_DIR);
  } catch {
    await fs.mkdir(CAPSULES_DIR, { recursive: true });
  }
  return CAPSULES_DIR;
}

export function parseBranchFilename(file: string): ParsedBranchFilename | null {
  const tombstoneMatch = file.match(/^(.+?)@([a-z0-9][a-z0-9._-]{0,63})\.tombstone\.json$/);
  if (tombstoneMatch) {
    return {
      capsuleId: tombstoneMatch[1],
      branch: tombstoneMatch[2],
      isTombstone: true,
      isLegacyDream: false,
      isReal: false,
    };
  }

  const canonicalMatch = file.match(/^(.+?)@([a-z0-9][a-z0-9._-]{0,63})\.json$/);
  if (canonicalMatch) {
    return {
      capsuleId: canonicalMatch[1],
      branch: canonicalMatch[2],
      isTombstone: false,
      isLegacyDream: false,
      isReal: false,
    };
  }

  const legacyDreamMatch = file.match(/^(.+?)\.dream\.json$/);
  if (legacyDreamMatch) {
    return {
      capsuleId: legacyDreamMatch[1],
      branch: 'dream',
      isTombstone: false,
      isLegacyDream: true,
      isReal: false,
    };
  }

  if (file.endsWith('.json') && !file.includes('@')) {
    return {
      capsuleId: file.replace(/\.json$/, ''),
      branch: 'real',
      isTombstone: false,
      isLegacyDream: false,
      isReal: true,
    };
  }

  return null;
}

export async function listRealCapsulePaths(dir: string = CAPSULES_DIR): Promise<string[]> {
  try {
    const files = await fs.readdir(dir);
    return files
      .filter(isRealCapsuleFilename)
      .sort((left, right) => left.localeCompare(right))
      .map((file) => path.join(dir, file));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function listCapsuleJsonFiles(dir: string = CAPSULES_DIR): Promise<string[]> {
  return (await listRealCapsulePaths(dir)).map((filePath) => path.basename(filePath));
}

export async function getExistingCapsuleIds(dir: string = CAPSULES_DIR): Promise<Set<string>> {
  const files = await listRealCapsulePaths(dir);
  const ids = new Set<string>();

  await Promise.all(
    files.map(async (filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content) as unknown;
        if (!isRecordObject(parsed)) return;
        const metadata = isRecordObject(parsed.metadata) ? parsed.metadata : null;
        if (metadata && typeof metadata.capsule_id === 'string' && metadata.capsule_id.length > 0) {
          ids.add(metadata.capsule_id);
        }
      } catch {
        // Ignore malformed files while building the existence set.
      }
    }),
  );

  return ids;
}

export async function getOverlayExistenceSet(branch: BranchName): Promise<Set<string>> {
  const { loadOverlayGraph } = await import('@/lib/diff/branch-manager');
  const capsules = await loadOverlayGraph(normalizeBranchName(branch));
  return new Set(capsules.map((capsule) => capsule.metadata.capsule_id));
}

export async function readCapsulesFromDisk(dir: string = CAPSULES_DIR): Promise<unknown[]> {
  const files = await listRealCapsulePaths(dir);
  const capsules = await Promise.all(
    files.map(async (filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content) as unknown;
      } catch {
        return null;
      }
    }),
  );

  return capsules.filter((capsule): capsule is unknown => capsule !== null);
}

export async function loadOverlayCapsules(branch: BranchName): Promise<SovereignCapsule[]> {
  const { loadOverlayGraph } = await import('@/lib/diff/branch-manager');
  return loadOverlayGraph(normalizeBranchName(branch));
}
