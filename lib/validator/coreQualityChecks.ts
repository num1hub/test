import type { ValidationContext, ValidationIssue } from '@/lib/validator/types';
import { computeIntegrityHash, getConfidenceMetric, isRecordObject, tokenCount } from '@/lib/validator/utils';

export function validateCoherenceTrap(
  capsule: unknown,
  context: ValidationContext,
  errors: ValidationIssue[],
): void {
  if (!isRecordObject(capsule)) return;

  const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
  const payload = isRecordObject(capsule.core_payload) ? capsule.core_payload : null;
  if (!metadata || !payload || typeof payload.content !== 'string') return;

  const count = tokenCount(payload.content);
  if (count <= context.options.customTokenLimit) return;

  const contradictionPressure = getConfidenceMetric(capsule, 'contradiction_pressure') ?? 0;
  const isSovereignFoundation = metadata.status === 'sovereign' && metadata.type === 'foundation';

  if (!isSovereignFoundation && contradictionPressure <= 0) {
    errors.push({
      gate: 'G14',
      path: '$.neuro_concentrate.confidence_vector.contradiction_pressure',
      message:
        `Token count (${count}) exceeds limit (${context.options.customTokenLimit}) but contradiction_pressure is not > 0.`,
    });
  }
}

export function validateIntegritySeal(
  capsule: unknown,
  errors: ValidationIssue[],
  computeHash?: (capsule: unknown) => string,
): string | undefined {
  if (!isRecordObject(capsule)) return undefined;

  try {
    const computedHash = computeHash ? computeHash(capsule) : computeIntegrityHash(capsule);

    if (capsule.integrity_sha3_512 !== computedHash) {
      errors.push({
        gate: 'G16',
        path: '$.integrity_sha3_512',
        message: 'integrity_sha3_512 does not match computed SHA3-512 digest for canonical payload.',
      });
    }

    return computedHash;
  } catch (error: unknown) {
    errors.push({
      gate: 'G16',
      path: '$.integrity_sha3_512',
      message:
        error instanceof Error
          ? `Failed to compute integrity seal: ${error.message}`
          : 'Failed to compute integrity seal.',
    });
    return undefined;
  }
}
