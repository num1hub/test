import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { runRecon, buildWorkspaceReport } from './recon';
import { runAudit } from './audit';
import { buildIndex } from './index';
import { runDaemonWatcher } from './watch';
import { runQueryCommand } from './query';
import { runWeaver } from './weaver';
import { runApoptosis } from './sweeper';
import { ensureRuntimeLayout } from './layout';
import { isoUtcNow } from './common';
import { SKILL_ID } from './common';
import type { A2CCommandReport } from './types';

export const runAutonomousCycle = async (argv: string[]): Promise<A2CCommandReport> => {
  const kbRoot = process.cwd();
  const workspaceRoot = kbRoot;
  const dryRun = argv.includes('--dry-run');
  const input = argv.includes('--input') ? argv[argv.indexOf('--input') + 1] : '';
  const wave = argv.includes('--wave') ? Number(argv[argv.indexOf('--wave') + 1]) : 1;

  const status: A2CCommandReport['status'] = dryRun ? 'PARTIAL' : 'COMPLETE';

  await ensureRuntimeLayout(kbRoot);

  const recon = await runRecon(workspaceRoot);
  const indexBuild = await buildIndex(kbRoot);
  const watcher = await runDaemonWatcher(['--once']);
  const audit = await runAudit(['--expected-dialect', 'repo_native']);
  const weaver = await runWeaver();
  const sweeper = await runApoptosis(['--dry-run']);

  const manifest = {
    skill_id: SKILL_ID,
    module: 'AUTONOMOUS',
    timestamp: isoUtcNow(),
    status,
    scope: { kb_root: kbRoot, wave, input, dry_run: dryRun },
    metrics: {
      staged: watcher.staged.length,
      nodes: indexBuild.index.graph.metrics.total_nodes,
      issues: audit.errors.length,
    },
    results: {
      recon,
      watcher,
      audit,
      weaver: { status: weaver.status },
      sweeper: { status: sweeper.status },
    },
    warnings: [],
    errors: audit.errors,
    metadata: {
      confidence: (audit.errors.length > 0 ? 'LOW' : 'HIGH') as A2CCommandReport['metadata']['confidence'],
      human_review_required: audit.errors.length > 0,
      self_corrections: 0,
    },
  };

  const layout = await ensureRuntimeLayout(kbRoot);
  const report = path.join(layout.tasksDir, `autonomous-${Date.now()}.json`);
  await fs.mkdir(layout.tasksDir, { recursive: true });
  await fs.writeFile(report, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');

  const history = path.join(layout.autonomousRunHistoryPath);
  const line = JSON.stringify({ timestamp: isoUtcNow(), run: crypto.createHash('sha1').update(JSON.stringify(manifest)).digest('hex') });
  await fs.appendFile(history, `${line}\n`);

  return manifest;
};
