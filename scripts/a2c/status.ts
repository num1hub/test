#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';
import { resolveRuntimeLayout } from '../../lib/a2c/layout';
import { loadIndex } from '../../lib/a2c/index';

const parseArgs = (argv: string[]): { kbRoot: string; json: boolean } => {
  const idx = argv.indexOf('--kb-root');
  const kbRoot = idx >= 0 ? argv[idx + 1] : process.cwd();
  return { kbRoot, json: argv.includes('--json') };
};

const countLines = async (filePath: string): Promise<number> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean).length;
  } catch {
    return 0;
  }
};

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const layout = resolveRuntimeLayout(args.kbRoot);
  const index = await loadIndex(args.kbRoot);
  const [
    queueEvents,
    autonomousRuns,
    daemonLockExists,
    cronLockExists,
    intakeDropzoneCount,
    quarantineCount,
    workspaceCount,
    failedRetentionCount,
  ] = await Promise.all([
    countLines(layout.queueLedgerPath),
    countLines(layout.autonomousRunHistoryPath),
    fs.access(layout.daemonPidPath).then(() => true).catch(() => false),
    fs.access(layout.cronRunLockPath).then(() => true).catch(() => false),
    fs.readdir(layout.intakeDropzoneDir).then((items) => items.length).catch(() => 0),
    fs.readdir(layout.pipelineQuarantineDir).then((items) => items.length).catch(() => 0),
    fs.readdir(layout.pipelineWorkspaceDir).then((items) => items.length).catch(() => 0),
    fs.readdir(layout.pipelineFailedDir).then((items) => items.length).catch(() => 0),
  ]);

  const out = {
    status: 'ok',
    layout_root: path.join(args.kbRoot, 'data', 'private', 'a2c'),
    timestamp: new Date().toISOString(),
    runtime_mode: layout.mode,
    daemon_lock_exists: daemonLockExists,
    cron_lock_exists: cronLockExists,
    queue_event_count: queueEvents,
    autonomous_run_count: autonomousRuns,
    intake: {
      dropzone_files: intakeDropzoneCount,
      quarantine_items: quarantineCount,
      workspace_items: workspaceCount,
      failed_retention_items: failedRetentionCount,
    },
    index: index
      ? {
          present: true,
          nodes: index.graph.metrics.total_nodes,
          edges: index.graph.metrics.total_edges,
          density: index.graph.metrics.graph_density,
          generated_at: index.graph.generated_at,
        }
      : {
          present: false,
        },
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
})();
