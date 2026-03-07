import os from 'os';
import path from 'path';

export function normalizeIssueState(value: string): string {
  return value.trim().toLowerCase();
}

export function sanitizeWorkspaceKey(identifier: string): string {
  return identifier.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function parseInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function coerceStringList(
  value: unknown,
  fallback: string[],
): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
}

export function resolveEnvToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('$')) return trimmed;
  const resolved = process.env[trimmed.slice(1)]?.trim() ?? '';
  return resolved || null;
}

export function resolvePathValue(value: unknown, fallback: string): string {
  const raw = resolveEnvToken(value) ?? (typeof value === 'string' ? value.trim() : '');
  const selected = raw || fallback;
  if (selected.startsWith('~')) {
    return path.resolve(os.homedir(), selected.slice(1));
  }
  if (selected.includes(path.sep) || selected.includes('/')) {
    return path.resolve(selected);
  }
  return selected;
}

export function ensureAbsolutePath(root: string, candidate: string): string {
  const absoluteRoot = path.resolve(root);
  const absoluteCandidate = path.resolve(candidate);
  const relative = path.relative(absoluteRoot, absoluteCandidate);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return absoluteCandidate;
  }
  throw new Error(`workspace_path_outside_root path=${absoluteCandidate} root=${absoluteRoot}`);
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function monotonicNowMs(): number {
  return Number(process.hrtime.bigint() / BigInt(1_000_000));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
