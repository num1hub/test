import { z } from 'zod';

import { aiWalletProviderIdSchema } from '@/lib/aiWalletSchema';

export const vaultStewardModeSchema = z.enum(['continuous', 'nightly']);
export const vaultStewardWorkstreamSchema = z.enum(['decomposition', 'markup', 'graph_refactor', 'mixed']);
export const vaultStewardPrioritySchema = z.enum(['high', 'medium', 'low']);

export const vaultStewardConfigSchema = z.object({
  version: z.literal(1),
  enabled: z.boolean(),
  provider: aiWalletProviderIdSchema.nullable(),
  model: z.string().trim().max(160).nullable(),
  mode: vaultStewardModeSchema,
  interval_minutes: z.number().int().min(1).max(1440),
  night_start_hour: z.number().int().min(0).max(23),
  night_end_hour: z.number().int().min(0).max(23),
  timezone: z.string().trim().max(120).nullable(),
  max_targets_per_run: z.number().int().min(1).max(12),
  updated_at: z.string().datetime(),
});

export const vaultStewardRuntimeSchema = z.object({
  version: z.literal(1),
  pid: z.number().int().positive().nullable(),
  status: z.enum(['stopped', 'starting', 'running']),
  started_at: z.string().datetime().nullable(),
  last_heartbeat_at: z.string().datetime().nullable(),
  last_run_at: z.string().datetime().nullable(),
  last_exit_at: z.string().datetime().nullable(),
  latest_run_id: z.string().trim().nullable(),
  loop_count: z.number().int().min(0),
  idle_streak: z.number().int().min(0).default(0),
  next_scheduled_at: z.string().datetime().nullable().default(null),
  last_error: z.string().trim().nullable(),
  updated_at: z.string().datetime(),
});

export const vaultStewardTargetSchema = z.object({
  capsule_id: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  priority: vaultStewardPrioritySchema.default('medium'),
});

export const vaultStewardDraftJobSchema = z.object({
  label: z.string().trim().min(1),
  goal: z.string().trim().min(1),
  workstream: vaultStewardWorkstreamSchema.default('mixed'),
  capsule_ids: z.array(z.string().trim().min(1)).min(1).max(12),
  suggested_branch: z.enum(['dream', 'real']).default('dream'),
  needs_human_confirmation: z.boolean().default(true),
});

export const vaultStewardJobSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  goal: z.string().trim().min(1),
  workstream: vaultStewardWorkstreamSchema,
  capsule_ids: z.array(z.string().trim().min(1)).min(1).max(12),
  suggested_branch: z.enum(['dream', 'real']).default('dream'),
  needs_human_confirmation: z.boolean().default(true),
  created_at: z.string().datetime(),
  source_run_id: z.string().trim().min(1),
  status: z.enum(['queued', 'accepted', 'completed', 'dismissed']).default('queued'),
});

export const vaultStewardLaneReportSchema = z.object({
  id: z.enum(['scout', 'foreman', 'reviewer', 'maintainer']),
  label: z.string().trim().min(1),
  engine: z.enum(['provider', 'local_codex']),
  status: z.enum(['completed', 'failed', 'skipped']),
  provider: z.string().trim().nullable(),
  model: z.string().trim().nullable(),
  summary: z.string().trim().min(1),
  error: z.string().trim().nullable().default(null),
});

export const vaultStewardLaneStateSchema = z.object({
  id: z.enum(['scout', 'foreman', 'reviewer', 'maintainer']),
  label: z.string().trim().min(1),
  engine: z.enum(['provider', 'local_codex']),
  state: z.enum(['ready', 'cooldown', 'unavailable']),
  available: z.boolean(),
  provider: z.string().trim().nullable(),
  model: z.string().trim().nullable(),
  plan_type: z.string().trim().nullable().default(null),
  detail: z.string().trim().min(1),
  cooldown_until: z.string().datetime().nullable().default(null),
});

export const vaultStewardSwarmSchema = z.object({
  mode: z.enum(['unavailable', 'provider_only', 'hybrid_ready', 'hybrid_active']),
  summary: z.string().trim().min(1),
  ready_provider_count: z.number().int().min(0),
  default_provider: z.string().trim().nullable(),
  codex_available: z.boolean(),
  codex_plan_type: z.string().trim().nullable().default(null),
  lanes: z.array(vaultStewardLaneStateSchema).max(4),
});

export const vaultStewardRunSchema = z.object({
  run_id: z.string().trim().min(1),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
  status: z.enum(['completed', 'failed', 'skipped']),
  reason: z.string().trim().min(1),
  provider: aiWalletProviderIdSchema.nullable(),
  model: z.string().trim().nullable(),
  overview: z.string().trim().min(1),
  workstream: vaultStewardWorkstreamSchema,
  observations: z.array(z.string().trim().min(1)).max(12),
  suggested_actions: z.array(z.string().trim().min(1)).max(12),
  targets: z.array(vaultStewardTargetSchema).max(12),
  proposed_jobs: z.array(vaultStewardJobSchema).max(12),
  executed_jobs: z.array(vaultStewardJobSchema).max(12).default([]),
  lane_reports: z.array(vaultStewardLaneReportSchema).max(5).default([]),
  raw_text: z.string().nullable(),
  graph_snapshot: z.object({
    total_capsules: z.number().int().min(0),
    orphaned_capsules: z.number().int().min(0),
    by_type: z.record(z.string(), z.number().int().min(0)),
  }),
});

export const vaultStewardQueueSchema = z.object({
  version: z.literal(1),
  updated_at: z.string().datetime(),
  jobs: z.array(vaultStewardJobSchema),
});

export const vaultStewardUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  provider: aiWalletProviderIdSchema.or(z.literal('auto')).nullable().optional(),
  model: z.string().trim().max(160).optional(),
  mode: vaultStewardModeSchema.optional(),
  interval_minutes: z.number().int().min(1).max(1440).optional(),
  night_start_hour: z.number().int().min(0).max(23).optional(),
  night_end_hour: z.number().int().min(0).max(23).optional(),
  timezone: z.string().trim().max(120).nullable().optional(),
  max_targets_per_run: z.number().int().min(1).max(12).optional(),
});

export const aiOutputSchema = z.object({
  overview: z.string().trim().min(1),
  workstream: vaultStewardWorkstreamSchema.default('mixed'),
  observations: z.array(z.string().trim().min(1)).max(12).default([]),
  suggested_actions: z.array(z.string().trim().min(1)).max(12).default([]),
  targets: z.array(vaultStewardTargetSchema).max(12).default([]),
  proposed_jobs: z.array(vaultStewardDraftJobSchema).max(12).default([]),
});

export const codexSupervisorOutputSchema = z.object({
  overview: z.string().trim().min(1),
  workstream: vaultStewardWorkstreamSchema.default('mixed'),
  observations: z.array(z.string().trim().min(1)).max(12).default([]),
  suggested_actions: z.array(z.string().trim().min(1)).max(12).default([]),
  targets: z.array(vaultStewardTargetSchema).max(12).default([]),
  proposed_jobs: z.array(vaultStewardDraftJobSchema).max(12).default([]),
  supervisor_summary: z.string().trim().min(1),
});

export const codexReviewerOutputSchema = z.object({
  review_summary: z.string().trim().min(1),
  operator_focus: z.array(z.string().trim().min(1)).max(8).default([]),
  risk_flags: z.array(z.string().trim().min(1)).max(8).default([]),
  cancel_job_ids: z.array(z.string().trim().min(1)).max(12).default([]),
});

export const executorOutputSchema = z.object({
  updates: z
    .array(
      z.object({
        capsule_id: z.string().trim().min(1),
        updated_summary: z.string().trim().min(1),
        added_keywords: z
          .array(z.string().trim().min(1))
          .default([])
          .transform((values) => values.slice(0, 8)),
        maintenance_note: z.string().trim().min(1),
        rationale: z.string().trim().min(1),
      }),
    )
    .max(12)
    .default([]),
});

export type VaultStewardConfig = z.infer<typeof vaultStewardConfigSchema>;
export type VaultStewardRuntime = z.infer<typeof vaultStewardRuntimeSchema>;
export type VaultStewardRun = z.infer<typeof vaultStewardRunSchema>;
export type VaultStewardJob = z.infer<typeof vaultStewardJobSchema>;
export type VaultStewardQueue = z.infer<typeof vaultStewardQueueSchema>;
export type VaultStewardUpdateInput = z.infer<typeof vaultStewardUpdateSchema>;
export type VaultStewardWorkstream = z.infer<typeof vaultStewardWorkstreamSchema>;
