import fs from 'fs/promises';
import path from 'path';
import { dataPath } from '@/lib/dataPath';
import { isRecordObject } from '@/lib/validator/utils';

export const CAPSULES_DIR = dataPath('capsules');

export async function ensureCapsulesDir(): Promise<string> {
  try {
    await fs.access(CAPSULES_DIR);
  } catch {
    await fs.mkdir(CAPSULES_DIR, { recursive: true });
  }
  return CAPSULES_DIR;
}

export async function listCapsuleJsonFiles(dir: string = CAPSULES_DIR): Promise<string[]> {
  try {
    const files = await fs.readdir(dir);
    return files.filter((file) => file.endsWith('.json') && !file.endsWith('.dream.json'));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function getExistingCapsuleIds(dir: string = CAPSULES_DIR): Promise<Set<string>> {
  const files = await listCapsuleJsonFiles(dir);
  const ids = new Set<string>();

  await Promise.all(
    files.map(async (file) => {
      try {
        const content = await fs.readFile(path.join(dir, file), 'utf-8');
        const parsed = JSON.parse(content) as unknown;
        if (!isRecordObject(parsed)) return;
        const metadata = isRecordObject(parsed.metadata) ? parsed.metadata : null;
        if (metadata && typeof metadata.capsule_id === 'string' && metadata.capsule_id.length > 0) {
          ids.add(metadata.capsule_id);
        }
      } catch {
        // Ignore malformed files while building existence set.
      }
    }),
  );

  return ids;
}

export async function readCapsulesFromDisk(dir: string = CAPSULES_DIR): Promise<unknown[]> {
  const files = await listCapsuleJsonFiles(dir);

  const capsules = await Promise.all(
    files.map(async (file) => {
      try {
        const content = await fs.readFile(path.join(dir, file), 'utf-8');
        return JSON.parse(content) as unknown;
      } catch {
        return null;
      }
    }),
  );

  return capsules.filter((capsule): capsule is unknown => capsule !== null);
}
