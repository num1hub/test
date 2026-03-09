import fs from 'fs';
import path from 'path';
import { RuntimeLayoutConfig } from './types';

const resolveRoot = (kbRoot: string): string => path.resolve(kbRoot);

const hasPath = (value: string): boolean => fs.existsSync(value);

export const isN1HubRepo = (root: string): boolean =>
  hasPath(path.join(root, 'data', 'capsules')) || hasPath(path.join(root, 'package.json'));

export const defaultRuntimeMode = (workspaceRoot: string): RuntimeLayoutConfig['mode'] => {
  const root = resolveRoot(workspaceRoot);
  return isN1HubRepo(root) ? 'n1hub_repo' : 'unknown';
};

export const resolveRuntimeLayout = (kbRoot: string): RuntimeLayoutConfig => {
  const root = resolveRoot(kbRoot);
  const runtimeRoot = path.join(root, 'data', 'private', 'a2c');
  const tasksDir = path.join(runtimeRoot, 'tasks');
  const pipelineRoot = path.join(runtimeRoot, 'ingest_pipeline');
  return {
    mode: defaultRuntimeMode(root),
    kbRoot: root,
    vaultDir: path.join(root, 'data', 'capsules'),
    indexPath: path.join(runtimeRoot, 'index.json'),
    reportsDir: path.join(root, 'reports', 'a2c'),
    tasksDir,
    pipelineRoot,
    pipelineQuarantineDir: path.join(pipelineRoot, 'buffer_quarantine'),
    pipelineWorkspaceDir: path.join(pipelineRoot, 'workspace_active'),
    pipelineFailedDir: path.join(pipelineRoot, 'failed_retention'),
    runManifestsDir: path.join(tasksDir, 'run_manifests'),
    queueLedgerPath: path.join(tasksDir, 'QUEUE_LEDGER.jsonl'),
    defaultPlanPath: path.join(tasksDir, 'PLAN.md'),
    defaultConflictReviewPath: path.join(tasksDir, 'CONFLICT_REVIEW.md'),
    defaultMergePlanPath: path.join(tasksDir, 'MERGE_PLAN.md'),
    intakeDropzoneDir: path.join(runtimeRoot, 'intake', 'dropzone'),
    intakeArchiveRawDir: path.join(runtimeRoot, 'intake', 'archive_raw'),
    daemonPidPath: path.join(root, 'reports', 'a2c', 'n1_daemon_pids.json'),
    cronStatePath: path.join(root, 'reports', 'a2c', 'cron_state.json'),
    cronLogPath: path.join(root, 'reports', 'a2c', 'cron_orchestrator.log'),
    cronRunLockPath: path.join(root, 'reports', 'a2c', 'cron_orchestrator.lock.json'),
    autonomousRunLockPath: path.join(root, 'reports', 'a2c', 'autonomous_run.lock.json'),
    autonomousRunHistoryPath: path.join(root, 'reports', 'a2c', 'autonomous_run_history.jsonl'),
  };
};

export const ensureRuntimeLayout = async (kbRoot: string, includeIntake = true): Promise<RuntimeLayoutConfig> => {
  const layout = resolveRuntimeLayout(kbRoot);
  const dirs = [
    layout.vaultDir,
    path.dirname(layout.indexPath),
    layout.reportsDir,
    layout.tasksDir,
    layout.pipelineRoot,
    layout.pipelineQuarantineDir,
    layout.pipelineWorkspaceDir,
    layout.pipelineFailedDir,
    layout.runManifestsDir,
  ];

  if (includeIntake) {
    dirs.push(layout.intakeDropzoneDir, layout.intakeArchiveRawDir);
  }

  await Promise.all(dirs.map((dir) => fs.promises.mkdir(dir, { recursive: true })));
  return layout;
};

export const runtimeModeLabel = (kbRoot: string): RuntimeLayoutConfig['mode'] =>
  defaultRuntimeMode(kbRoot);
