import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { dataPath } from '@/lib/dataPath';
import type { ValidationIssue } from '@/lib/validator/types';

const VALIDATION_LOG_DIR = dataPath('validation-logs');
const VALIDATION_LOG_FILE = path.join(VALIDATION_LOG_DIR, 'validation.jsonl');

export interface ValidationLogEntry {
  id: string;
  timestamp: string;
  capsule_id: string | null;
  source: 'api' | 'batch' | 'a2c' | 'cli' | 'audit' | 'ui';
  success: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationStats {
  total: number;
  passed: number;
  failed: number;
  warned: number;
  passRate: number;
  recent: ValidationLogEntry[];
  trend: Array<{ date: string; passed: number; failed: number; warned: number }>;
}

const isRecordObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const isValidationIssue = (value: unknown): value is ValidationIssue => {
  if (!isRecordObject(value)) return false;
  return (
    typeof value.gate === 'string' && typeof value.path === 'string' && typeof value.message === 'string'
  );
};

const isValidationLogEntry = (value: unknown): value is ValidationLogEntry => {
  if (!isRecordObject(value)) return false;

  if (typeof value.id !== 'string' || typeof value.timestamp !== 'string') return false;
  if (typeof value.source !== 'string') return false;
  if (typeof value.success !== 'boolean') return false;
  if (!(typeof value.capsule_id === 'string' || value.capsule_id === null)) return false;

  if (!Array.isArray(value.errors) || !value.errors.every(isValidationIssue)) return false;
  if (!Array.isArray(value.warnings) || !value.warnings.every(isValidationIssue)) return false;

  return true;
};

async function ensureLogPath(): Promise<void> {
  try {
    await fs.access(VALIDATION_LOG_DIR);
  } catch {
    await fs.mkdir(VALIDATION_LOG_DIR, { recursive: true });
  }
}

export async function appendValidationLog(
  payload: Omit<ValidationLogEntry, 'id' | 'timestamp'> & { timestamp?: string },
): Promise<ValidationLogEntry> {
  await ensureLogPath();

  const entry: ValidationLogEntry = {
    id: randomUUID(),
    timestamp: payload.timestamp ?? new Date().toISOString(),
    capsule_id: payload.capsule_id,
    source: payload.source,
    success: payload.success,
    errors: payload.errors,
    warnings: payload.warnings,
  };

  await fs.appendFile(VALIDATION_LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf-8');
  return entry;
}

export async function readValidationLogs(limit: number = 500): Promise<ValidationLogEntry[]> {
  const safeLimit = Math.max(1, Math.min(limit, 5000));

  try {
    const content = await fs.readFile(VALIDATION_LOG_FILE, 'utf-8');
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const entries = lines
      .map((line) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is ValidationLogEntry => entry !== null && isValidationLogEntry(entry))
      .reverse();

    return entries.slice(0, safeLimit);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export function buildValidationStats(
  entries: ValidationLogEntry[],
  recentLimit: number = 50,
): ValidationStats {
  const total = entries.length;
  const passed = entries.filter((entry) => entry.success).length;
  const failed = total - passed;
  const warned = entries.filter((entry) => entry.warnings.length > 0).length;
  const passRate = total === 0 ? 1 : passed / total;

  const trendMap = new Map<string, { passed: number; failed: number; warned: number }>();

  for (const entry of entries) {
    const date = entry.timestamp.slice(0, 10);
    const bucket = trendMap.get(date) ?? { passed: 0, failed: 0, warned: 0 };

    if (entry.success) bucket.passed += 1;
    else bucket.failed += 1;

    if (entry.warnings.length > 0) bucket.warned += 1;

    trendMap.set(date, bucket);
  }

  const trend = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({ date, ...stats }));

  return {
    total,
    passed,
    failed,
    warned,
    passRate,
    recent: entries.slice(0, recentLimit),
    trend,
  };
}
