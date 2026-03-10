import fs from 'fs/promises';
import path from 'path';
import { computeHash, isoUtcNow, redactedText, SKILL_ID, stableSemanticHash } from './common';
import { validateCapsule, autoFixCapsule } from '@/lib/validator';
import { computeIntegrityHash, isRecordObject } from '@/lib/validator/utils';
import { ensureRuntimeLayout, resolveRuntimeLayout } from './layout';
import type { CapsuleRoot } from '@/lib/validator/types';
import type {
  A2CCommandReport,
  A2CExecutionBandHint,
  A2COperatorInputArtifact,
  A2COperatorInputEnvelope,
  A2COperatorInputNormalized,
  A2CPriorityHint,
  A2CRouteClassHint,
  IngestAttempt,
} from './types';

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

const normalizeText = (text: string): string =>
  text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const extractTaskRefs = (text: string): string[] =>
  unique(text.match(/\bTODO-\d{3}\b/g) ?? [], 8);

const extractCommandHints = (text: string): string[] =>
  unique(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .map((line) => line.replace(/^(?:[-*]|\d+\.)\s+/, ''))
      .filter((line) => /^(npm|npx|pnpm|yarn)\b/.test(line)),
    8,
  );

const extractFileHints = (text: string): string[] =>
  unique(
    (text.match(/(?:[A-Za-z0-9_.[\]-]+\/)+[A-Za-z0-9_.[\]*-]+(?:\.[A-Za-z0-9]+)?/g) ?? []).filter(
      (item) => !item.startsWith('http'),
    ),
    16,
  );

const collectSectionBullets = (text: string, headingPattern: RegExp): string[] => {
  const lines = text.split(/\r?\n/);
  const collected: string[] = [];
  let active = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const sectionLabel = line.replace(/^#{1,6}\s+/, '').replace(/:$/, '');
    const isHeading = /^#{1,6}\s+/.test(line) || /^[A-Za-z][A-Za-z0-9 /-]+:$/.test(line);

    if (isHeading) {
      if (headingPattern.test(sectionLabel)) {
        active = true;
        continue;
      }
      if (active) break;
    }

    if (!active) continue;
    const bullet = line.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (bullet?.[1]) collected.push(bullet[1].trim());
  }

  return unique(collected, 8);
};

const fallbackModalHints = (text: string): string[] =>
  unique(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /(?:\bshould\b|\bmust\b|\bneed to\b|\brequires?\b)/i.test(line))
      .map((line) => line.replace(/^(?:[-*]|\d+\.)\s+/, '')),
    8,
  );

const fallbackStopConditionHints = (text: string): string[] =>
  unique(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /(?:\bstop if\b|\bpause if\b|\bblock if\b|\bdo not\b)/i.test(line))
      .map((line) => line.replace(/^(?:[-*]|\d+\.)\s+/, '')),
    8,
  );

const summarizeObjective = (text: string): string => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const cleaned = line.replace(/^#{1,6}\s+/, '').replace(/^(?:[-*]|\d+\.)\s+/, '');
    if (!cleaned) continue;
    return cleaned.slice(0, 220);
  }

  return text.slice(0, 220);
};

const derivePriorityHint = (text: string): A2CPriorityHint | null => {
  if (/\bP0\b|\burgent\b|\basap\b|\bimmediate(?:ly)?\b/i.test(text)) return 'P0';
  if (/\bP1\b|\bnext\b|\bsoon\b/i.test(text)) return 'P1';
  if (/\bP2\b|\blater\b|\bbacklog\b/i.test(text)) return 'P2';
  return null;
};

const deriveExecutionBandHint = (text: string): A2CExecutionBandHint | null => {
  if (/\bNOW\b|\bactive\b|\bcurrent(?:ly)?\b|\btoday\b/i.test(text)) return 'NOW';
  if (/\bNEXT\b|\bafter\b|\bfollow-?up\b|\bnext\b/i.test(text)) return 'NEXT';
  if (/\bLATER\b|\bbacklog\b|\blater\b/i.test(text)) return 'LATER';
  return null;
};

const deriveRouteClassHint = (text: string, taskRefs: string[], fileHints: string[], verificationHints: string[]): A2CRouteClassHint => {
  const lower = text.toLowerCase();
  if (taskRefs.length > 0 || fileHints.length > 0 || verificationHints.length > 0 || /\b(implement|fix|write|add|update|test|harden|route|contract)\b/.test(lower)) {
    return 'queue_execution';
  }
  if (/\b(capsule|vault|preserve)\b/.test(lower) && !/\b(queue|task|todo)\b/.test(lower)) {
    return 'capsule_projection';
  }
  if (/\b(sync|orchestrate|route this|choose the lane)\b/.test(lower)) {
    return 'orchestrate_or_sync';
  }
  if (/\b(explain|compare|why|think|plan|architecture)\b/.test(lower)) {
    return 'assistant_synthesis';
  }
  return 'defer_for_clarity';
};

const deriveOwnerLaneHints = (text: string): string[] => {
  const out: string[] = [];
  const lower = text.toLowerCase();
  const push = (lane: string) => {
    if (!out.includes(lane)) out.push(lane);
  };

  if (/\b(a2c|anything-to-capsules|ingest|intake)\b/.test(lower)) push('A2C Intake Agent');
  if (/\b(query|oracle|recon)\b/.test(lower)) push('A2C Runtime Agent');
  if (/\b(test|vitest|assert|coverage)\b/.test(lower)) push('A2C Test Agent');
  if (/\b(diff|promote|merge|branch)\b/.test(lower)) push('Diff Test Agent');
  if (/\bvalidator|openapi|validate\b/.test(lower)) push('Validator Boundary Agent');
  if (/\bsymphony|workflow|tracker\b/.test(lower)) push('Symphony Contract Agent');
  if (out.length === 0) push('TO-DO Executor');

  return out;
};

const deriveScopeHints = (text: string, fileHints: string[], taskRefs: string[]): string[] => {
  const scoped: string[] = [...fileHints, ...taskRefs];
  const lower = text.toLowerCase();

  if (/\ba2c\b/.test(lower)) scoped.push('lib/a2c/*');
  if (/\bto-?do\b|\bhot queue\b|\bqueue\b/.test(lower)) scoped.push('TO-DO/*');
  if (/\bvalidator\b/.test(lower)) scoped.push('lib/validator/*');
  if (/\bdiff\b|\bbranch\b|\bpromote\b/.test(lower)) scoped.push('app/api/diff/*');

  return unique(scoped, 16);
};

export const normalizeOperatorInput = (input: A2COperatorInputEnvelope): A2COperatorInputNormalized => {
  const text = normalizeText(input.text);
  const taskRefs = extractTaskRefs(text);
  const fileHints = extractFileHints(text);
  const verificationHints = extractCommandHints(text);
  const acceptanceCriteriaHints = unique(
    [
      ...collectSectionBullets(text, /^acceptance criteria$/i),
      ...fallbackModalHints(text),
    ],
    8,
  );
  const stopConditionHints = unique(
    [
      ...collectSectionBullets(text, /^stop conditions?$/i),
      ...fallbackStopConditionHints(text),
    ],
    8,
  );

  return {
    objective: summarizeObjective(text),
    route_class_hint: deriveRouteClassHint(text, taskRefs, fileHints, verificationHints),
    scope_hints: deriveScopeHints(text, fileHints, taskRefs),
    file_hints: fileHints,
    task_refs: taskRefs,
    priority_hint: derivePriorityHint(text),
    execution_band_hint: deriveExecutionBandHint(text),
    owner_lane_hints: deriveOwnerLaneHints(text),
    acceptance_criteria_hints: acceptanceCriteriaHints,
    verification_hints: verificationHints,
    stop_condition_hints: stopConditionHints,
  };
};

export const stageOperatorInput = async (
  kbRoot: string,
  input: A2COperatorInputEnvelope,
): Promise<A2COperatorInputArtifact> => {
  const layout = await ensureRuntimeLayout(kbRoot, true);
  const normalizedText = normalizeText(input.text);
  const receivedAt = isoUtcNow();
  const source = {
    channel: input.source?.channel ?? 'unknown',
    actor: input.source?.actor,
    metadata: input.source?.metadata,
  } as const;
  const normalized = normalizeOperatorInput({ text: normalizedText, source });
  const intakeId = `operator-input-${computeHash(`${normalizedText}:${receivedAt}`).slice(0, 12)}`;
  const rawPath = path.join(layout.intakeArchiveRawDir, `${intakeId}.raw.json`);
  const normalizedPath = path.join(layout.intakeNormalizedDir, `${intakeId}.normalized.json`);

  const rawArtifact = {
    intake_id: intakeId,
    received_at: receivedAt,
    source,
    raw_text: normalizedText,
    text_sha256: computeHash(normalizedText),
    line_count: normalizedText ? normalizedText.split(/\r?\n/).length : 0,
    char_count: normalizedText.length,
  };

  const normalizedArtifact = {
    intake_id: intakeId,
    received_at: receivedAt,
    source,
    normalized,
  };

  await Promise.all([
    fs.writeFile(rawPath, `${JSON.stringify(rawArtifact, null, 2)}\n`, 'utf-8'),
    fs.writeFile(normalizedPath, `${JSON.stringify(normalizedArtifact, null, 2)}\n`, 'utf-8'),
  ]);

  return {
    intake_id: intakeId,
    received_at: receivedAt,
    source,
    raw_path: rawPath,
    normalized_path: normalizedPath,
    raw_text: normalizedText,
    normalized,
  };
};

export const buildDraftFromText = async (inputPath: string, kbRoot: string): Promise<CapsuleRoot> => {
  const raw = await fs.readFile(inputPath, 'utf-8');
  const source = redactedText(raw);
  const now = isoUtcNow();
  const title = path.parse(inputPath).name.replace(/[_-]/g, ' ');

  const meta = {
    capsule_id: `ops.${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    type: 'operations' as const,
    subtype: 'atomic' as const,
    status: 'draft' as const,
    version: '1.0.0',
    created_at: now,
    updated_at: now,
    name: title,
    semantic_hash: stableSemanticHash(source.slice(0, 3200)),
  };

  const capsule: CapsuleRoot = {
    metadata: {
      ...meta,
      source: {
        uri: inputPath,
        type: 'file',
        sha256: '',
      },
    },
    core_payload: {
      content_type: 'text',
      content: source.slice(0, 12000),
      truncation_note: source.length > 12000 ? 'content truncated for validation envelope' : undefined,
    },
    neuro_concentrate: {
      summary: source.slice(0, 620),
      confidence_vector: {
        extraction: 0.35,
        synthesis: 0.2,
        linking: 0.2,
        provenance_coverage: 0.24,
        validation_score: 0,
        contradiction_pressure: 0.0,
      },
      keywords: source
        .split(/\s+/)
        .filter((token) => token.length > 3)
        .filter((token, index, array) => array.indexOf(token) === index)
        .slice(0, 12),
      semantic_hash: stableSemanticHash(source.slice(0, 1200)),
    },
    recursive_layer: {
      links: [],
      action: ['draft'],
    },
    integrity_sha3_512: '',
  };

  const fixed = autoFixCapsule(capsule);
  return fixed.fixedData as CapsuleRoot;
};

export const validateDraftCapsule = async (
  capsule: CapsuleRoot,
  existingIds: Set<string>,
): Promise<{ valid: boolean; errors: unknown[]; warnings: unknown[]; computedHash: string }> => {
  const validation = await validateCapsule(capsule, { existingIds });
  const computed = computeIntegrityHash(capsule);
  return {
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    computedHash: computed,
  };
};

export const writeDraft = async (kbRoot: string, capsule: CapsuleRoot): Promise<string> => {
  const layout = resolveRuntimeLayout(kbRoot);
  const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
  const capsuleId = metadata && typeof metadata.capsule_id === 'string' ? metadata.capsule_id : `draft-${Date.now()}`;
  const out = path.join(layout.pipelineWorkspaceDir, `${capsuleId}.json`);
  await fs.mkdir(layout.pipelineWorkspaceDir, { recursive: true });
  await fs.writeFile(out, `${JSON.stringify(capsule, null, 2)}\n`, 'utf-8');
  return out;
};

export const runIngestFromPath = async (argv: string[]): Promise<IngestAttempt> => {
  const kbRoot = process.cwd();
  const input = argv[argv.indexOf('--input') + 1];
  const dryRun = argv.includes('--dry-run');
  const existingIds = new Set<string>();
  const sourceRaw = await fs.readFile(input, 'utf-8');
  const sourceHash = computeHash(redactedText(sourceRaw));
  const draft = await buildDraftFromText(input, kbRoot);
  const validation = await validateDraftCapsule(draft, existingIds);

  if (!dryRun && validation.valid) {
    await writeDraft(kbRoot, draft);
  }

  return {
    inputPath: input,
    draft: {
      draftId: draft.metadata.capsule_id,
      draftPath: path.join(resolveRuntimeLayout(kbRoot).pipelineWorkspaceDir, `${draft.metadata.capsule_id}.json`),
      source: input,
      stagedAt: isoUtcNow(),
      sourceHash,
      attempt: 1,
    },
    normalizedText: draft.core_payload.content,
    capsule: draft,
    status: validation.valid ? 'ingested' : 'rejected',
    warnings: validation.warnings.map((item) => JSON.stringify(item)),
    errors: validation.errors.map((item) => JSON.stringify(item)),
  };
};

export const runIngestCommand = async (argv: string[]): Promise<A2CCommandReport> => {
  const draft = await runIngestFromPath(argv);
  const status = draft.status === 'ingested' ? 'COMPLETE' : 'FAILED';
  const report: A2CCommandReport = {
    skill_id: SKILL_ID,
    module: 'INGEST',
    timestamp: isoUtcNow(),
    status: status === 'COMPLETE' ? 'COMPLETE' : 'PARTIAL',
    scope: { input: draft.inputPath },
    metrics: {
      valid: draft.status === 'ingested' ? 1 : 0,
      rejected: draft.status === 'rejected' ? 1 : 0,
    },
    results: {
      status: draft.status,
      draft: draft.draft,
    },
    warnings: draft.warnings,
    errors: draft.errors,
    metadata: {
      confidence: draft.status === 'ingested' ? 'HIGH' : 'LOW',
      human_review_required: draft.status !== 'ingested',
      self_corrections: 0,
    },
  };
  return report;
};
