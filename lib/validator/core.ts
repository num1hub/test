import { autoFixCapsuleData } from '@/lib/validator/autofix';
import {
  buildValidationCacheKey,
  classifySchemaIssue,
  cloneValue,
  createValidationContext,
  dedupeValidationIssues,
  normalizeValidatedCapsule,
  validateRootStructure,
} from '@/lib/validator/coreConfig';
import {
  validateContentType,
  validateConfidenceVector,
  validateKeywords,
  validatePayloadIntegrity,
  validateProvenanceCoverage,
  validateSemanticHashParity,
  validateSemanticHashes,
  validateSummary,
} from '@/lib/validator/coreIdentityChecks';
import {
  validateLinkRequirement,
  validateRelationTypes,
  validateTargetExistence,
} from '@/lib/validator/coreLinkChecks';
import {
  validateCoherenceTrap,
  validateIntegritySeal,
} from '@/lib/validator/coreQualityChecks';
import { capsuleRootSchema } from '@/lib/validator/schemas';
import {
  type AutoFixPolicy,
  type AutoFixResult,
  type ValidationPlugin,
  type ValidationIssue,
  type ValidationResult,
  type ValidatorDependencies,
  type ValidatorOptions,
} from '@/lib/validator/types';
import { pathToJsonPath } from '@/lib/validator/utils';

/**
 * Class-based validator service with cache + dependency injection.
 */
export class CapsuleValidator {
  private readonly referenceResolver = this.dependencies.referenceResolver;
  private readonly cryptographyProvider = this.dependencies.cryptographyProvider;
  private readonly plugins: ValidationPlugin[];
  private readonly cache = new Map<string, ValidationResult>();

  constructor(private readonly dependencies: ValidatorDependencies = {}) {
    this.plugins = [...(dependencies.plugins ?? [])];
  }

  registerPlugin(plugin: ValidationPlugin): void {
    this.plugins.push(plugin);
  }

  clearCache(): void {
    this.cache.clear();
  }

  autoFix<T = unknown>(capsule: T, policy?: AutoFixPolicy): AutoFixResult<T> {
    return autoFixCapsuleData(capsule, policy);
  }

  /**
   * Validates a capsule against all 16 gates.
   */
  async validate(capsule: unknown, options: ValidatorOptions = {}): Promise<ValidationResult> {
    const context = createValidationContext(options);
    const cacheKey = context.options.cache
      ? buildValidationCacheKey(capsule, options.existingIds)
      : undefined;

    if (cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          ...cloneValue(cached),
          cacheHit: true,
        };
      }
    }

    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    let computedHash: string | undefined;

    validateRootStructure(capsule, errors);

    const parsed = capsuleRootSchema.safeParse(capsule);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          gate: classifySchemaIssue(issue),
          path: pathToJsonPath(issue.path),
          message: issue.message,
        });
      }
    }

    const candidate = parsed.success ? parsed.data : capsule;

    validateProvenanceCoverage(candidate, errors);
    validateContentType(candidate, warnings);
    validatePayloadIntegrity(candidate, errors);
    validateSummary(candidate, errors);
    validateKeywords(candidate, errors);
    validateSemanticHashes(candidate, errors);
    validateSemanticHashParity(candidate, errors);
    validateRelationTypes(candidate, context, errors, warnings);

    await validateTargetExistence(
      candidate,
      context,
      errors,
      warnings,
      Boolean(this.referenceResolver),
      this.targetExists.bind(this),
    );

    validateLinkRequirement(candidate, errors);
    validateCoherenceTrap(candidate, context, errors);
    validateConfidenceVector(candidate, errors);

    if (!context.options.skipG16) {
      computedHash = validateIntegritySeal(
        candidate,
        errors,
        this.cryptographyProvider?.computeIntegrityHash,
      );
    }

    for (const plugin of this.plugins) {
      try {
        const pluginResult = await plugin.validate(candidate, context);
        if (pluginResult?.errors?.length) errors.push(...pluginResult.errors);
        if (pluginResult?.warnings?.length) warnings.push(...pluginResult.warnings);
      } catch (error: unknown) {
        warnings.push({
          gate: 'PLUGIN',
          path: '$',
          message:
            error instanceof Error
              ? `Plugin ${plugin.id} failed: ${error.message}`
              : `Plugin ${plugin.id} failed with unknown error`,
        });
      }
    }

    const normalizedCapsule = parsed.success
      ? normalizeValidatedCapsule(parsed.data)
      : undefined;

    const dedupedErrors = dedupeValidationIssues(errors);
    const dedupedWarnings = dedupeValidationIssues(warnings);

    const result: ValidationResult = {
      valid: dedupedErrors.length === 0,
      errors: dedupedErrors,
      warnings: dedupedWarnings,
      capsule: dedupedErrors.length === 0 ? normalizedCapsule : undefined,
      computedHash,
    };

    if (cacheKey) {
      this.cache.set(cacheKey, cloneValue(result));
    }

    return result;
  }

  private async targetExists(targetId: string, existingIds?: Set<string>): Promise<boolean> {
    if (existingIds) return existingIds.has(targetId);
    if (!this.referenceResolver) return false;
    return this.referenceResolver.exists(targetId);
  }
}
