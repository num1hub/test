import { autoFixCapsuleData } from '@/lib/validator/autofix';
import { CapsuleValidator } from '@/lib/validator/core';
import { GATE_DEFINITIONS } from '@/lib/validator/gates';
import { capsuleRootSchema, confidenceVectorObjectSchema, confidenceVectorSchema } from '@/lib/validator/schemas';
import {
  computeIntegrityHash,
  isValidSemanticHash,
  normalizeConfidenceVector,
  tokenCount,
  wordCount,
} from '@/lib/validator/utils';

import type {
  AutoFixPolicy,
  AutoFixResult,
  ValidationResult,
  ValidatorDependencies,
  ValidatorOptions,
} from '@/lib/validator/types';

const defaultValidator = new CapsuleValidator();

/**
 * Functional wrapper around the shared validator service.
 */
export async function validateCapsule(
  capsule: unknown,
  options: ValidatorOptions = {},
): Promise<ValidationResult> {
  return defaultValidator.validate(capsule, options);
}

/**
 * Applies non-destructive auto-fixes for known format and parity issues.
 */
export function autoFixCapsule<T = unknown>(
  capsule: T,
  policy?: AutoFixPolicy,
): AutoFixResult<T> {
  return autoFixCapsuleData(capsule, policy);
}

/**
 * Creates an isolated validator instance with custom dependencies/plugins.
 */
export function createCapsuleValidator(dependencies: ValidatorDependencies = {}): CapsuleValidator {
  return new CapsuleValidator(dependencies);
}

export {
  CapsuleValidator,
  GATE_DEFINITIONS,
  capsuleRootSchema,
  confidenceVectorSchema,
  confidenceVectorObjectSchema,
  tokenCount,
  wordCount,
  isValidSemanticHash,
  normalizeConfidenceVector,
  computeIntegrityHash,
};

export type * from '@/lib/validator/types';
