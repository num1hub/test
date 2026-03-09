import { z } from 'zod';

import {
  CODEX_FOREMAN_MAX_QUEUE_CONTEXT,
  CODEX_FOREMAN_MAX_SCOUT_ACTIONS,
  CODEX_FOREMAN_MAX_SCOUT_JOBS,
  CODEX_FOREMAN_MAX_SCOUT_OBSERVATIONS,
  CODEX_FOREMAN_MAX_SCOUT_TARGETS,
} from './constants';
import {
  aiOutputSchema,
  codexReviewerOutputSchema,
  codexSupervisorOutputSchema,
  executorOutputSchema,
  vaultStewardTargetSchema,
  vaultStewardWorkstreamSchema,
  VaultStewardJob,
  VaultStewardQueue,
} from './schemas';
import { shouldCooldownCapsule, getCapsuleQueueHistory, type VaultSignalSummary } from './queue-planning';

import type { SovereignCapsule } from '@/types/capsule';

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toNumberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function buildFallbackAnalysis(summary: VaultSignalSummary): z.infer<typeof aiOutputSchema> {
  return aiOutputSchema.parse({
    overview:
      'Vault Steward could not parse a structured JSON response, so it fell back to the highest-signal capsule maintenance targets extracted from the current graph.',
    workstream: 'mixed' as const,
    observations: summary.candidates.flatMap((candidate) => candidate.reasons.slice(0, 1)).slice(0, 6),
    suggested_actions: summary.candidates
      .slice(0, 4)
      .map((candidate) => `Review ${candidate.capsule_id} for ${candidate.reasons[0] ?? 'maintenance'}.`),
    targets: summary.candidates.slice(0, 4).map((candidate) => ({
      capsule_id: candidate.capsule_id,
      reason: candidate.reasons[0] ?? 'graph maintenance candidate',
      priority: candidate.outbound_links >= 10 ? 'high' : 'medium',
    })),
    proposed_jobs: [],
  });
}

function extractFirstJsonObject(raw: string): unknown {
  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i) ?? raw.match(/```\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || raw.trim();
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as unknown;
    }
    throw new Error('No valid JSON object found in model output');
  }
}

function buildPrompt(
  summary: VaultSignalSummary,
  queue: VaultStewardQueue,
  options?: { compact?: boolean },
): { system: string; prompt: string } {
  const compact = options?.compact ?? false;
  const queuedJobs = queue.jobs.filter((job) => job.status === 'queued' || job.status === 'accepted');
  const completedJobs = queue.jobs.filter((job) => job.status === 'completed');
  const queueHistory = getCapsuleQueueHistory(queue);
  const cooldownCapsules = uniqueBy(
    summary.inventory
      .map((entry) => entry.capsule_id)
      .filter((capsuleId) => shouldCooldownCapsule(queueHistory.get(capsuleId))),
    (entry) => entry,
  ).slice(0, 12);
  const compactInventoryIds = summary.inventory.map((entry) => entry.capsule_id);
  const system = [
    'You are Vault Steward, a conservative autonomous agent for the N1Hub capsule vault.',
    'Your job is to analyze the current capsule graph and emit maintenance jobs, not to invent new doctrine.',
    'Return strict JSON only.',
    'Never claim that a capsule should be changed without a concrete reason grounded in the provided graph snapshot.',
    'Prefer queueable maintenance work for the Dream branch over unsafe direct writes to Real.',
  ].join(' ');

  const prompt = [
    'Analyze the N1Hub capsule vault snapshot below and produce the next highest-value bounded maintenance jobs.',
    '',
    `Total capsules: ${summary.total_capsules}`,
    `Orphaned capsules: ${summary.orphaned_capsules}`,
    `Type distribution: ${Object.entries(summary.by_type)
      .sort((left, right) => right[1] - left[1])
      .map(([type, count]) => `${type}:${count}`)
      .join(', ')}`,
    '',
    ...(compact
      ? [
          'Compact capsule inventory ids (full vault coverage):',
          ...Array.from({ length: Math.ceil(compactInventoryIds.length / 12) }, (_, index) =>
            `- ${compactInventoryIds.slice(index * 12, index * 12 + 12).join(', ')}`,
          ),
        ]
      : [
          'Full capsule inventory snapshot:',
          ...summary.inventory.map(
            (entry) =>
              `- ${entry.capsule_id} | ${entry.type}/${entry.subtype}/${entry.status} | progress=${entry.progress ?? 'n/a'} | links=${entry.outbound_links}/${entry.inbound_links} | summary=${entry.summary_length} | keywords=${entry.keyword_count}`,
          ),
        ]),
    '',
    compact ? 'Compact candidate capsules:' : 'Candidate capsules:',
    ...summary.candidates.map((candidate) =>
      compact
        ? `- ${candidate.capsule_id} | ${candidate.type}/${candidate.subtype}/${candidate.status} | links=${candidate.outbound_links}/${candidate.inbound_links} | summary=${candidate.summary_length} | keywords=${candidate.keyword_count} | reasons=${candidate.reasons.join(' | ')}`
        : [
            `- ${candidate.capsule_id}`,
            `  name: ${candidate.name}`,
            `  type/subtype/status: ${candidate.type}/${candidate.subtype}/${candidate.status}`,
            `  links: outbound=${candidate.outbound_links} inbound=${candidate.inbound_links}`,
            `  summary_length: ${candidate.summary_length}`,
            `  keywords: ${candidate.keyword_count}`,
            `  reasons: ${candidate.reasons.join(' | ')}`,
          ].join('\n'),
    ),
    '',
    'Existing queue context:',
    `- queued_or_accepted_jobs: ${queuedJobs.length}`,
    `- completed_jobs: ${completedJobs.length}`,
    ...(queuedJobs.length > 0
      ? [
          'Queued/accepted jobs:',
          ...queuedJobs.slice(0, 8).map((job) =>
            compact
              ? `- ${job.label} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`
              : `- ${job.label} :: ${job.goal} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`,
          ),
        ]
      : ['Queued/accepted jobs: none']),
    ...(completedJobs.length > 0
      ? [
          'Recently completed jobs:',
          ...completedJobs.slice(0, 8).map((job) =>
            compact
              ? `- ${job.label} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`
              : `- ${job.label} :: ${job.goal} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`,
          ),
        ]
      : ['Recently completed jobs: none']),
    '',
    'Capsules currently on maintenance cooldown because equivalent work is already in-flight or recently completed:',
    ...(cooldownCapsules.length > 0 ? cooldownCapsules.map((capsuleId) => `- ${capsuleId}`) : ['- none']),
    '',
    'Return JSON with this shape:',
    JSON.stringify(
      {
        overview: 'one short paragraph',
        workstream: 'decomposition | markup | graph_refactor | mixed',
        observations: ['short evidence-aware bullets'],
        suggested_actions: ['short next moves'],
        targets: [
          {
            capsule_id: 'capsule.foundation.example.v1',
            reason: 'why it matters now',
            priority: 'high',
          },
        ],
        proposed_jobs: [
          {
            label: 'short operator-facing job title',
            goal: 'what should be improved',
            workstream: 'decomposition',
            capsule_ids: ['capsule.foundation.example.v1'],
            suggested_branch: 'dream',
            needs_human_confirmation: true,
          },
        ],
      },
      null,
      2,
    ),
    '',
    'Constraints:',
    '- Max 5 observations.',
    '- Max 5 suggested_actions.',
    '- Max 5 targets.',
    '- Max 5 proposed_jobs.',
    '- Prefer the Dream branch unless a Real write is obviously a factual correction.',
    '- Do not propose a job that duplicates a queued, accepted, or recently completed job with the same capsule_ids and workstream.',
  ].join('\n');

  return { system, prompt };
}

function buildScoutRepairPrompt(rawText: string): string {
  return [
    'The previous provider response for Vault Steward did not match the required strict JSON shape.',
    'Repair it into strict JSON only while preserving the original maintenance intent as closely as possible.',
    'Do not add markdown fences, explanation, or extra prose.',
    '',
    'Required JSON shape:',
    JSON.stringify(
      {
        overview: 'one short paragraph',
        workstream: 'decomposition | markup | graph_refactor | mixed',
        observations: ['short evidence-aware bullets'],
        suggested_actions: ['short next moves'],
        targets: [
          {
            capsule_id: 'capsule.foundation.example.v1',
            reason: 'why it matters now',
            priority: 'high',
          },
        ],
        proposed_jobs: [
          {
            label: 'short operator-facing job title',
            goal: 'what should be improved',
            workstream: 'decomposition',
            capsule_ids: ['capsule.foundation.example.v1'],
            suggested_branch: 'dream',
            needs_human_confirmation: true,
          },
        ],
      },
      null,
      2,
    ),
    '',
    'Original response to repair:',
    rawText,
  ].join('\n');
}

function buildCodexSupervisorPrompt(
  summary: VaultSignalSummary,
  scout: { normalized: z.infer<typeof aiOutputSchema> },
  queue: VaultStewardQueue,
): string {
  const compactObservations = scout.normalized.observations.slice(0, CODEX_FOREMAN_MAX_SCOUT_OBSERVATIONS);
  const compactActions = scout.normalized.suggested_actions.slice(0, CODEX_FOREMAN_MAX_SCOUT_ACTIONS);
  const compactTargets = scout.normalized.targets.slice(0, CODEX_FOREMAN_MAX_SCOUT_TARGETS);
  const compactJobs = scout.normalized.proposed_jobs.slice(0, CODEX_FOREMAN_MAX_SCOUT_JOBS);
  const scoutTargets =
    compactTargets.length > 0
      ? scout.normalized.targets
          .slice(0, CODEX_FOREMAN_MAX_SCOUT_TARGETS)
          .map((target) => `- ${target.capsule_id} [${target.priority}] ${target.reason}`)
          .join('\n')
      : '- none';
  const scoutJobs =
    compactJobs.length > 0
      ? compactJobs
          .map(
            (job) =>
              `- ${job.label} :: ${job.goal} :: branch=${job.suggested_branch} :: capsules=${job.capsule_ids.join(', ')}`,
          )
          .join('\n')
      : '- none';
  const queuedJobs = queue.jobs.filter((job) => job.status === 'queued' || job.status === 'accepted');
  const completedJobs = queue.jobs.filter((job) => job.status === 'completed');

  return [
    'You are Codex Foreman inside the N1Hub Vault Steward swarm.',
    'A provider-backed scout has already analyzed the full capsule vault.',
    'Your job is to tighten and improve that plan, not to drift into unrelated work.',
    'Only propose bounded capsule-focused maintenance work grounded in the supplied graph snapshot and scout output.',
    'Act as a compact strategic pass. Prefer preserving a good scout plan over inventing a new one.',
    'If the scout plan is already sufficient or the queue already covers the maintenance need, return empty proposed_jobs.',
    'Return only JSON matching the provided schema.',
    '',
    `Graph totals: capsules=${summary.total_capsules}, orphaned=${summary.orphaned_capsules}`,
    `Type distribution: ${Object.entries(summary.by_type)
      .sort((left, right) => right[1] - left[1])
      .map(([type, count]) => `${type}:${count}`)
      .join(', ')}`,
    '',
    'Scout overview:',
    scout.normalized.overview,
    '',
    'Scout observations:',
    ...(compactObservations.length > 0 ? compactObservations.map((entry) => `- ${entry}`) : ['- none']),
    '',
    'Scout suggested actions:',
    ...(compactActions.length > 0 ? compactActions.map((entry) => `- ${entry}`) : ['- none']),
    '',
    'Scout targets:',
    scoutTargets,
    '',
    'Scout proposed jobs:',
    scoutJobs,
    '',
    'Existing queue context:',
    `Queued/accepted jobs: ${queuedJobs.length}`,
    ...(queuedJobs.length > 0
      ? queuedJobs
          .slice(0, CODEX_FOREMAN_MAX_QUEUE_CONTEXT)
          .map(
            (job) =>
              `- ${job.label} :: ${job.goal} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`,
          )
      : ['- none']),
    ...(completedJobs.length > 0
      ? [
          `Completed jobs: ${completedJobs.length}`,
          ...completedJobs
            .slice(0, CODEX_FOREMAN_MAX_QUEUE_CONTEXT)
            .map(
              (job) =>
                `- ${job.label} :: ${job.goal} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`,
            ),
        ]
      : ['Completed jobs: none']),
    '',
    'Top candidate capsules from the graph snapshot:',
    ...summary.candidates.slice(0, CODEX_FOREMAN_MAX_SCOUT_TARGETS).map((candidate) =>
      `- ${candidate.capsule_id} | ${candidate.type}/${candidate.subtype}/${candidate.status} | progress=${candidate.progress ?? 'n/a'} | links=${candidate.outbound_links}/${candidate.inbound_links} | reasons=${candidate.reasons.join(' | ')}`,
    ),
    '',
    'Refine this into the best next capsule-maintenance plan for the vault.',
    'Prefer fewer, sharper jobs over many vague ones.',
    'Keep the branch Dream unless a Real write is clearly a factual correction.',
    'Do not repeat jobs that are already queued, accepted, or recently completed.',
  ].join('\n');
}

function buildCodexSupervisorJsonSchema(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['overview', 'workstream', 'observations', 'suggested_actions', 'targets', 'proposed_jobs', 'supervisor_summary'],
    properties: {
      overview: { type: 'string', minLength: 1 },
      workstream: {
        type: 'string',
        enum: ['decomposition', 'markup', 'graph_refactor', 'mixed'],
      },
      observations: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        maxItems: 12,
      },
      suggested_actions: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        maxItems: 12,
      },
      targets: {
        type: 'array',
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['capsule_id', 'reason', 'priority'],
          properties: {
            capsule_id: { type: 'string', minLength: 1 },
            reason: { type: 'string', minLength: 1 },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
        },
      },
      proposed_jobs: {
        type: 'array',
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'goal', 'workstream', 'capsule_ids', 'suggested_branch', 'needs_human_confirmation'],
          properties: {
            label: { type: 'string', minLength: 1 },
            goal: { type: 'string', minLength: 1 },
            workstream: { type: 'string', enum: ['decomposition', 'markup', 'graph_refactor', 'mixed'] },
            capsule_ids: {
              type: 'array',
              minItems: 1,
              maxItems: 12,
              items: { type: 'string', minLength: 1 },
            },
            suggested_branch: { type: 'string', enum: ['dream', 'real'] },
            needs_human_confirmation: { type: 'boolean' },
          },
        },
      },
      supervisor_summary: { type: 'string', minLength: 1 },
    },
  };
}

function buildCodexReviewerPrompt(input: {
  summary: VaultSignalSummary;
  overview: string;
  workstream: z.infer<typeof vaultStewardWorkstreamSchema>;
  observations: string[];
  suggestedActions: string[];
  targets: z.infer<typeof vaultStewardTargetSchema>[];
  proposedJobs: VaultStewardJob[];
  executedJobs: VaultStewardJob[];
}): string {
  const targetLines =
    input.targets.length > 0
      ? input.targets
          .map((target) => `- ${target.capsule_id} [${target.priority}] ${target.reason}`)
          .join('\n')
      : '- none';
  const proposedJobLines =
    input.proposedJobs.length > 0
      ? input.proposedJobs
          .map(
            (job) =>
              `- ${job.id} :: ${job.label} :: ${job.goal} :: ${job.workstream} :: ${job.capsule_ids.join(', ')}`,
          )
          .join('\n')
      : '- none';
  const executedJobLines =
    input.executedJobs.length > 0
      ? input.executedJobs
          .map((job) => `- ${job.label} :: completed on Dream for ${job.capsule_ids.join(', ')}`)
          .join('\n')
      : '- none';

  return [
    'You are Codex Reviewer inside the N1Hub Vault Steward swarm.',
    'A provider scout already analyzed the vault and the executor may already have executed bounded Dream-side jobs.',
    'Your job is to review the swarm output and return a compact supervisor note for the operator and the next cycle.',
    'Do not invent work unrelated to the supplied capsule graph and job set.',
    'Return only JSON matching the provided schema.',
    '',
    `Graph totals: capsules=${input.summary.total_capsules}, orphaned=${input.summary.orphaned_capsules}`,
    `Workstream: ${input.workstream}`,
    '',
    'Overview:',
    input.overview,
    '',
    'Observations:',
    ...(input.observations.length > 0 ? input.observations.map((entry) => `- ${entry}`) : ['- none']),
    '',
    'Suggested actions:',
    ...(input.suggestedActions.length > 0
      ? input.suggestedActions.map((entry) => `- ${entry}`)
      : ['- none']),
    '',
    'Targets:',
    targetLines,
    '',
    'Proposed jobs:',
    proposedJobLines,
    '',
    'Executed jobs:',
    executedJobLines,
    '',
    'If any proposed job should be vetoed for this cycle because it is duplicate, stale, or low-value, list its exact id in cancel_job_ids.',
    'Only cancel jobs that appear in the Proposed jobs list. If none should be cancelled, return an empty array.',
    'Respond with a short review summary, the operator focus, the main risk flags for the next cycle, and any cancel_job_ids.',
  ].join('\n');
}

function buildCodexReviewerJsonSchema(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['review_summary', 'operator_focus', 'risk_flags', 'cancel_job_ids'],
    properties: {
      review_summary: { type: 'string', minLength: 1 },
      operator_focus: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        maxItems: 8,
      },
      risk_flags: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        maxItems: 8,
      },
      cancel_job_ids: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        maxItems: 12,
      },
    },
  };
}

function getExecutorWorkstreamGuidance(
  workstream: z.infer<typeof vaultStewardWorkstreamSchema>,
): { laneTitle: string; guidance: string[] } {
  switch (workstream) {
    case 'decomposition':
      return {
        laneTitle: 'Capsule Decomposition Executor',
        guidance: [
          'Sharpen capsule boundaries and make it clearer what belongs here versus in a separate atomic capsule.',
          'Prefer summary repairs and maintenance notes that identify future split pressure instead of forcing a doctrinal rewrite now.',
          'Use keywords to make later decomposition and routing easier.',
        ],
      };
    case 'markup':
      return {
        laneTitle: 'Capsule Markup Executor',
        guidance: [
          'Improve clarity, scanability, and metadata quality without changing the meaning of the capsule.',
          'Use keywords to improve discovery, classification, and operator navigation.',
          'Keep the edit bounded and descriptive; do not treat speculative content as already validated truth.',
        ],
      };
    case 'graph_refactor':
      return {
        laneTitle: 'Capsule Graph Refactor Executor',
        guidance: [
          'Improve graph-facing clarity through summary, keywords, and maintenance notes.',
          'Do not mutate recursive links directly in this lane; prepare safe future graph refactors through notes and descriptive framing.',
          'Bias toward lineage clarity, graph maintenance, and follow-up planning signals.',
        ],
      };
    case 'mixed':
    default:
      return {
        laneTitle: 'Capsule Executor',
        guidance: [
          'Blend decomposition, markup, and graph-facing maintenance conservatively.',
          'Favor small, well-justified improvements over sweeping edits.',
          'Treat Dream as a safe maintenance workspace, not a place for doctrinal invention.',
        ],
      };
  }
}

function buildExecutorPrompt(
  job: VaultStewardJob,
  capsules: SovereignCapsule[],
): { system: string; prompt: string } {
  const workstream = getExecutorWorkstreamGuidance(job.workstream);
  const system = [
    `You are the ${workstream.laneTitle} lane for the N1Hub Vault Steward swarm.`,
    'You are executing a bounded capsule-maintenance job on the Dream branch only.',
    'You must be conservative: refine summaries, add missing keywords, and write concise maintenance notes.',
    'Do not invent new doctrine. Ground every change in the provided capsule content.',
    'Return strict JSON only.',
  ].join(' ');

  const prompt = [
    `Execute this queued capsule-maintenance job: ${job.label}`,
    `Goal: ${job.goal}`,
    `Workstream: ${job.workstream}`,
    `Suggested branch: ${job.suggested_branch}`,
    '',
    'Workstream guidance:',
    ...workstream.guidance.map((entry) => `- ${entry}`),
    '',
    'Target capsules:',
    ...capsules.map((capsule) =>
      [
        `- ${capsule.metadata.capsule_id}`,
        `  name: ${capsule.metadata.name ?? capsule.metadata.capsule_id}`,
        `  type/subtype/status: ${capsule.metadata.type ?? 'unknown'}/${capsule.metadata.subtype ?? 'atomic'}/${capsule.metadata.status ?? 'unknown'}`,
        `  progress: ${toNumberValue(capsule.metadata.progress) ?? 'n/a'}`,
        `  summary: ${toStringValue(capsule.neuro_concentrate.summary).trim() || 'n/a'}`,
        `  keywords: ${Array.isArray(capsule.neuro_concentrate.keywords) ? capsule.neuro_concentrate.keywords.join(', ') : 'n/a'}`,
        '  content:',
        toStringValue(capsule.core_payload.content).slice(0, 6000),
      ].join('\n'),
    ),
    '',
    'Return JSON with this shape:',
    JSON.stringify(
      {
        updates: [
          {
            capsule_id: 'capsule.foundation.example.v1',
            updated_summary: 'One improved summary sentence or short paragraph',
            added_keywords: ['keyword-one', 'keyword-two'],
            maintenance_note: 'What was improved and what still needs attention',
            rationale: 'Why this maintenance change is justified from the capsule contents',
          },
        ],
      },
      null,
      2,
    ),
  ].join('\n');

  return { system, prompt };
}

function buildExecutorJsonSchema(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['updates'],
    properties: {
      updates: {
        type: 'array',
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'capsule_id',
            'updated_summary',
            'added_keywords',
            'maintenance_note',
            'rationale',
          ],
          properties: {
            capsule_id: { type: 'string', minLength: 1 },
            updated_summary: { type: 'string', minLength: 1 },
            added_keywords: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
              maxItems: 8,
            },
            maintenance_note: { type: 'string', minLength: 1 },
            rationale: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  };
}

export {
  buildFallbackAnalysis,
  extractFirstJsonObject,
  buildPrompt,
  buildScoutRepairPrompt,
  buildCodexSupervisorPrompt,
  buildCodexSupervisorJsonSchema,
  buildCodexReviewerPrompt,
  buildCodexReviewerJsonSchema,
  buildExecutorPrompt,
  buildExecutorJsonSchema,
  getExecutorWorkstreamGuidance,
  codexReviewerOutputSchema,
  codexSupervisorOutputSchema,
  executorOutputSchema,
};
