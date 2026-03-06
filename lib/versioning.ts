import fs from 'fs/promises';
import path from 'path';
import type { SovereignCapsule } from '@/types/capsule';
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

/**
 * Helper to ensure a directory exists.
 */
async function ensureDir(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Creates a filesystem-safe timestamp string.
 */
function getSafeTimestamp(isoDate: string = new Date().toISOString()): string {
  return isoDate.replace(/[:.]/g, '-');
}

function safeTimestampToIso(timestamp: string): string {
  const match = timestamp.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
  if (!match) return timestamp;
  const [, date, hh, mm, ss, ms] = match;
  return `${date}T${hh}:${mm}:${ss}.${ms}Z`;
}

/**
 * Saves a capsule to the active directory and creates a versioned backup.
 * Used during PUT updates.
 */
export async function saveVersionedCapsule(capsule: SovereignCapsule): Promise<void> {
  const safeId = path.basename(capsule.metadata.capsule_id);
  const activePath = path.join(CAPSULES_DIR, `${safeId}.json`);
  const capsuleVersionsDir = path.join(VERSIONS_DIR, safeId);

  await ensureDir(CAPSULES_DIR);
  await ensureDir(capsuleVersionsDir);

  // 1. Back up the existing active capsule (if it exists) to the versions directory.
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
    const versionPath = path.join(capsuleVersionsDir, `${safeHistoricalTime}.json`);

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

  // 2. Write the new capsule payload to the active directory.
  await fs.writeFile(activePath, JSON.stringify(capsule, null, 2), 'utf-8');
}

/**
 * Lists all available versions for a specific capsule ID.
 */
export interface VersionMeta {
  timestamp: string;
  isoDate: string;
}

export async function listVersions(capsuleId: string): Promise<VersionMeta[]> {
  const safeId = path.basename(capsuleId);
  const capsuleVersionsDir = path.join(VERSIONS_DIR, safeId);

  try {
    await fs.access(capsuleVersionsDir);
    const files = await fs.readdir(capsuleVersionsDir);

    const versions = files
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const timestamp = file.replace(/\.json$/, '');
        return {
          timestamp,
          isoDate: safeTimestampToIso(timestamp),
        };
      });

    return versions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/**
 * Retrieves the raw JSON content of a specific historical version.
 */
export async function getVersion(capsuleId: string, timestamp: string): Promise<unknown> {
  const safeId = path.basename(capsuleId);
  const safeTimestamp = path.basename(timestamp);
  const versionPath = path.join(VERSIONS_DIR, safeId, `${safeTimestamp}.json`);

  const content = await fs.readFile(versionPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Restores a specific version back to the active directory.
 */
export async function restoreVersion(
  capsuleId: string,
  timestamp: string,
): Promise<SovereignCapsule> {
  const restored = await getVersion(capsuleId, timestamp);
  if (!isSovereignCapsule(restored)) {
    throw new Error('Invalid version payload');
  }

  // Force active id and update timestamp so restore is explicit in metadata.
  restored.metadata.capsule_id = capsuleId;
  restored.metadata.updated_at = new Date().toISOString();

  await saveVersionedCapsule(restored);
  await logActivity('update', {
    capsule_id: capsuleId,
    message: `Restored to historical state from ${timestamp}`,
  });

  return restored;
}
