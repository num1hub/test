import fs from 'fs/promises';
import path from 'path';
import { resolveRuntimeLayout } from './layout';
import { isoUtcNow } from './common';
import { loadIndex } from './index';
import type { A2CCommandReport } from './types';

interface SweepRow {
  capsuleId: string;
  ageDays: number;
  action: 'decay_review' | 'deep_archive';
  status: string;
}

export const detectStaleOrphans = async (kbRoot: string, staleDays = 45, deepDays = 180): Promise<SweepRow[]> => {
  const index = await loadIndex(kbRoot);
  const layout = resolveRuntimeLayout(kbRoot);
  if (!index) return [];

  const now = Date.now();
  const out: SweepRow[] = [];

  for (const node of index.graph.nodes) {
    const status = (node.status || '').toLowerCase();
    if (status !== 'draft' && status !== 'archived') continue;

    const updated = Date.parse(node.updated_at || '') || Date.now();
    const ageDays = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
    const inUse = index.graph.edges.some((edge) => edge.target === node.id || edge.source === node.id);
    if (inUse) continue;

    const action = ageDays >= deepDays ? 'deep_archive' : ageDays >= staleDays ? 'decay_review' : null;
    if (!action) continue;

    out.push({ capsuleId: node.id, ageDays, action, status });
  }

  await fs.mkdir(layout.pipelineFailedDir, { recursive: true });
  const reportPath = path.join(layout.pipelineFailedDir, `sweeper-${Date.now()}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(out, null, 2)}\n`, 'utf-8');
  return out;
};

export const runApoptosis = async (argv: string[]): Promise<A2CCommandReport> => {
  const kbRoot = process.cwd();
  const dryRun = argv.includes('--dry-run');
  const staleDays = argv.includes('--stale-days') ? Number(argv[argv.indexOf('--stale-days') + 1] || '45') : 45;
  const deepDays = argv.includes('--deep-days') ? Number(argv[argv.indexOf('--deep-days') + 1] || '180') : 180;
  const reportRows = await detectStaleOrphans(kbRoot, staleDays, deepDays);

  return {
    skill_id: 'anything-to-capsules',
    module: 'SWEEEPER',
    timestamp: isoUtcNow(),
    status: 'COMPLETE',
    scope: { kb_root: kbRoot, dry_run: dryRun, stale_days: staleDays, deep_days: deepDays },
    metrics: { candidates: reportRows.length },
    results: { candidates: reportRows },
    warnings: [],
    errors: [],
    metadata: { confidence: reportRows.length > 0 ? 'MEDIUM' : 'HIGH', human_review_required: reportRows.length > 0, self_corrections: 0 },
  };
};
