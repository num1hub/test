import type { AutoFixPolicy, AutoFixResult, CapsuleRoot } from '@/lib/validator/types';
import { computeIntegrityHash, isRecordObject, isValidSemanticHash, normalizeConfidenceVector } from '@/lib/validator/utils';

export const DEFAULT_AUTOFIX_POLICY: Required<AutoFixPolicy> = {
  syncSemanticHashParity: true,
  replaceRefutesRelation: true,
  normalizeConfidenceVectorShape: true,
  recomputeIntegritySeal: true,
};

const cloneUnknown = <T>(input: T): T => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(input);
  }
  return JSON.parse(JSON.stringify(input)) as T;
};

/**
 * Applies non-destructive, format-safe fixes for known validation issues.
 */
export function autoFixCapsuleData<T = unknown>(
  capsule: T,
  policy: AutoFixPolicy = DEFAULT_AUTOFIX_POLICY,
): AutoFixResult<T> {
  const mergedPolicy: Required<AutoFixPolicy> = {
    ...DEFAULT_AUTOFIX_POLICY,
    ...policy,
  };

  const fixedData = cloneUnknown(capsule);
  const appliedFixes: string[] = [];

  if (!isRecordObject(fixedData)) {
    return { fixedData, appliedFixes };
  }

  const neuro = isRecordObject(fixedData.neuro_concentrate) ? fixedData.neuro_concentrate : null;
  const metadata = isRecordObject(fixedData.metadata) ? fixedData.metadata : null;
  const recursive = isRecordObject(fixedData.recursive_layer) ? fixedData.recursive_layer : null;

  if (mergedPolicy.normalizeConfidenceVectorShape && neuro) {
    const normalized = normalizeConfidenceVector(neuro.confidence_vector as CapsuleRoot['neuro_concentrate']['confidence_vector']);
    if (normalized && Array.isArray(neuro.confidence_vector)) {
      neuro.confidence_vector = normalized;
      appliedFixes.push('G15: normalized confidence_vector array to object shape');
    }
  }

  if (mergedPolicy.syncSemanticHashParity && metadata && neuro) {
    const metaHash = typeof metadata.semantic_hash === 'string' ? metadata.semantic_hash : '';
    const neuroHash = typeof neuro.semantic_hash === 'string' ? neuro.semantic_hash : '';

    const metaValid = isValidSemanticHash(metaHash);
    const neuroValid = isValidSemanticHash(neuroHash);

    if (metaValid && !neuroValid) {
      neuro.semantic_hash = metaHash;
      appliedFixes.push('G10: copied metadata.semantic_hash to neuro_concentrate.semantic_hash');
    } else if (neuroValid && !metaValid) {
      metadata.semantic_hash = neuroHash;
      appliedFixes.push('G10: copied neuro_concentrate.semantic_hash to metadata.semantic_hash');
    }
  }

  if (mergedPolicy.replaceRefutesRelation && recursive && Array.isArray(recursive.links)) {
    let replacedCount = 0;

    recursive.links = recursive.links.map((link) => {
      if (!isRecordObject(link)) return link;

      if (link.relation_type === 'refutes') {
        replacedCount += 1;
        return {
          ...link,
          relation_type: 'contradicts',
        };
      }

      return link;
    });

    if (replacedCount > 0) {
      appliedFixes.push(`G11: replaced ${replacedCount} refutes relation(s) with contradicts`);
    }
  }

  if (mergedPolicy.recomputeIntegritySeal) {
    try {
      const computedHash = computeIntegrityHash(fixedData);
      const fixedRecord = fixedData as Record<string, unknown>;
      if (
        typeof fixedRecord['integrity_sha3_512'] !== 'string' ||
        fixedRecord['integrity_sha3_512'] !== computedHash
      ) {
        fixedRecord['integrity_sha3_512'] = computedHash;
        appliedFixes.push('G16: recomputed integrity_sha3_512');
      }
    } catch {
      // noop: caller validation will surface integrity/shape errors.
    }
  }

  return {
    fixedData,
    appliedFixes,
  };
}
