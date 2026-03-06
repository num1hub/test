import { z } from 'zod';
import type { SovereignCapsule } from '@/types/capsule';
import { BRANCH_NAME_REGEX } from '@/types/branch';

export type BranchName = string;

export const branchNameSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .refine((value) => BRANCH_NAME_REGEX.test(value), {
    message:
      'Invalid branch name. Use lowercase letters, digits, dot, underscore, or hyphen.',
  });

export type FieldChangeType = 'added' | 'removed' | 'modified';

export type SemanticTag =
  | 'status-transition'
  | 'priority-change'
  | 'due-date-change'
  | 'progress-change'
  | 'effort-change'
  | 'content-change'
  | 'confidence-change'
  | 'link-change'
  | 'capsule-added'
  | 'capsule-removed';

export interface FieldChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: FieldChangeType;
  semanticTag?: SemanticTag;
}

export interface SemanticEvent {
  type: SemanticTag;
  capsuleId: string;
  path?: string;
  message: string;
  oldValue?: unknown;
  newValue?: unknown;
  severity: 'info' | 'warning' | 'critical';
}

export interface NodeChange {
  id: string;
  capsuleType?: string;
  summary?: string;
  before?: SovereignCapsule;
  after?: SovereignCapsule;
  changes: FieldChange[];
  semanticEvents: SemanticEvent[];
}

export interface LinkChange {
  source: string;
  target: string;
  relation: string;
  change: 'added' | 'removed' | 'modified';
  oldRelation?: string;
  newRelation?: string;
  oldWeight?: number;
  newWeight?: number;
  oldLink?: Record<string, unknown>;
  newLink?: Record<string, unknown>;
}

export interface DiffMetrics {
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
  addedLinks: number;
  removedLinks: number;
  modifiedLinks: number;
  semanticEventCount: number;
  estimatedTimeImpactHours: number;
  estimatedCostImpact: number;
  durationMs: number;
  cacheHit: boolean;
  scopedCapsuleCount: number;
}

export interface TaskCapsule {
  id: string;
  kind:
    | 'create-capsule'
    | 'remove-capsule'
    | 'update-field'
    | 'add-link'
    | 'remove-link'
    | 'resolve-conflict';
  title: string;
  description: string;
  status: 'todo';
  priority: 'low' | 'medium' | 'high' | 'critical';
  capsuleId?: string;
  path?: string;
  sourceBranch: string;
  targetBranch: string;
  estimatedHours?: number;
  metadata?: Record<string, unknown>;
}

export type ConflictType =
  | 'field'
  | 'link'
  | 'delete-vs-modify'
  | 'modify-vs-delete'
  | 'add-collision'
  | 'type-mismatch'
  | 'missing-common-ancestor'
  | 'unsupported-cross-lineage';

export interface Conflict {
  capsuleId: string;
  path: string;
  conflictType: ConflictType;
  message: string;
  baseValue?: unknown;
  sourceValue?: unknown;
  targetValue?: unknown;
}

export interface DiffScope {
  scopeType?: 'capsule' | 'project' | 'vault';
  scopeRootId?: string;
  capsuleIds?: string[];
  recursive?: boolean;
}

export interface DiffOptions extends DiffScope {
  cascadeDeletes?: boolean;
  ignorePaths?: string[];
  textMode?: 'exact' | 'levenshtein';
}

export interface DiffResult {
  branchA: BranchName;
  branchB: BranchName;
  scope: DiffScope;
  added: SovereignCapsule[];
  removed: Array<{ id: string; summary: string; capsuleType?: string }>;
  modified: NodeChange[];
  linkChanges: LinkChange[];
  semanticEvents: SemanticEvent[];
  metrics: DiffMetrics;
  actionPlan: TaskCapsule[];
  conflicts?: Conflict[];
  summary?: string;
}

export type ConflictResolution = 'manual' | 'source-wins' | 'target-wins';

export interface MergeOptions {
  sourceBranch: BranchName;
  targetBranch: BranchName;
  conflictResolution?: ConflictResolution;
  scopeType?: 'capsule' | 'project' | 'vault';
  scopeRootId?: string;
  capsuleIds?: string[];
  recursive?: boolean;
  cascadeDeletes?: boolean;
  createLegacy?: boolean;
  dryRun?: boolean;
}

export interface MergeResult {
  applied: boolean;
  dryRun: boolean;
  sourceBranch: BranchName;
  targetBranch: BranchName;
  writtenIds: string[];
  tombstonedIds: string[];
  skippedIds: string[];
  conflicts: Conflict[];
  diff: DiffResult;
}

export interface BranchManifest {
  name: BranchName;
  sourceBranch: BranchName;
  sourceProjectId: string | null;
  capsuleIds: string[];
  createdAt: string;
  updatedAt: string;
  description?: string;
  archived?: boolean;
}

export interface BranchInfo extends BranchManifest {
  isDefault: boolean;
  materialized: number;
  tombstoned: number;
}

export const createBranchRequestSchema = z
  .object({
    sourceProjectId: z.string().min(1).optional(),
    sourceCapsuleId: z.string().min(1).optional(),
    sourceBranch: branchNameSchema.default('real'),
    newBranchName: branchNameSchema,
    description: z.string().optional(),
    recursive: z.boolean().default(true),
  })
  .refine((data) => Boolean(data.sourceProjectId || data.sourceCapsuleId), {
    message: 'sourceProjectId or sourceCapsuleId is required',
  });

export const batchDiffRequestSchema = z.object({
  branchA: branchNameSchema,
  branchB: branchNameSchema,
  scopeType: z.enum(['capsule', 'project', 'vault']).optional(),
  scopeRootId: z.string().optional(),
  capsuleIds: z.array(z.string()).optional(),
  recursive: z.boolean().default(false),
  cascadeDeletes: z.boolean().default(false),
  ignorePaths: z.array(z.string()).optional(),
  includeSummary: z.boolean().default(true),
});

export const mergeOptionsSchema = z.object({
  sourceBranch: branchNameSchema,
  targetBranch: branchNameSchema,
  conflictResolution: z.enum(['manual', 'source-wins', 'target-wins']).default('manual'),
  scopeType: z.enum(['capsule', 'project', 'vault']).optional(),
  scopeRootId: z.string().optional(),
  capsuleIds: z.array(z.string()).optional(),
  recursive: z.boolean().default(false),
  cascadeDeletes: z.boolean().default(false),
  createLegacy: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const branchManifestSchema = z.object({
  name: z.string(),
  sourceBranch: z.string(),
  sourceProjectId: z.string().nullable(),
  capsuleIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  description: z.string().optional(),
  archived: z.boolean().optional(),
});

export const branchInfoSchema = branchManifestSchema.extend({
  isDefault: z.boolean(),
  materialized: z.number(),
  tombstoned: z.number(),
});

export const diffScopeSchema = z.object({
  scopeType: z.enum(['capsule', 'project', 'vault']).optional(),
  scopeRootId: z.string().optional(),
  capsuleIds: z.array(z.string()).optional(),
  recursive: z.boolean().optional(),
});

export const diffMetricsSchema = z.object({
  addedCount: z.number(),
  removedCount: z.number(),
  modifiedCount: z.number(),
  unchangedCount: z.number(),
  addedLinks: z.number(),
  removedLinks: z.number(),
  modifiedLinks: z.number(),
  semanticEventCount: z.number(),
  estimatedTimeImpactHours: z.number(),
  estimatedCostImpact: z.number(),
  durationMs: z.number(),
  cacheHit: z.boolean(),
  scopedCapsuleCount: z.number(),
});

export const fieldChangeSchema = z.object({
  path: z.string(),
  oldValue: jsonValueSchema,
  newValue: jsonValueSchema,
  changeType: z.enum(['added', 'removed', 'modified']),
  semanticTag: z
    .enum([
      'status-transition',
      'priority-change',
      'due-date-change',
      'progress-change',
      'effort-change',
      'content-change',
      'confidence-change',
      'link-change',
      'capsule-added',
      'capsule-removed',
    ])
    .optional(),
});

export const semanticEventSchema = z.object({
  type: z.enum([
    'status-transition',
    'priority-change',
    'due-date-change',
    'progress-change',
    'effort-change',
    'content-change',
    'confidence-change',
    'link-change',
    'capsule-added',
    'capsule-removed',
  ]),
  capsuleId: z.string(),
  path: z.string().optional(),
  message: z.string(),
  oldValue: jsonValueSchema.optional(),
  newValue: jsonValueSchema.optional(),
  severity: z.enum(['info', 'warning', 'critical']),
});

export const nodeChangeSchema = z.object({
  id: z.string(),
  capsuleType: z.string().optional(),
  summary: z.string().optional(),
  before: z.custom<SovereignCapsule>().optional(),
  after: z.custom<SovereignCapsule>().optional(),
  changes: z.array(fieldChangeSchema),
  semanticEvents: z.array(semanticEventSchema),
});

export const linkChangeSchema = z.object({
  source: z.string(),
  target: z.string(),
  relation: z.string(),
  change: z.enum(['added', 'removed', 'modified']),
  oldRelation: z.string().optional(),
  newRelation: z.string().optional(),
  oldWeight: z.number().optional(),
  newWeight: z.number().optional(),
  oldLink: z.record(z.string(), jsonValueSchema).optional(),
  newLink: z.record(z.string(), jsonValueSchema).optional(),
});

export const taskCapsuleSchema = z.object({
  id: z.string(),
  kind: z.enum([
    'create-capsule',
    'remove-capsule',
    'update-field',
    'add-link',
    'remove-link',
    'resolve-conflict',
  ]),
  title: z.string(),
  description: z.string(),
  status: z.literal('todo'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  capsuleId: z.string().optional(),
  path: z.string().optional(),
  sourceBranch: z.string(),
  targetBranch: z.string(),
  estimatedHours: z.number().optional(),
  metadata: z.record(z.string(), jsonValueSchema).optional(),
});

export const conflictSchema = z.object({
  capsuleId: z.string(),
  path: z.string(),
  conflictType: z.enum([
    'field',
    'link',
    'delete-vs-modify',
    'modify-vs-delete',
    'add-collision',
    'type-mismatch',
    'missing-common-ancestor',
    'unsupported-cross-lineage',
  ]),
  message: z.string(),
  baseValue: jsonValueSchema.optional(),
  sourceValue: jsonValueSchema.optional(),
  targetValue: jsonValueSchema.optional(),
});

export const diffResultSchema = z.object({
  branchA: z.string(),
  branchB: z.string(),
  scope: diffScopeSchema,
  added: z.array(z.custom<SovereignCapsule>()),
  removed: z.array(
    z.object({
      id: z.string(),
      summary: z.string(),
      capsuleType: z.string().optional(),
    }),
  ),
  modified: z.array(nodeChangeSchema),
  linkChanges: z.array(linkChangeSchema),
  semanticEvents: z.array(semanticEventSchema),
  metrics: diffMetricsSchema,
  actionPlan: z.array(taskCapsuleSchema),
  conflicts: z.array(conflictSchema).optional(),
  summary: z.string().optional(),
});

export const mergeResultSchema = z.object({
  applied: z.boolean(),
  dryRun: z.boolean(),
  sourceBranch: z.string(),
  targetBranch: z.string(),
  writtenIds: z.array(z.string()),
  tombstonedIds: z.array(z.string()),
  skippedIds: z.array(z.string()),
  conflicts: z.array(conflictSchema),
  diff: diffResultSchema,
});
