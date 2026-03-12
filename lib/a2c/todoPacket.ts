import fs from 'fs/promises';
import path from 'path';
import { computeHash, isoUtcNow, SKILL_ID } from './common';
import { ensureRuntimeLayout, resolveRuntimeLayout } from './layout';
import type {
  A2CCommandReport,
  A2CExecutionBandHint,
  A2COperatorInputNormalized,
  A2COperatorInputNormalizedArtifactRecord,
  A2CPriorityHint,
  A2CRouteClassHint,
  A2CTaskPacketArtifact,
  A2CTaskPacketDraft,
} from './types';

const DEFAULT_PRIORITY: A2CPriorityHint = 'P1';
const DEFAULT_EXECUTION_BAND: A2CExecutionBandHint = 'NEXT';

const parseArgs = (argv: string[]) => {
  const read = (flag: string, fallback = '') => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] || fallback : fallback;
  };

  return {
    kbRoot: read('--kb-root', process.cwd()),
    intakeId: read('--intake-id'),
    normalizedPath: read('--normalized-path'),
  };
};

const unique = (values: string[], max = 12): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
};

const titleCase = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[a-z]/, (char) => char.toUpperCase());

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'operator-input-task';

const cleanSentence = (value: string): string => value.trim().replace(/\s+/g, ' ').replace(/[.?!]+$/, '');

const derivePriority = (value: A2CPriorityHint | null): A2CPriorityHint => value ?? DEFAULT_PRIORITY;
const deriveExecutionBand = (value: A2CExecutionBandHint | null): A2CExecutionBandHint =>
  value ?? DEFAULT_EXECUTION_BAND;

const isQueueExecution = (routeClass: A2CRouteClassHint): boolean => routeClass === 'queue_execution';

const isActionable = (normalized: A2COperatorInputNormalized): { ready: boolean; reason?: string } => {
  if (/\b(whole repo|entire repo|entire repository|everything|all open tasks|all tasks|finish n1hub|refactor the whole)\b/i.test(normalized.objective)) {
    return {
      ready: false,
      reason: 'objective is too broad to become one bounded task packet',
    };
  }

  if (!isQueueExecution(normalized.route_class_hint)) {
    return {
      ready: false,
      reason: `route_class_hint=${normalized.route_class_hint} does not target queue execution`,
    };
  }

  if (normalized.objective.trim().length < 16) {
    return {
      ready: false,
      reason: 'objective is too short to generate a bounded task packet',
    };
  }

  if (
    /\bbefore coding\b|\bbefore implementation\b/i.test(normalized.objective) ||
    (/\b(explain|compare|think|plan|architecture)\b/i.test(normalized.objective) &&
      !/\b(implement|fix|write|add|update|test|harden|route|contract)\b/i.test(normalized.objective))
  ) {
    return {
      ready: false,
      reason: 'objective is still synthesis-oriented and should not promote into queue execution yet',
    };
  }

  if (
    normalized.scope_hints.length === 0 &&
    normalized.acceptance_criteria_hints.length === 0 &&
    normalized.verification_hints.length === 0
  ) {
    return {
      ready: false,
      reason: 'normalized intake is missing scope, acceptance, and verification hints',
    };
  }

  return { ready: true };
};

const renderList = (items: string[], fallback: string): string[] =>
  (items.length > 0 ? items : [fallback]).map((item) => `- ${item}`);

const renderNumbered = (items: string[], fallback: string[]): string[] =>
  (items.length > 0 ? items : fallback).map((item, index) => `${index + 1}. ${item}`);

const buildAcceptance = (normalized: A2COperatorInputNormalized): string[] =>
  unique(
    normalized.acceptance_criteria_hints.length > 0
      ? normalized.acceptance_criteria_hints
      : [
          `${cleanSentence(normalized.objective)} is reflected in the named scope`,
          'the generated packet stays inside existing queue law and template shape',
        ],
    8,
  );

const buildVerification = (normalized: A2COperatorInputNormalized): string[] =>
  unique(normalized.verification_hints.length > 0 ? normalized.verification_hints : ['npm run typecheck'], 8);

const buildStopConditions = (normalized: A2COperatorInputNormalized): string[] =>
  unique(
    normalized.stop_condition_hints.length > 0
      ? normalized.stop_condition_hints
      : [
          'live repo truth contradicts the named scope',
          'promotion would create a second queue format instead of using the existing task template',
        ],
    8,
  );

const buildScope = (normalized: A2COperatorInputNormalized): string[] =>
  unique(
    normalized.scope_hints.length > 0
      ? normalized.scope_hints
      : normalized.file_hints.length > 0
        ? normalized.file_hints
        : ['TO-DO/tasks/*'],
    16,
  );

const buildTitle = (normalized: A2COperatorInputNormalized): string =>
  titleCase(cleanSentence(normalized.objective).slice(0, 88));

const buildMarkdown = (draft: {
  intakeId: string;
  packetId: string;
  title: string;
  priority: A2CPriorityHint;
  executionBand: A2CExecutionBandHint;
  ownerLane: string;
  status: 'READY' | 'DEFERRED';
  deferReason?: string;
  normalized: A2COperatorInputNormalized;
  sourcePath: string;
  scope: string[];
  acceptance: string[];
  verification: string[];
  stopConditions: string[];
}): string => {
  const taskRefs = draft.normalized.task_refs.length > 0 ? draft.normalized.task_refs.join(', ') : 'none';
  const deferBlock =
    draft.status === 'DEFERRED' && draft.deferReason
      ? ['', '## Defer Reason', '', `- ${draft.deferReason}`]
      : [];

  return [
    `# TODO-DRAFT ${draft.title}`,
    '',
    `- Priority: \`${draft.priority}\``,
    `- Execution Band: \`${draft.executionBand}\``,
    `- Status: \`${draft.status}\``,
    `- Owner Lane: \`${draft.ownerLane}\``,
    '- Cluster: `operator-input packetization`',
    '',
    '## Goal',
    '',
    cleanSentence(draft.normalized.objective) || 'Promote the normalized operator input into one bounded queue-ready task.',
    '',
    '## Why Now',
    '',
    `Generated from normalized intake \`${draft.intakeId}\` so operator intent can be promoted into the hot queue without ad hoc chat translation.`,
    '',
    '## Scope',
    '',
    ...renderList(draft.scope, 'TO-DO/tasks/*'),
    '',
    '## Non-Goals',
    '',
    '- no direct mutation of `TO-DO/HOT_QUEUE.md` from the builder stage',
    '- no automatic execution of the generated task packet',
    '',
    '## Deliverables',
    '',
    '- one task packet candidate in the existing N1Hub template shape',
    '- explicit acceptance and verification fields derived from normalized intake',
    '',
    '## Context Snapshot',
    '',
    `- source normalized artifact: \`${draft.sourcePath}\``,
    `- route class hint: \`${draft.normalized.route_class_hint}\``,
    `- referenced hot tasks: ${taskRefs}`,
    '',
    '## Dependencies',
    '',
    '- hard: normalized intake artifact from `TODO-016`',
    '- soft: align final promotion with queue law and current pull order',
    '',
    '## Source Signals',
    '',
    `- normalized operator intake \`${draft.intakeId}\``,
    '- `TO-DO/TASK_TEMPLATE.md`',
    '',
    '## Entry Checklist',
    '',
    '- inspect the normalized intake artifact',
    '- confirm the named scope still matches live repo truth before promotion',
    '',
    '## Implementation Plan',
    '',
    ...renderNumbered(
      draft.status === 'READY'
        ? [
            'inspect the named scope and referenced tasks',
            'promote this packet into `TO-DO/tasks/` with a real `TODO-###` id when approved',
            'update `TO-DO/HOT_QUEUE.md` only after the promoted packet is reviewed',
          ]
        : [
            'collect clearer scope or verification hints from the operator input',
            're-run packetization once the route class or bounded scope is explicit',
            'keep the candidate outside the live queue until the signal improves',
          ],
      ['inspect the source artifact', 'tighten the packet', 're-run promotion review'],
    ),
    '',
    '## Mode and Skill',
    '',
    '- Primary mode: `TO-DO Executor`',
    '- Optional skill: `skills/n1/SKILL.md`',
    '',
    '## System Prompt Slice',
    '',
    '```text',
    'Use the normalized operator intake to propose one bounded N1Hub task packet. Keep the packet aligned to the existing task template and defer promotion when the input is too vague.',
    '```',
    '',
    '## Operator Command Pack',
    '',
    '- `Promote this normalized intake into one bounded N1Hub task packet.`',
    '- `Keep this packet out of the live queue until the promotion review passes.`',
    '',
    '## Acceptance Criteria',
    '',
    ...renderList(draft.acceptance, 'the task packet stays bounded and reviewable'),
    '',
    '## Verification',
    '',
    ...renderList(draft.verification, 'npm run typecheck'),
    '',
    '## Evidence and Artifacts',
    '',
    `- staged from normalized intake \`${draft.intakeId}\``,
    '- promote into `TO-DO/tasks/` only after queue review',
    '',
    '## Risks',
    '',
    '- weak or planning-heavy input can still overstate implementation readiness',
    '',
    '## Stop Conditions',
    '',
    ...renderList(
      draft.stopConditions,
      'promotion would create a second queue format instead of using the existing task template',
    ),
    ...deferBlock,
    '',
    '## Queue Update Rule',
    '',
    draft.status === 'READY'
      ? '- promote into `TO-DO/tasks/` and `TO-DO/HOT_QUEUE.md` only after review assigns a real task id'
      : '- keep the candidate outside the live queue and ask for narrower scope before promotion',
    '- do not let A2C packetization bypass queue law',
    '',
    '## Handoff Note',
    '',
    `Start from \`${draft.sourcePath}\`. This candidate is transitional markdown output from A2C intake, not an auto-promoted live queue item.`,
    '',
  ].join('\n');
};

const loadNormalizedArtifact = async (kbRoot: string, intakeId?: string, normalizedPath?: string) => {
  const layout = resolveRuntimeLayout(kbRoot);
  const targetPath = normalizedPath || (intakeId ? path.join(layout.intakeNormalizedDir, `${intakeId}.normalized.json`) : '');

  if (!targetPath) {
    throw new Error('packetize requires --intake-id or --normalized-path');
  }

  const raw = await fs.readFile(targetPath, 'utf-8');
  return {
    path: targetPath,
    artifact: JSON.parse(raw) as A2COperatorInputNormalizedArtifactRecord,
  };
};

export const buildTaskPacketDraft = (input: {
  sourcePath: string;
  artifact: A2COperatorInputNormalizedArtifactRecord;
}): A2CTaskPacketDraft => {
  const normalized = input.artifact.normalized;
  const title = buildTitle(normalized);
  const actionability = isActionable(normalized);
  const packetId = `task-packet-${computeHash(`${input.artifact.intake_id}:${title}`).slice(0, 12)}`;
  const scope = buildScope(normalized);
  const verification = buildVerification(normalized);
  const acceptance = buildAcceptance(normalized);
  const stopConditions = buildStopConditions(normalized);
  const ownerLane = normalized.owner_lane_hints[0] || 'TO-DO Executor';
  const status: 'READY' | 'DEFERRED' = actionability.ready ? 'READY' : 'DEFERRED';

  return {
    intake_id: input.artifact.intake_id,
    packet_id: packetId,
    title,
    priority: derivePriority(normalized.priority_hint),
    execution_band: deriveExecutionBand(normalized.execution_band_hint),
    owner_lane: ownerLane,
    status,
    defer_reason: actionability.reason,
    markdown: buildMarkdown({
      intakeId: input.artifact.intake_id,
      packetId,
      title,
      priority: derivePriority(normalized.priority_hint),
      executionBand: deriveExecutionBand(normalized.execution_band_hint),
      ownerLane,
      status,
      deferReason: actionability.reason,
      normalized,
      sourcePath: input.sourcePath,
      scope,
      acceptance,
      verification,
      stopConditions,
    }),
    scope,
    verification,
    acceptance_criteria: acceptance,
    stop_conditions: stopConditions,
  };
};

export const writeTaskPacketDraft = async (
  kbRoot: string,
  sourcePath: string,
  draft: A2CTaskPacketDraft,
): Promise<A2CTaskPacketArtifact> => {
  const layout = await ensureRuntimeLayout(kbRoot, true);
  await fs.mkdir(layout.packetCandidatesDir, { recursive: true });

  const jsonPath = path.join(layout.packetCandidatesDir, `${draft.packet_id}.json`);
  const markdownPath = path.join(layout.packetCandidatesDir, `${draft.packet_id}.md`);

  const payload: A2CTaskPacketArtifact = {
    ...draft,
    source_normalized_path: sourcePath,
    json_path: jsonPath,
    markdown_path: markdownPath,
  };

  await Promise.all([
    fs.writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8'),
    fs.writeFile(markdownPath, draft.markdown, 'utf-8'),
  ]);

  return payload;
};

export const runTaskPacketCommand = async (argv: string[]): Promise<A2CCommandReport> => {
  const args = parseArgs(argv);
  const loaded = await loadNormalizedArtifact(args.kbRoot, args.intakeId, args.normalizedPath);
  const draft = buildTaskPacketDraft({
    sourcePath: loaded.path,
    artifact: loaded.artifact,
  });
  const written = await writeTaskPacketDraft(args.kbRoot, loaded.path, draft);

  return {
    skill_id: SKILL_ID,
    module: 'TASK_PACKET',
    timestamp: isoUtcNow(),
    status: written.status === 'READY' ? 'COMPLETE' : 'PARTIAL',
    scope: {
      kb_root: args.kbRoot,
      intake_id: written.intake_id,
      route_class_hint: loaded.artifact.normalized.route_class_hint,
    },
    metrics: {
      packet_ready: written.status === 'READY',
      scope_hints: written.scope.length,
      verification_hints: written.verification.length,
      acceptance_hints: written.acceptance_criteria.length,
      stop_condition_hints: written.stop_conditions.length,
    },
    results: {
      packet: written,
    },
    warnings: written.status === 'READY' ? [] : [written.defer_reason || 'packet deferred'],
    errors: [],
    metadata: {
      confidence: written.status === 'READY' ? 'HIGH' : 'MEDIUM',
      human_review_required: true,
      self_corrections: 0,
    },
  };
};
