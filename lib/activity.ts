import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { dataPath } from '@/lib/dataPath';

export const ACTIVITY_ACTIONS = [
  'create',
  'update',
  'delete',
  'import',
  'export',
  'login',
  'logout',
  'password_change',
  'other',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export interface ActivityEntry {
  id: string;
  timestamp: string;
  action: ActivityAction;
  details?: Record<string, unknown>;
}

function getActivityLogPath() {
  if (process.env.VERCEL) {
    return path.join('/tmp', 'n1hub', 'activity.log');
  }

  return dataPath('activity.log');
}

const ensureLogDir = async () => {
  const dir = path.dirname(getActivityLogPath());
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

const isRecord = (input: unknown): input is Record<string, unknown> => {
  return Boolean(input && typeof input === 'object' && !Array.isArray(input));
};

const isActivityEntry = (input: unknown): input is ActivityEntry => {
  if (!isRecord(input)) return false;
  if (typeof input.id !== 'string' || typeof input.timestamp !== 'string') return false;
  if (typeof input.action !== 'string' || !ACTIVITY_ACTIONS.includes(input.action as ActivityAction)) {
    return false;
  }
  if ('details' in input && input.details !== undefined && !isRecord(input.details)) return false;
  return true;
};

/**
 * Appends a new activity entry to the JSON-lines log file.
 */
export async function logActivity(
  action: ActivityAction,
  details?: Record<string, unknown>,
): Promise<void> {
  const entry: ActivityEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    details,
  };

  try {
    await ensureLogDir();
    await fs.appendFile(getActivityLogPath(), `${JSON.stringify(entry)}\n`, 'utf-8');
  } catch (error) {
    console.error('Failed to write to activity log:', error);
  }
}

/**
 * Reads the activity log, parsing JSON-lines, and returns the most recent entries.
 */
export async function getRecentActivity(limit: number = 50): Promise<ActivityEntry[]> {
  const boundedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.floor(limit))) : 50;

  try {
    const fileContent = await fs.readFile(getActivityLogPath(), 'utf-8');
    const lines = fileContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const entries = lines
      .map((line) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is ActivityEntry => isActivityEntry(entry))
      .reverse();

    return entries.slice(0, boundedLimit);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error('Failed to read activity log:', error);
    throw error;
  }
}
