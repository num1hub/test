import path from 'path';
import type { SovereignCapsule } from '@/types/capsule';
import { normalizeConfidenceVector, pathToJsonPath, stableHash } from '@/lib/validator/utils';

const DEFAULT_IGNORE_PATHS = ['$.metadata.updated_at', '$.integrity_sha3_512'] as const;
const NEVER_IGNORE_PATHS = new Set([
  '$.metadata.status',
  '$.metadata.version',
  '$.metadata.type',
  '$.metadata.subtype',
  '$.metadata.name',
  '$.metadata.created_at',
  '$.metadata.dueDate',
  '$.metadata.priority',
  '$.metadata.progress',
  '$.metadata.estimatedHours',
  '$.metadata.actualHours',
  '$.core_payload.content',
  '$.neuro_concentrate.summary',
  '$.neuro_concentrate.keywords',
  '$.neuro_concentrate.confidence_vector',
]);

const HASH_MEMO = new Map<string, string>();
const DIFF_CACHE = new Map<string, { expiresAt: number; value: unknown }>();

export const DIFF_CACHE_TTL_MS = 60_000;
export const DEFAULT_DIFF_RECURSION_CAP = 50;
export const MAX_DIFF_RECURSION_CAP = 200;
export const MAX_GRAPH_TRAVERSAL_NODES = 2_000;

export type JsonPath = `$.${string}` | '$';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizePrimitiveArray(values: unknown[]): unknown[] {
  return values
    .map((value) => (value === undefined ? null : value))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function normalizeObjectArray(values: unknown[]): unknown[] {
  return values
    .map((value) => normalizeForDiff(value))
    .sort((left, right) => stableHash(left).localeCompare(stableHash(right)));
}

function shouldKeepPath(pathString: string, ignorePaths: string[]): boolean {
  if (NEVER_IGNORE_PATHS.has(pathString)) return true;
  return !ignorePaths.some((candidate) => candidate === pathString);
}

export function getDefaultIgnorePaths(extraPaths: string[] = []): string[] {
  return [...DEFAULT_IGNORE_PATHS, ...extraPaths.filter(Boolean)];
}

export function isIgnoredPath(pathString: string, ignorePaths: string[] = []): boolean {
  return !shouldKeepPath(pathString, getDefaultIgnorePaths(ignorePaths));
}

export function sanitizePathSegment(value: string): string {
  return path.basename(value.trim());
}

/**
 * Diff caching keys off normalized fingerprints so timestamp-only changes do not
 * churn the cache and hide the actual semantic shape of a branch overlay.
 */
export function normalizeForDiff(
  value: unknown,
  currentPath: Array<string | number> = [],
  ignorePaths: string[] = [],
): unknown {
  const pathString = pathToJsonPath(currentPath);
  if (currentPath.length > 0 && isIgnoredPath(pathString, ignorePaths)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    if (pathString === '$.recursive_layer.links') {
      return value
        .map((item) => normalizeForDiff(item, [...currentPath, 0], ignorePaths))
        .sort((left, right) => stableHash(left).localeCompare(stableHash(right)));
    }

    if (pathString === '$.neuro_concentrate.keywords') {
      return [...new Set(value.filter((item): item is string => typeof item === 'string'))].sort();
    }

    if (value.every((item) => item === null || ['string', 'number', 'boolean'].includes(typeof item))) {
      return normalizePrimitiveArray(value);
    }

    return normalizeObjectArray(value);
  }

  if (pathString === '$.neuro_concentrate.confidence_vector') {
    return normalizeConfidenceVector(value as Parameters<typeof normalizeConfidenceVector>[0]);
  }

  if (!isRecord(value)) {
    return value === undefined ? null : value;
  }

  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const nextPath = [...currentPath, key];
    const nextPathString = pathToJsonPath(nextPath);
    if (isIgnoredPath(nextPathString, ignorePaths)) continue;

    const nested = normalizeForDiff(value[key], nextPath, ignorePaths);
    if (nested !== undefined) {
      normalized[key] = nested;
    }
  }

  return normalized;
}

export function memoizedStableHash(value: unknown): string {
  const key = JSON.stringify(normalizeForDiff(value));
  const cached = HASH_MEMO.get(key);
  if (cached) return cached;
  const hash = stableHash(JSON.parse(key));
  HASH_MEMO.set(key, hash);
  return hash;
}

export function buildGraphFingerprint(
  capsules: SovereignCapsule[],
  ignorePaths: string[] = [],
): string {
  const payload = capsules
    .map((capsule) => ({
      id: capsule.metadata.capsule_id,
      fingerprint: memoizedStableHash(normalizeForDiff(capsule, [], ignorePaths)),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return stableHash(payload);
}

export function getCachedDiff<T>(cacheKey: string): T | null {
  const cached = DIFF_CACHE.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    DIFF_CACHE.delete(cacheKey);
    return null;
  }
  return cached.value as T;
}

export function setCachedDiff<T>(cacheKey: string, value: T, ttlMs: number = DIFF_CACHE_TTL_MS): void {
  DIFF_CACHE.set(cacheKey, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

export function clearDiffCache(): void {
  DIFF_CACHE.clear();
}

export function buildDiffCacheKey(input: {
  branchA: string;
  branchB: string;
  scope: unknown;
  graphA: SovereignCapsule[];
  graphB: SovereignCapsule[];
  ignorePaths?: string[];
  textMode?: string;
}): string {
  return stableHash({
    branchA: input.branchA,
    branchB: input.branchB,
    scope: input.scope,
    graphA: buildGraphFingerprint(input.graphA, input.ignorePaths),
    graphB: buildGraphFingerprint(input.graphB, input.ignorePaths),
    ignorePaths: getDefaultIgnorePaths(input.ignorePaths),
    textMode: input.textMode ?? 'exact',
  });
}

export function clampRecursionDepth(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_DIFF_RECURSION_CAP;
  return Math.max(1, Math.min(MAX_DIFF_RECURSION_CAP, Math.floor(value as number)));
}

export function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const matrix = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1).fill(0));
  for (let row = 0; row <= left.length; row += 1) matrix[row][0] = row;
  for (let column = 0; column <= right.length; column += 1) matrix[0][column] = column;

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[left.length][right.length];
}
