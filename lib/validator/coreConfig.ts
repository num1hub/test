import type { ZodIssue } from 'zod';
import { DEFAULT_AUTOFIX_POLICY } from '@/lib/validator/autofix';
import { DEFAULT_TOKEN_LIMIT } from '@/lib/validator/gates';
import type {
  AutoFixPolicy,
  CapsuleLink,
  CapsuleRoot,
  ValidationContext,
  ValidationIssue,
  ValidatorOptions,
  ValidatedCapsule,
} from '@/lib/validator/types';
import {
  fingerprintExistingIds,
  isRecordObject,
  normalizeConfidenceVector,
  stableHash,
} from '@/lib/validator/utils';

export const REQUIRED_ROOT_KEYS = [
  'metadata',
  'core_payload',
  'neuro_concentrate',
  'recursive_layer',
  'integrity_sha3_512',
] as const;

export const DEFAULT_VALIDATOR_OPTIONS: Required<
  Omit<ValidatorOptions, 'existingIds' | 'autoFixPolicy'>
> & {
  autoFixPolicy: Required<AutoFixPolicy>;
} = {
  skipG16: false,
  customTokenLimit: DEFAULT_TOKEN_LIMIT,
  allowRefutes: false,
  cache: true,
  autoFixPolicy: DEFAULT_AUTOFIX_POLICY,
};

const isRootKey = (value: string): value is (typeof REQUIRED_ROOT_KEYS)[number] => {
  return (REQUIRED_ROOT_KEYS as readonly string[]).includes(value);
};

function issuePathToKey(issue: ZodIssue): string {
  if (issue.path.length === 0) return '$';
  return issue.path.map(String).join('.');
}

export function cloneValue<T>(input: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(input);
  }

  return JSON.parse(JSON.stringify(input)) as T;
}

export function createValidationContext(options: ValidatorOptions): ValidationContext {
  return {
    options: {
      ...DEFAULT_VALIDATOR_OPTIONS,
      ...options,
      existingIds: options.existingIds,
      autoFixPolicy: {
        ...DEFAULT_AUTOFIX_POLICY,
        ...options.autoFixPolicy,
      },
    },
  };
}

export function buildValidationCacheKey(capsule: unknown, existingIds?: Set<string>): string {
  return stableHash({
    capsule,
    options: {
      existingIdsFingerprint: fingerprintExistingIds(existingIds),
    },
  });
}

export function classifySchemaIssue(issue: ZodIssue): string {
  const pathKey = issuePathToKey(issue);

  if (issue.code === 'unrecognized_keys' && issue.path.length === 0) return 'G01';

  if (pathKey === 'metadata' || pathKey.startsWith('metadata.capsule_id')) return 'G02';
  if (pathKey.startsWith('core_payload.content') || pathKey.startsWith('core_payload.content_type')) {
    return 'G02';
  }
  if (
    pathKey.startsWith('neuro_concentrate.summary') ||
    pathKey.startsWith('neuro_concentrate.keywords') ||
    pathKey.startsWith('neuro_concentrate.confidence_vector') ||
    pathKey.startsWith('recursive_layer.links')
  ) {
    return 'G02';
  }

  if (
    pathKey.startsWith('metadata.type') ||
    pathKey.startsWith('metadata.status') ||
    pathKey.startsWith('metadata.subtype') ||
    pathKey.startsWith('metadata.version')
  ) {
    return 'G03';
  }

  if (
    pathKey.startsWith('metadata.semantic_hash') ||
    pathKey.startsWith('neuro_concentrate.semantic_hash')
  ) {
    return 'G09';
  }

  if (pathKey.startsWith('core_payload.truncation_note')) return 'G06';
  if (pathKey.startsWith('neuro_concentrate.confidence_vector')) return 'G15';
  if (pathKey.startsWith('integrity_sha3_512')) return 'G16';
  if (issue.code === 'invalid_type' && issue.path.length === 1) return 'G02';

  return 'G03';
}

export function normalizeValidatedCapsule(capsule: CapsuleRoot): ValidatedCapsule {
  const normalized = normalizeConfidenceVector(capsule.neuro_concentrate.confidence_vector);

  return {
    ...capsule,
    neuro_concentrate: {
      ...capsule.neuro_concentrate,
      confidence_vector:
        normalized ?? {
          extraction: 0,
          synthesis: 0,
          linking: 0,
          provenance_coverage: 0,
          validation_score: 0,
          contradiction_pressure: 0,
        },
    },
  };
}

export function dedupeValidationIssues(issues: ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>();
  const deduped: ValidationIssue[] = [];

  for (const issue of issues) {
    const key = `${issue.gate}|${issue.path}|${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(issue);
  }

  return deduped;
}

export function getCapsuleLinks(capsule: unknown): CapsuleLink[] | null {
  if (!isRecordObject(capsule)) return null;
  const recursive = isRecordObject(capsule.recursive_layer) ? capsule.recursive_layer : null;
  if (!recursive || !Array.isArray(recursive.links)) return null;

  return recursive.links
    .map((link) => {
      if (!isRecordObject(link)) return null;
      const targetId = typeof link.target_id === 'string' ? link.target_id : '';
      const relationType = typeof link.relation_type === 'string' ? link.relation_type : '';
      if (!targetId || !relationType) return null;
      return {
        ...link,
        target_id: targetId,
        relation_type: relationType,
      } as CapsuleLink;
    })
    .filter((link): link is CapsuleLink => Boolean(link));
}

export function validateRootStructure(capsule: unknown, errors: ValidationIssue[]): void {
  if (!isRecordObject(capsule)) {
    errors.push({
      gate: 'G01',
      path: '$',
      message: 'Capsule must be a JSON object containing exactly five root keys.',
    });
    return;
  }

  const keys = Object.keys(capsule);
  const missing = REQUIRED_ROOT_KEYS.filter((key) => !(key in capsule));
  const extra = keys.filter((key) => !isRootKey(key));

  if (missing.length > 0) {
    errors.push({
      gate: 'G01',
      path: '$',
      message: `Missing root keys: ${missing.join(', ')}`,
    });
  }

  if (extra.length > 0) {
    errors.push({
      gate: 'G01',
      path: '$',
      message: `Unexpected root keys: ${extra.join(', ')}`,
    });
  }
}
