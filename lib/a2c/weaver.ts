import { loadIndex } from './index';
import { tokenize, isoUtcNow } from './common';
import { resolveRuntimeLayout } from './layout';
import fs from 'fs/promises';
import path from 'path';
import type { A2CCommandReport } from './types';

interface WeaverOptions {
  kbRoot?: string;
  write?: boolean;
}

const jaccard = (left: Set<string>, right: Set<string>): number => {
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union > 0 ? intersection / union : 0;
};

export const detectWeaveCandidates = async (kbRoot: string, threshold = 0.33): Promise<Array<{ source: string; target: string; score: number }>> => {
  const index = await loadIndex(kbRoot);
  if (!index) return [];
  const rows = index.graph.nodes.map((node) => ({
    id: node.id,
    tokens: new Set(tokenize(`${node.title} ${node.summary} ${(node.keywords || []).join(' ')}`)),
  }));

  const out: Array<{ source: string; target: string; score: number }> = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const score = jaccard(rows[i].tokens, rows[j].tokens);
      if (score >= threshold) {
        out.push({ source: rows[i].id, target: rows[j].id, score: Number(score.toFixed(3)) });
      }
      if (out.length > 1200) break;
    }
  }

  return out.sort((a, b) => b.score - a.score);
};

export const runWeaver = async (options: WeaverOptions = {}): Promise<A2CCommandReport> => {
  const kbRoot = options.kbRoot ?? process.cwd();
  const candidates = await detectWeaveCandidates(kbRoot, 0.28);
  const layout = resolveRuntimeLayout(kbRoot);
  const shouldWrite = options.write !== false;

  const md = [
    '# Weaver Candidate Report',
    `Generated: ${isoUtcNow()}`,
    ...candidates.slice(0, 30).map((item) => `- ${item.source} -> ${item.target}: ${item.score}`),
  ];

  const jsonOut = path.join(layout.reportsDir, 'weaver_report.json');
  if (shouldWrite) {
    await fs.mkdir(layout.reportsDir, { recursive: true });
    await fs.writeFile(jsonOut, `${JSON.stringify({ candidates }, null, 2)}\n`, 'utf-8');
    await fs.writeFile(path.join(layout.reportsDir, 'WEAVER_REPORT.md'), md.join('\n'), 'utf-8');
  }

  return {
    skill_id: 'anything-to-capsules',
    module: 'WEAVER',
    timestamp: isoUtcNow(),
    status: 'COMPLETE',
    scope: { kb_root: kbRoot, candidate_count: candidates.length },
    metrics: { proposals: candidates.length },
    results: { candidates },
    warnings: [],
    errors: [],
    metadata: { confidence: 'MEDIUM', human_review_required: false, self_corrections: 0 },
  };
};
