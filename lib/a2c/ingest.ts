import fs from 'fs/promises';
import path from 'path';
import { computeHash, isoUtcNow, redactedText, SKILL_ID, stableSemanticHash } from './common';
import { validateCapsule, autoFixCapsule } from '@/lib/validator';
import { computeIntegrityHash, isRecordObject } from '@/lib/validator/utils';
import { resolveRuntimeLayout } from './layout';
import type { CapsuleRoot } from '@/lib/validator/types';
import type { IngestAttempt, A2CCommandReport } from './types';

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
