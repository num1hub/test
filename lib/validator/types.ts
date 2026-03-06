import type { z } from 'zod';

export const CONFIDENCE_VECTOR_KEYS = [
  'extraction',
  'synthesis',
  'linking',
  'provenance_coverage',
  'validation_score',
  'contradiction_pressure',
] as const;

export type ConfidenceVectorKey = (typeof CONFIDENCE_VECTOR_KEYS)[number];
export type ConfidenceVectorObject = Record<ConfidenceVectorKey, number>;
export type ConfidenceVectorInput = ConfidenceVectorObject | number[];

export type CapsuleStatus =
  | 'draft'
  | 'active'
  | 'frozen'
  | 'archived'
  | 'legacy'
  | 'sovereign'
  | 'quarantined';

export type CapsuleType =
  | 'foundation'
  | 'concept'
  | 'operations'
  | 'physical_object'
  | 'project';
export type CapsuleSubtype = 'atomic' | 'hub';

export const CANONICAL_RELATION_TYPES = [
  'supports',
  'contradicts',
  'extends',
  'derived_from',
  'depends_on',
  'references',
  'duplicates',
  'implements',
  'part_of',
] as const;

export type CanonicalRelationType = (typeof CANONICAL_RELATION_TYPES)[number];

export interface CapsuleSource {
  uri?: string;
  sha256?: string;
  type?: string;
}

export interface CapsuleMetadata {
  capsule_id: string;
  type: CapsuleType;
  subtype: CapsuleSubtype;
  status: CapsuleStatus;
  version: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
  name?: string;
  semantic_hash: string;
  source?: CapsuleSource;
  [key: string]: unknown;
}

export interface CapsuleLink {
  target_id: string;
  relation_type: CanonicalRelationType | 'refutes' | string;
  [key: string]: unknown;
}

export interface CapsuleRoot {
  metadata: CapsuleMetadata;
  core_payload: {
    content_type: string;
    content: string;
    truncation_note?: string;
    [key: string]: unknown;
  };
  neuro_concentrate: {
    summary: string;
    confidence_vector: ConfidenceVectorInput;
    keywords: string[];
    semantic_hash: string;
    [key: string]: unknown;
  };
  recursive_layer: {
    links: CapsuleLink[];
    [key: string]: unknown;
  };
  integrity_sha3_512: string;
}

export type ValidatedCapsule = CapsuleRoot & {
  neuro_concentrate: CapsuleRoot['neuro_concentrate'] & {
    confidence_vector: ConfidenceVectorObject;
  };
};

export interface ValidationIssue {
  gate: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  capsule?: ValidatedCapsule;
  computedHash?: string;
  cacheHit?: boolean;
}

export interface BatchValidationResult {
  valid: number;
  invalid: number;
  warnings: number;
  total: number;
}

export interface AutoFixPolicy {
  syncSemanticHashParity?: boolean;
  replaceRefutesRelation?: boolean;
  normalizeConfidenceVectorShape?: boolean;
  recomputeIntegritySeal?: boolean;
}

export interface AutoFixResult<T = unknown> {
  fixedData: T;
  appliedFixes: string[];
}

export interface ValidatorOptions {
  existingIds?: Set<string>;
  skipG16?: boolean;
  customTokenLimit?: number;
  allowRefutes?: boolean;
  autoFixPolicy?: AutoFixPolicy;
  cache?: boolean;
}

export interface ValidationContext {
  options: Required<Omit<ValidatorOptions, 'existingIds' | 'autoFixPolicy'>> & {
    existingIds?: Set<string>;
    autoFixPolicy: Required<AutoFixPolicy>;
  };
}

export interface GateDefinition {
  id: string;
  name: string;
  description: string;
  threshold?: string;
  autoFixAvailable: boolean;
}

export interface ValidationPlugin {
  id: string;
  description?: string;
  validate: (
    capsule: unknown,
    context: ValidationContext,
  ) =>
    | Promise<{ errors?: ValidationIssue[]; warnings?: ValidationIssue[] } | void>
    | { errors?: ValidationIssue[]; warnings?: ValidationIssue[] }
    | void;
}

export interface ReferenceResolver {
  exists: (targetId: string) => Promise<boolean> | boolean;
}

export interface CryptographyProvider {
  computeIntegrityHash: (capsule: unknown) => string;
}

export interface ValidatorDependencies {
  referenceResolver?: ReferenceResolver;
  cryptographyProvider?: CryptographyProvider;
  plugins?: ValidationPlugin[];
}

export interface SchemaBundle {
  rootSchema: z.ZodType<CapsuleRoot>;
  confidenceVectorSchema: z.ZodType<ConfidenceVectorInput>;
}
