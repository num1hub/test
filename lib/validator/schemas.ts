import { z } from 'zod';
import {
  CANONICAL_RELATION_TYPES,
  CONFIDENCE_VECTOR_KEYS,
  type ConfidenceVectorInput,
  type ConfidenceVectorObject,
  type CapsuleRoot,
  type CapsuleStatus,
  type CapsuleSubtype,
  type CapsuleType,
} from '@/lib/validator/types';

const capsuleStatusEnum = z.enum([
  'draft',
  'active',
  'frozen',
  'archived',
  'legacy',
  'sovereign',
  'quarantined',
]) satisfies z.ZodType<CapsuleStatus>;

const capsuleTypeEnum = z.enum([
  'foundation',
  'concept',
  'operations',
  'physical_object',
  'project',
]) satisfies z.ZodType<CapsuleType>;

const capsuleSubtypeEnum = z.enum(['atomic', 'hub']) satisfies z.ZodType<CapsuleSubtype>;

const canonicalRelationTypeEnum = z.enum(CANONICAL_RELATION_TYPES);

const semanticHashSchema = z
  .string()
  .regex(/^(?:[a-z0-9]+-){7}[a-z0-9]+$/, 'Expected 8 lowercase alphanumeric tokens');

export const confidenceVectorObjectSchema = z
  .object({
    extraction: z.number(),
    synthesis: z.number(),
    linking: z.number(),
    provenance_coverage: z.number(),
    validation_score: z.number(),
    contradiction_pressure: z.number(),
  })
  .strict() satisfies z.ZodType<ConfidenceVectorObject>;

export const confidenceVectorSchema = z.union([
  z.array(z.number()).length(CONFIDENCE_VECTOR_KEYS.length),
  confidenceVectorObjectSchema,
]) satisfies z.ZodType<ConfidenceVectorInput>;

const metadataSchema = z
  .object({
    capsule_id: z.string().min(1),
    type: capsuleTypeEnum,
    subtype: capsuleSubtypeEnum,
    status: capsuleStatusEnum,
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Expected semantic version x.y.z'),
    author: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    name: z.string().optional(),
    semantic_hash: semanticHashSchema,
    source: z
      .object({
        uri: z.string().optional(),
        sha256: z.string().optional(),
        type: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .passthrough();

const corePayloadSchema = z
  .object({
    content_type: z.string().min(1),
    content: z.string(),
    truncation_note: z.string().optional(),
  })
  .passthrough();

const neuroConcentrateSchema = z
  .object({
    summary: z.string(),
    confidence_vector: confidenceVectorSchema,
    keywords: z.array(z.string()),
    semantic_hash: semanticHashSchema,
  })
  .passthrough();

const linkSchema = z
  .object({
    target_id: z.string().min(1),
    relation_type: z.union([canonicalRelationTypeEnum, z.literal('refutes'), z.string().min(1)]),
  })
  .passthrough();

const recursiveLayerSchema = z
  .object({
    links: z.array(linkSchema),
  })
  .passthrough();

export const capsuleRootSchema = z
  .object({
    metadata: metadataSchema,
    core_payload: corePayloadSchema,
    neuro_concentrate: neuroConcentrateSchema,
    recursive_layer: recursiveLayerSchema,
    integrity_sha3_512: z
      .string()
      .regex(/^[a-f0-9]{128}$/, 'Expected 128-character lowercase hex SHA3-512 hash'),
  })
  .strict() satisfies z.ZodType<CapsuleRoot>;
