import { createHash } from 'crypto';
import stringify from 'canonical-json';
import {
  CONFIDENCE_VECTOR_KEYS,
  type ConfidenceVectorInput,
  type ConfidenceVectorKey,
  type ConfidenceVectorObject,
} from '@/lib/validator/types';

const SEMANTIC_HASH_REGEX = /^(?:[a-z0-9]+-){7}[a-z0-9]+$/;

const INTEGRITY_ROOT_KEYS = [
  'metadata',
  'core_payload',
  'neuro_concentrate',
  'recursive_layer',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

export function tokenCount(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/u).length;
}

export function wordCount(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;
  const matches = normalized.match(/[\p{L}\p{N}'-]+/gu);
  return matches ? matches.length : 0;
}

export function isValidSemanticHash(hash: string): boolean {
  return SEMANTIC_HASH_REGEX.test(hash);
}

export function normalizeConfidenceVector(
  confidenceVector: ConfidenceVectorInput | null | undefined,
): ConfidenceVectorObject | null {
  if (!confidenceVector) return null;

  if (Array.isArray(confidenceVector)) {
    if (confidenceVector.length !== CONFIDENCE_VECTOR_KEYS.length) {
      return null;
    }

    const normalized = {} as ConfidenceVectorObject;
    CONFIDENCE_VECTOR_KEYS.forEach((key, idx) => {
      const value = confidenceVector[idx];
      normalized[key] = typeof value === 'number' ? value : Number.NaN;
    });

    return normalized;
  }

  if (!isRecord(confidenceVector)) return null;

  const normalized = {} as ConfidenceVectorObject;
  for (const key of CONFIDENCE_VECTOR_KEYS) {
    const value = confidenceVector[key];
    if (typeof value !== 'number') return null;
    normalized[key] = value;
  }

  return normalized;
}

export function validateConfidenceVectorRange(
  confidenceVector: ConfidenceVectorObject,
): { ok: boolean; invalidKeys: ConfidenceVectorKey[] } {
  const invalidKeys: ConfidenceVectorKey[] = [];

  for (const key of CONFIDENCE_VECTOR_KEYS) {
    const value = confidenceVector[key];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      invalidKeys.push(key);
    }
  }

  return {
    ok: invalidKeys.length === 0,
    invalidKeys,
  };
}

export function computeIntegrityHash(capsule: unknown): string {
  if (!isRecord(capsule)) {
    throw new Error('Cannot compute integrity hash for non-object capsule');
  }

  const payload = {
    metadata: capsule[INTEGRITY_ROOT_KEYS[0]],
    core_payload: capsule[INTEGRITY_ROOT_KEYS[1]],
    neuro_concentrate: capsule[INTEGRITY_ROOT_KEYS[2]],
    recursive_layer: capsule[INTEGRITY_ROOT_KEYS[3]],
  };

  const canonical = stringify(payload);
  return createHash('sha3-512').update(canonical).digest('hex');
}

export function stableHash(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (input === undefined) return null;
    if (Array.isArray(input)) return input.map((item) => normalize(item));
    if (isRecord(input)) {
      const normalized: Record<string, unknown> = {};
      for (const [key, nestedValue] of Object.entries(input)) {
        normalized[key] = normalize(nestedValue);
      }
      return normalized;
    }
    return input;
  };

  return createHash('sha256').update(stringify(normalize(value))).digest('hex');
}

export function pathToJsonPath(path: Array<PropertyKey>): string {
  if (path.length === 0) return '$';

  return path.reduce<string>((acc, segment) => {
    if (typeof segment === 'symbol') {
      return `${acc}[\"${String(segment)}\"]`;
    }
    if (typeof segment === 'number') {
      return `${acc}[${segment}]`;
    }
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/u.test(segment)) {
      return `${acc}.${segment}`;
    }
    return `${acc}["${segment}"]`;
  }, '$');
}

export function getConfidenceMetric(
  capsule: unknown,
  key: ConfidenceVectorKey,
): number | undefined {
  if (!isRecord(capsule)) return undefined;
  const neuro = capsule.neuro_concentrate;
  if (!isRecord(neuro)) return undefined;

  const normalized = normalizeConfidenceVector(neuro.confidence_vector as ConfidenceVectorInput);
  if (!normalized) return undefined;
  return normalized[key];
}

export function fingerprintExistingIds(existingIds?: Set<string>): string | undefined {
  if (!existingIds) return undefined;
  return stableHash([...existingIds].sort());
}

export function isRecordObject(value: unknown): value is Record<string, unknown> {
  return isRecord(value);
}
