import fs from 'fs/promises';
import path from 'path';
import { resolveRuntimeLayout } from './layout';
import { tokenize, isoUtcNow } from './common';
import { loadIndex } from './index';
import type { A2CCommandReport } from './types';

export const detectVoidRegions = async (kbRoot: string): Promise<Array<{ capsuleId: string; missingTokens: string[]; score: number }>> => {
  const index = await loadIndex(kbRoot);
  const layout = resolveRuntimeLayout(kbRoot);
  if (!index) return [];

  const nodeByToken = new Map<string, Set<string>>();
  for (const node of index.graph.nodes) {
    const tokens = tokenize(`${node.title} ${node.summary} ${(node.keywords || []).join(' ')}`);
    for (const token of tokens) {
      const bucket = nodeByToken.get(token) || new Set<string>();
      bucket.add(node.id);
      nodeByToken.set(token, bucket);
    }
  }

  const totals = index.graph.nodes.length;
  const target = Math.max(1, totals * 0.03);
  const output: Array<{ capsuleId: string; missingTokens: string[]; score: number }> = [];

  for (const node of index.graph.nodes.slice(0, 1000)) {
    const tokens = tokenize(node.summary || '');
    const uniqueTokens = [...new Set(tokens)];
    const missing = uniqueTokens.filter((token) => (nodeByToken.get(token)?.size || 0) <= 1);
    const score = Math.max(0, 1 - missing.length / Math.max(uniqueTokens.length, 1));
    if (missing.length > 0 && uniqueTokens.length > 0 && score < target) {
      output.push({
        capsuleId: node.id,
        missingTokens: missing.slice(0, 8),
        score: Number(score.toFixed(3)),
      });
    }
  }

  return output
    .sort((a, b) => a.score - b.score)
    .slice(0, 200);
};

export const runVoidMapper = async (argv: string[]): Promise<A2CCommandReport> => {
  const kbRoot = process.cwd();
  const dryRun = argv.includes('--dry-run');
  const entries = await detectVoidRegions(kbRoot);
  const layout = resolveRuntimeLayout(kbRoot);

  const markdown = [
    '# Void Mapper Report',
    `Generated: ${isoUtcNow()}`,
    `- Nodes probed: ${entries.length}`,
    ...entries.slice(0, 20).map((entry) => `- ${entry.capsuleId}: score=${entry.score}, missing=${entry.missingTokens.join(',')}`),
    '',
  ];

  const jsonOut = path.join(layout.reportsDir, 'void_mapper_report.json');
  await fs.mkdir(layout.reportsDir, { recursive: true });
  await fs.writeFile(jsonOut, `${JSON.stringify({ entries }, null, 2)}\n`, 'utf-8');
  await fs.writeFile(path.join(layout.reportsDir, 'VOID_REPORT.md'), markdown.join('\n'), 'utf-8');

  return {
    skill_id: 'anything-to-capsules',
    module: 'VOIDS',
    timestamp: isoUtcNow(),
    status: entries.length > 0 ? 'COMPLETE' : 'PARTIAL',
    scope: { kb_root: kbRoot, dry_run: dryRun },
    metrics: { nodes_with_void: entries.length, dry_run: dryRun ? 1 : 0 },
    results: { entries },
    warnings: [],
    errors: [],
    metadata: { confidence: entries.length > 0 ? 'MEDIUM' : 'HIGH', human_review_required: entries.length > 0, self_corrections: 0 },
  };
};
