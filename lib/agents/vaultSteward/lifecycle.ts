import fs from 'fs';
import { spawn } from 'child_process';

import { TSX_CLI_PATH, VAULT_STEWARD_LOG_PATH, VAULT_STEWARD_SCRIPT_PATH } from './constants';
import { vaultStewardRuntimeSchema, type VaultStewardConfig, type VaultStewardRun, type VaultStewardRuntime } from './schemas';
import {
  DEFAULT_VAULT_STEWARD_RUNTIME,
  normalizeVaultStewardRuntime,
  readVaultStewardConfig,
  readVaultStewardRuntime,
  terminateVaultStewardProcesses,
  writeVaultStewardRuntime,
  sleep,
} from './runtime-store';

function nowIso(): string {
  return new Date().toISOString();
}

export async function startVaultStewardLifecycle(): Promise<VaultStewardRuntime> {
  const runtime = await readVaultStewardRuntime();
  const runtimeAlive = runtime.status !== 'stopped' && runtime.pid != null;
  await terminateVaultStewardProcesses(runtimeAlive && runtime.pid ? [runtime.pid] : []);
  if (runtime.status !== 'stopped' && runtime.pid != null) {
    return runtime;
  }

  if (!fs.existsSync(TSX_CLI_PATH)) {
    const failedRuntime = normalizeVaultStewardRuntime({
      ...DEFAULT_VAULT_STEWARD_RUNTIME(),
      last_error: 'tsx runtime not found; install dependencies before starting Vault Steward',
      updated_at: nowIso(),
    });
    await writeVaultStewardRuntime(failedRuntime);
    return failedRuntime;
  }

  const logFd = fs.openSync(VAULT_STEWARD_LOG_PATH, 'a');
  const child = spawn(process.execPath, [TSX_CLI_PATH, VAULT_STEWARD_SCRIPT_PATH], {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: {
      ...process.env,
    },
  });
  child.unref();

  const nextRuntime = vaultStewardRuntimeSchema.parse({
    version: 1,
    pid: child.pid ?? null,
    status: 'starting',
    started_at: nowIso(),
    last_heartbeat_at: null,
    last_run_at: null,
    last_exit_at: null,
    latest_run_id: null,
    loop_count: 0,
    idle_streak: 0,
    next_scheduled_at: null,
    last_error: null,
    updated_at: nowIso(),
  });
  await writeVaultStewardRuntime(nextRuntime);
  return nextRuntime;
}

export async function stopVaultStewardLifecycle(): Promise<VaultStewardRuntime> {
  const runtime = await readVaultStewardRuntime();
  if (runtime.status !== 'stopped' && runtime.pid) {
    try {
      process.kill(-runtime.pid, 'SIGTERM');
    } catch {
      // noop
    }
    try {
      process.kill(runtime.pid, 'SIGTERM');
    } catch {
      // noop
    }
  }
  await terminateVaultStewardProcesses();

  const nextRuntime = vaultStewardRuntimeSchema.parse({
    ...runtime,
    pid: null,
    status: 'stopped',
    idle_streak: 0,
    next_scheduled_at: null,
    last_exit_at: nowIso(),
    updated_at: nowIso(),
  });
  await writeVaultStewardRuntime(nextRuntime);
  return nextRuntime;
}

export async function markVaultStewardLifecycleHeartbeat(
  patch: Partial<VaultStewardRuntime>,
): Promise<void> {
  const current = await readVaultStewardRuntime();
  await writeVaultStewardRuntime(
    vaultStewardRuntimeSchema.parse({
      ...current,
      ...patch,
      updated_at: nowIso(),
    }),
  );
}

export async function runVaultStewardDaemonLifecycle(options: {
  once?: boolean;
  readConfig?: () => Promise<VaultStewardConfig>;
  runCycle: () => Promise<VaultStewardRun>;
  computeAdaptiveDaemonDelay: (
    config: VaultStewardConfig,
    run: VaultStewardRun,
    idleStreak: number,
  ) => { delayMs: number; idleStreak: number };
}): Promise<void> {
  const once = options.once === true;
  const readConfig = options.readConfig ?? readVaultStewardConfig;

  const shutdown = async () => {
    await markVaultStewardLifecycleHeartbeat({
      pid: null,
      status: 'stopped',
      last_exit_at: nowIso(),
    });
  };

  process.on('SIGINT', () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    void shutdown().finally(() => process.exit(0));
  });

  await markVaultStewardLifecycleHeartbeat({
    pid: process.pid,
    status: 'running',
    started_at: nowIso(),
    last_heartbeat_at: nowIso(),
    idle_streak: 0,
    next_scheduled_at: null,
    last_error: null,
  });

  do {
    const config = await readConfig();
    if (!config.enabled && !once) {
      break;
    }

    const runtimeBeforeLoop = await readVaultStewardRuntime();
    await markVaultStewardLifecycleHeartbeat({
      pid: process.pid,
      status: 'running',
      last_heartbeat_at: nowIso(),
      loop_count: runtimeBeforeLoop.loop_count + 1,
      next_scheduled_at: null,
      last_error: null,
    });

    const run = await options.runCycle();
    const { delayMs, idleStreak } = options.computeAdaptiveDaemonDelay(
      config,
      run,
      runtimeBeforeLoop.idle_streak,
    );
    const nextScheduledAt = once ? null : new Date(Date.now() + delayMs).toISOString();
    await markVaultStewardLifecycleHeartbeat({
      pid: process.pid,
      status: 'running',
      latest_run_id: run.run_id,
      last_run_at: run.completed_at,
      idle_streak: idleStreak,
      next_scheduled_at: nextScheduledAt,
      last_error: run.status === 'failed' ? run.reason : null,
      last_heartbeat_at: nowIso(),
    });

    if (once) break;

    await sleep(delayMs);
  } while (true);

  await shutdown();
}
