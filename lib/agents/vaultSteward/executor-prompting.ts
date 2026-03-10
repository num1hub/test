import { z } from 'zod';

import {
  executorOutputSchema,
  vaultStewardWorkstreamSchema,
  type VaultStewardJob,
} from './schemas';

import type { SovereignCapsule } from '@/types/capsule';

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toNumberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function getExecutorWorkstreamGuidance(
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

export function buildExecutorPrompt(
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

export function buildExecutorJsonSchema(): Record<string, unknown> {
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

export { executorOutputSchema };
