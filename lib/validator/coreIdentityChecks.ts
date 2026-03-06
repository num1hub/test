import { STANDARD_CONTENT_TYPES } from '@/lib/validator/gates';
import type { ValidationIssue } from '@/lib/validator/types';
import {
  getConfidenceMetric,
  isRecordObject,
  isValidSemanticHash,
  validateConfidenceVectorRange,
  wordCount,
  normalizeConfidenceVector,
} from '@/lib/validator/utils';

export function validateProvenanceCoverage(capsule: unknown, errors: ValidationIssue[]): void {
  const provenanceCoverage = getConfidenceMetric(capsule, 'provenance_coverage');
  if (typeof provenanceCoverage !== 'number' || Number.isNaN(provenanceCoverage)) return;

  if (provenanceCoverage < 0.85) {
    errors.push({
      gate: 'G04',
      path: '$.neuro_concentrate.confidence_vector.provenance_coverage',
      message: 'provenance_coverage must be >= 0.85.',
    });
  }

  if (provenanceCoverage >= 1.0 || !isRecordObject(capsule)) return;

  const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
  const source = metadata && isRecordObject(metadata.source) ? metadata.source : null;
  if (!source || typeof source.uri !== 'string' || source.uri.trim().length === 0) {
    errors.push({
      gate: 'G04',
      path: '$.metadata.source.uri',
      message: 'metadata.source.uri is required when provenance_coverage is below 1.0.',
    });
  }
}

export function validateContentType(capsule: unknown, warnings: ValidationIssue[]): void {
  if (!isRecordObject(capsule)) return;
  const payload = isRecordObject(capsule.core_payload) ? capsule.core_payload : null;
  if (!payload || typeof payload.content_type !== 'string') return;

  if (!STANDARD_CONTENT_TYPES.has(payload.content_type)) {
    warnings.push({
      gate: 'G05',
      path: '$.core_payload.content_type',
      message: `Non-standard content_type "${payload.content_type}". Recommended: markdown|json|text.`,
    });
  }
}

export function validatePayloadIntegrity(capsule: unknown, errors: ValidationIssue[]): void {
  if (!isRecordObject(capsule)) return;
  const payload = isRecordObject(capsule.core_payload) ? capsule.core_payload : null;
  if (!payload) return;

  if (payload.truncation_note !== undefined && typeof payload.truncation_note !== 'string') {
    errors.push({
      gate: 'G06',
      path: '$.core_payload.truncation_note',
      message: 'truncation_note must be a string when provided.',
    });
  }
}

export function validateSummary(capsule: unknown, errors: ValidationIssue[]): void {
  if (!isRecordObject(capsule)) return;
  const neuro = isRecordObject(capsule.neuro_concentrate) ? capsule.neuro_concentrate : null;
  if (!neuro || typeof neuro.summary !== 'string') return;

  const summaryWords = wordCount(neuro.summary);
  if (summaryWords < 70 || summaryWords > 160) {
    errors.push({
      gate: 'G07',
      path: '$.neuro_concentrate.summary',
      message: `Summary word count must be 70-160; got ${summaryWords}.`,
    });
  }
}

export function validateKeywords(capsule: unknown, errors: ValidationIssue[]): void {
  if (!isRecordObject(capsule)) return;
  const neuro = isRecordObject(capsule.neuro_concentrate) ? capsule.neuro_concentrate : null;
  if (!neuro || !Array.isArray(neuro.keywords)) return;

  if (neuro.keywords.length < 5 || neuro.keywords.length > 15) {
    errors.push({
      gate: 'G08',
      path: '$.neuro_concentrate.keywords',
      message: `keywords length must be 5-15; got ${neuro.keywords.length}.`,
    });
  }
}

export function validateSemanticHashes(capsule: unknown, errors: ValidationIssue[]): void {
  if (!isRecordObject(capsule)) return;

  const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
  const neuro = isRecordObject(capsule.neuro_concentrate) ? capsule.neuro_concentrate : null;

  const metadataHash = typeof metadata?.semantic_hash === 'string' ? metadata.semantic_hash : '';
  const neuroHash = typeof neuro?.semantic_hash === 'string' ? neuro.semantic_hash : '';

  if (!isValidSemanticHash(metadataHash)) {
    errors.push({
      gate: 'G09',
      path: '$.metadata.semantic_hash',
      message: 'metadata.semantic_hash must contain 8 lowercase alphanumeric hyphen-separated tokens.',
    });
  }

  if (!isValidSemanticHash(neuroHash)) {
    errors.push({
      gate: 'G09',
      path: '$.neuro_concentrate.semantic_hash',
      message:
        'neuro_concentrate.semantic_hash must contain 8 lowercase alphanumeric hyphen-separated tokens.',
    });
  }
}

export function validateSemanticHashParity(capsule: unknown, errors: ValidationIssue[]): void {
  if (!isRecordObject(capsule)) return;
  const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
  const neuro = isRecordObject(capsule.neuro_concentrate) ? capsule.neuro_concentrate : null;
  if (!metadata || !neuro) return;

  if (
    typeof metadata.semantic_hash === 'string' &&
    typeof neuro.semantic_hash === 'string' &&
    metadata.semantic_hash !== neuro.semantic_hash
  ) {
    errors.push({
      gate: 'G10',
      path: '$.metadata.semantic_hash',
      message: 'metadata.semantic_hash must match neuro_concentrate.semantic_hash.',
    });
  }
}

export function validateConfidenceVector(capsule: unknown, errors: ValidationIssue[]): void {
  if (!isRecordObject(capsule)) return;
  const neuro = isRecordObject(capsule.neuro_concentrate) ? capsule.neuro_concentrate : null;
  if (!neuro) return;

  const normalized = normalizeConfidenceVector(
    neuro.confidence_vector as
      | number[]
      | {
          extraction: number;
          synthesis: number;
          linking: number;
          provenance_coverage: number;
          validation_score: number;
          contradiction_pressure: number;
        },
  );

  if (!normalized) {
    errors.push({
      gate: 'G15',
      path: '$.neuro_concentrate.confidence_vector',
      message:
        'confidence_vector must be either a six-number array or an object with six canonical dimensions.',
    });
    return;
  }

  const { ok, invalidKeys } = validateConfidenceVectorRange(normalized);
  if (!ok) {
    errors.push({
      gate: 'G15',
      path: '$.neuro_concentrate.confidence_vector',
      message: `confidence_vector values must be in [0,1]. Invalid dimensions: ${invalidKeys.join(', ')}`,
    });
  }
}
