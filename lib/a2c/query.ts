import fs from 'fs/promises';
import path from 'path';
import { A2CIndexPayload, QueryNodeRow, A2CCommandReport } from './types';
import { buildIndex, loadIndex } from './index';
import { parseConfidenceRecord, tokenize, isoUtcNow } from './common';
import { resolveRuntimeLayout } from './layout';
import { computeIntegrityHash } from '@/lib/validator';
import { validateCapsule, autoFixCapsule } from '@/lib/validator';
import { isRecordObject } from '@/lib/validator/utils';
import { SKILL_ID } from './common';

interface QueryResult {
  capsule_id: string;
  title: string;
  score: number;
  provenance_score: number;
  validation_score: number;
  contradiction_pressure: number;
  summary: string;
  relevance: number;
  row: QueryNodeRow;
}

const DEFAULT_TOP_K = 8;

const parseArgs = (argv: string[]) => {
  const out = {
    kbRoot: process.cwd(),
    query: '',
    topK: DEFAULT_TOP_K,
    includeArchived: false,
    minProvenance: 0.85,
    minValidation: 0.5,
    synthesizeOnFly: false,
    jsonOut: '',
  };
  let seenTopK = false;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--kb-root') {
      out.kbRoot = argv[i + 1] || out.kbRoot;
      i += 1;
      continue;
    }
    if (arg === '--query') {
      out.query = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (arg === '--top-k') {
      out.topK = Number(argv[i + 1] || DEFAULT_TOP_K);
      seenTopK = true;
      i += 1;
      continue;
    }
    if (arg === '--include-archived') {
      out.includeArchived = true;
      continue;
    }
    if (arg === '--min-provenance') {
      out.minProvenance = Number(argv[i + 1] || 0.85);
      i += 1;
      continue;
    }
    if (arg === '--min-validation') {
      out.minValidation = Number(argv[i + 1] || 0.5);
      i += 1;
      continue;
    }
    if (arg === '--synthesize-on-fly') {
      out.synthesizeOnFly = true;
      continue;
    }
    if (arg === '--no-synthesize-on-fly') {
      out.synthesizeOnFly = false;
      continue;
    }
    if (arg === '--json-out') {
      out.jsonOut = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (!arg.startsWith('--') && i === 0) {
      out.kbRoot = arg || out.kbRoot;
      continue;
    }
    if (arg && !arg.startsWith('--')) positional.push(arg);
  }

  if (!out.query && positional.length > 0) out.query = positional[0];
  if (!seenTopK && positional.length > 1) out.topK = Number(positional[1] || DEFAULT_TOP_K);
  return out;
};

const tokenWeight = (queryTokens: Set<string>, rowTokens: Set<string>): number => {
  if (!queryTokens.size || !rowTokens.size) return 0;
  const inter = [...queryTokens].filter((value) => rowTokens.has(value)).length;
  const union = new Set([...queryTokens, ...rowTokens]).size;
  return union > 0 ? inter / union : 0;
};

const vectorWeight = (vector: Record<string, number>): number => {
  return (
    (vector.validation_score || 0) * 0.4 +
    (vector.provenance_coverage || 0) * 0.25 +
    (vector.extraction || 0) * 0.12 +
    (vector.synthesis || 0) * 0.1 +
    (vector.linking || 0) * 0.08 +
    (1 - Math.abs(0.5 - (vector.contradiction_pressure || 0))) * 0.05
  );
};

const buildCandidateTokens = (node: QueryNodeRow): Set<string> => {
  const chunks = [
    node.title,
    node.summary,
    ...(node.keywords || []),
    ...(node.entities || []),
    ...(node.tags || []),
  ];
  const tokenSet = new Set<string>();
  for (const chunk of chunks) {
    for (const token of tokenize(chunk || '')) {
      tokenSet.add(token);
    }
  }
  return tokenSet;
};

export const buildTransientSynthesis = async (params: {
  query: string;
  kbRoot: string;
  ranked: QueryResult[];
}): Promise<{ valid: boolean; capsulePath?: string; errors?: string[] } | null> => {
  const { kbRoot, ranked, query } = params;
  if (ranked.length < 3) return null;

  const sourceIds = ranked.map((row) => row.capsule_id).filter(Boolean);
  const lines: string[] = [
    '# Transient Query Synthesis Capsule',
    '',
    `Query: ${query}`,
    '',
    '## Synthesized Answer',
    'This is a provisional synthesis assembled from retrieved context and must pass G16 before adoption.',
    '',
    '## Supporting Capsules',
  ];
  lines.push(...sourceIds.map((id) => `- ${id}`));

  const sourceFiles: string[] = [];
  const rows = ranked.map((item) => item.row);
  const layout = resolveRuntimeLayout(kbRoot);
  for (const row of rows) {
    if (typeof row.file === 'string' && row.file) {
      sourceFiles.push(row.file);
      const filePath = path.join(layout.kbRoot, row.file);
      const payload = JSON.parse(await fs.readFile(filePath, 'utf-8')) as unknown;
      if (!isRecordObject(payload)) continue;
      const neuro = isRecordObject(payload.neuro_concentrate) ? payload.neuro_concentrate : null;
      const claims = isRecordObject(neuro) && Array.isArray((neuro as { claims?: unknown }).claims)
        ? ((neuro as { claims?: unknown[] }).claims || []).filter((item) => typeof item === 'string')
        : [];
      for (const claim of claims) {
        lines.push(`- ${claim}`);
      }
    }
  }

  const keywords = [...new Set([...tokenize(query), ...rows.flatMap((row) => tokenize(`${row.title} ${row.summary}`))])].slice(0, 12);
  lines.push('', '## Keywords', ...keywords.map((value) => `- ${value}`));

  const capsule = {
    metadata: {
      capsule_id: `transient-synthesis-${Date.now()}`,
      type: 'operations',
      subtype: 'atomic',
      status: 'draft',
      version: '1.0.0',
      created_at: isoUtcNow(),
      updated_at: isoUtcNow(),
      name: 'Transient Synthesis Capsule',
      semantic_hash: computeTransientSemanticHash(lines.join('\n')),
    },
    core_payload: {
      content_type: 'text',
      content: `${lines.join('\n')}\n`,
      truncation_note: 'Transient; for review only',
    },
    neuro_concentrate: {
      summary: lines.slice(0, 20).join(' ').slice(0, 320),
      confidence_vector: {
        extraction: 0.28,
        synthesis: 0.22,
        linking: 0.17,
        provenance_coverage: 0.25,
        validation_score: 0,
        contradiction_pressure: 0.0,
      },
      keywords,
      semantic_hash: `T${Date.now()}`,
      claims: ranked.slice(0, 5).map((row) => `Evidence: ${row.capsule_id}`),
    },
    recursive_layer: { links: [] },
    integrity_sha3_512: '',
  };

  const fixed = autoFixCapsule(capsule);
  const validation = await validateCapsule(fixed.fixedData, {});
  const synthesisLayout = resolveRuntimeLayout(kbRoot);
  const outputPath = sourceFiles[0] ? synthesisLayout.pipelineWorkspaceDir : synthesisLayout.pipelineFailedDir;
  await fs.mkdir(outputPath, { recursive: true });
  const out = `${path.join(outputPath, `transient-${Date.now()}.json`)}`;
  await fs.writeFile(out, JSON.stringify(fixed.fixedData, null, 2), 'utf-8');

  return {
    valid: validation.valid,
    capsulePath: out,
    errors: validation.valid ? undefined : validation.errors.map((issue) => `${issue.gate}:${issue.path}:${issue.message}`),
  };
};

const computeTransientSemanticHash = (content: string): string => {
  const digest = computeIntegrityHash({
    metadata: { semantic_hash: '' },
    core_payload: { content_type: 'text', content },
    neuro_concentrate: { summary: content.slice(0, 120), confidence_vector: {}, keywords: [] },
    recursive_layer: { links: [] },
  } as unknown);
  return digest;
};

export const queryVault = async (input: {
  kbRoot: string;
  query: string;
  topK?: number;
  includeArchived?: boolean;
  minProvenance?: number;
  minValidation?: number;
  synthesizeOnFly?: boolean;
}) => {
  const query = input.query.trim();
  const topK = input.topK ?? DEFAULT_TOP_K;

  let index = await loadIndex(input.kbRoot);
  if (!index) {
    const built = await buildIndex(input.kbRoot, 'capsule', { write: false });
    index = built.index;
  }

  const querySet = new Set(tokenize(query));
  const rows = ((index as A2CIndexPayload).graph.nodes as QueryNodeRow[])
    .map((node) => {
      const status = (node.status || 'draft').toLowerCase();
      if (!input.includeArchived && status === 'archived') return null;
      const vector = parseConfidenceRecord(node.confidence_vector);
      if ((vector.provenance_coverage || 0) < (input.minProvenance ?? 0.85)) return null;
      if ((vector.validation_score || 0) < (input.minValidation ?? 0.5)) return null;

      const title = typeof node.title === 'string' ? node.title : '';
      const summary = typeof node.summary === 'string' ? node.summary : '';

      const nodeTokens = buildCandidateTokens({
        ...node,
        title,
        summary,
      });
      const weight = tokenWeight(querySet, nodeTokens);
      const score = Number(((weight * 0.6) + vectorWeight(vector) * 0.4).toFixed(6));
      const capsuleId = String((node as { id?: string }).id || node.capsule_id || '').trim();
      if (!capsuleId) return null;

      return {
        capsule_id: capsuleId,
        title,
        score,
        provenance_score: vector.provenance_coverage || 0,
        validation_score: vector.validation_score || 0,
        contradiction_pressure: vector.contradiction_pressure || 0,
        summary,
        relevance: weight,
        row: {
          ...node,
          id: capsuleId,
          capsule_id: capsuleId,
        },
      } as QueryResult;
    })
    .filter(Boolean) as QueryResult[];

  rows.sort((left, right) => right.score - left.score);
  const topRows = rows.slice(0, topK);

  let synthesisGate: { valid: boolean; errors?: string[]; capsulePath?: string } | null = null;
  if (input.synthesizeOnFly && topRows.length >= 3) {
    synthesisGate = await buildTransientSynthesis({
      kbRoot: input.kbRoot,
      query,
      ranked: topRows,
    });
  }

  return {
    query,
    timestamp: isoUtcNow(),
    top_k: topK,
    returned: topRows.length,
    rows: topRows,
    synthesis_gate_audit: synthesisGate,
  };
};

export const runQueryCommand = async (argv: string[]): Promise<A2CCommandReport> => {
  const args = parseArgs(argv);
  const rows = await queryVault({
    kbRoot: args.kbRoot,
    query: args.query,
    topK: args.topK,
    includeArchived: args.includeArchived,
    minProvenance: args.minProvenance,
    minValidation: args.minValidation,
    synthesizeOnFly: args.synthesizeOnFly,
  });

  const report: A2CCommandReport = {
    skill_id: SKILL_ID,
    module: 'QUERY',
    timestamp: isoUtcNow(),
    status: rows.rows.length > 0 ? 'COMPLETE' : 'PARTIAL',
    scope: {
      kb_root: args.kbRoot,
      query: args.query,
      top_k: args.topK,
      include_archived: args.includeArchived,
    },
    metrics: {
      returned: rows.rows.length,
      top_k: rows.top_k,
      synthesis_generated: rows.synthesis_gate_audit ? 1 : 0,
    },
    results: {
      query: rows,
    },
    warnings: [],
    errors: [],
    metadata: {
      confidence: rows.rows.length > 0 ? 'HIGH' : 'MEDIUM',
      human_review_required: rows.synthesis_gate_audit ? !rows.synthesis_gate_audit.valid : false,
      self_corrections: 0,
    },
  };

  if (args.jsonOut) {
    await fs.writeFile(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  } else {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }

  return report;
};
