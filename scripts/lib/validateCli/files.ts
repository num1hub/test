import fs from 'fs/promises';
import path from 'path';
import { parseBranchFilename } from '../../../lib/capsuleVault';
import { isRecordObject } from '../../../lib/validator/utils';

export function extractCapsuleId(capsule: unknown): string | null {
  if (!isRecordObject(capsule)) return null;
  const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
  if (!metadata || typeof metadata.capsule_id !== 'string') return null;
  return metadata.capsule_id;
}

export async function readJson(filePath: string): Promise<unknown> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as unknown;
}

export async function listJsonFiles(targetPath: string): Promise<string[]> {
  const stat = await fs.stat(targetPath);
  if (stat.isFile()) return [targetPath];

  const files = await fs.readdir(targetPath);
  return files
    .filter((file) => {
      const parsed = parseBranchFilename(file);
      return parsed?.branch === 'real' && !parsed.isTombstone;
    })
    .map((file) => path.join(targetPath, file));
}

export async function loadExistingIds(
  files: string[],
  idsFile?: string,
): Promise<Set<string>> {
  if (idsFile) {
    const payload = await readJson(idsFile);
    if (Array.isArray(payload)) {
      return new Set(payload.filter((id): id is string => typeof id === 'string'));
    }
    if (isRecordObject(payload) && Array.isArray(payload.ids)) {
      return new Set(payload.ids.filter((id): id is string => typeof id === 'string'));
    }
  }

  const ids = new Set<string>();

  for (const file of files) {
    try {
      const capsule = await readJson(file);
      const id = extractCapsuleId(capsule);
      if (id) ids.add(id);
    } catch {
      // Ignore malformed files while creating the existing IDs set.
    }
  }

  return ids;
}
