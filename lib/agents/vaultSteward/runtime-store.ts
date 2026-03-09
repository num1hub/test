import { execFileSync } from 'child_process';
import fsp from 'fs/promises';
import path from 'path';
import { z } from 'zod';

import { AGENTS_DIR, VAULT_STEWARD_CONFIG_PATH, VAULT_STEWARD_HISTORY_PATH, VAULT_STEWARD_LATEST_PATH, VAULT_STEWARD_QUEUE_PATH, VAULT_STEWARD_RUNTIME_PATH } from './constants';
import {
  vaultStewardConfigSchema,
  vaultStewardQueueSchema,
  vaultStewardRuntimeSchema,
  vaultStewardRunSchema,
  type VaultStewardConfig,
  type VaultStewardQueue,
  type VaultStewardRuntime,
  type VaultStewardRun,
} from './schemas';
import { isVaultStewardProcessCommand } from './queue-planning';

type VaultStewardProcessEntry = {
  pid: number;
  ppid: number | null;
  pgid: number | null;
  command: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

export const DEFAULT_VAULT_STEWARD_CONFIG = (): VaultStewardConfig => ({
  version: 1,
  enabled: false,
  provider: null,
  model: null,
  mode: 'nightly',
  interval_minutes: 30,
  night_start_hour: 1,
  night_end_hour: 6,
  timezone: null,
  max_targets_per_run: 6,
  updated_at: new Date(0).toISOString(),
});

export const DEFAULT_VAULT_STEWARD_RUNTIME = (): VaultStewardRuntime => ({
  version: 1,
  pid: null,
  status: 'stopped',
  started_at: null,
  last_heartbeat_at: null,
  last_run_at: null,
  last_exit_at: null,
  latest_run_id: null,
  loop_count: 0,
  idle_streak: 0,
  next_scheduled_at: null,
  last_error: null,
  updated_at: new Date(0).toISOString(),
});

export const DEFAULT_VAULT_STEWARD_QUEUE = (): VaultStewardQueue => ({
  version: 1,
  updated_at: new Date(0).toISOString(),
  jobs: [],
});

async function ensureAgentsDir(): Promise<void> {
  await fsp.mkdir(AGENTS_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  try {
    const raw = JSON.parse(await fsp.readFile(filePath, 'utf-8')) as unknown;
    return schema.parse(raw);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback;
    }
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureAgentsDir();
  const directory = path.dirname(filePath);
  const tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  await fsp.writeFile(tempPath, JSON.stringify(value, null, 2), 'utf-8');
  await fsp.rename(tempPath, filePath);
}

function isProcessAlive(pid: number | null): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function listVaultStewardProcesses(): VaultStewardProcessEntry[] {
  try {
    const raw = execFileSync('ps', ['-ww', '-eo', 'pid=,ppid=,pgid=,args='], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return uniqueBy(
      raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .flatMap((line) => {
          const match = line.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
          if (!match) return [];
          const [, pidText, ppidText, pgidText, command] = match;
          const pid = Number(pidText);
          const ppid = Number(ppidText);
          const pgid = Number(pgidText);
          if (!Number.isInteger(pid) || pid <= 0) return [];
          if (pid === process.pid) return [];
          return isVaultStewardProcessCommand(command)
            ? [
                {
                  pid,
                  ppid: Number.isInteger(ppid) && ppid > 0 ? ppid : null,
                  pgid: Number.isInteger(pgid) && pgid > 0 ? pgid : null,
                  command,
                },
              ]
            : [];
        }),
      (entry) => String(entry.pid),
    );
  } catch {
    return [];
  }
}

export async function terminateVaultStewardProcesses(excludePids: number[] = []): Promise<void> {
  const entries = listVaultStewardProcesses();
  const excluded = new Set(excludePids.filter((pid) => Number.isInteger(pid) && pid > 0));
  const excludedPgids = new Set(
    entries
      .filter((entry) => excluded.has(entry.pid) && entry.pgid)
      .map((entry) => entry.pgid as number),
  );
  const targetEntries = entries.filter(
    (entry) => !excluded.has(entry.pid) && !excludedPgids.has(entry.pgid ?? -1),
  );
  const targetPgids = uniqueBy(
    targetEntries
      .map((entry) => entry.pgid)
      .filter(
        (pgid): pgid is number =>
          typeof pgid === 'number' && Number.isInteger(pgid) && pgid > 0,
      ),
    (pgid) => String(pgid),
  );
  const targetPids = uniqueBy(
    targetEntries.map((entry) => entry.pid),
    (pid) => String(pid),
  );

  for (const pgid of targetPgids) {
    try {
      process.kill(-pgid, 'SIGTERM');
    } catch {
      // noop
    }
  }

  for (const pid of targetPids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // noop
    }
  }

  if (targetPids.length === 0) return;

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 250);
  });

  for (const pid of targetPids) {
    if (!isProcessAlive(pid)) continue;
    const entry = targetEntries.find((candidate) => candidate.pid === pid);
    if (entry?.pgid) {
      try {
        process.kill(-entry.pgid, 'SIGKILL');
      } catch {
        // noop
      }
    }
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // noop
    }
  }
}

export function normalizeVaultStewardRuntime(runtime: VaultStewardRuntime): VaultStewardRuntime {
  const alive = isProcessAlive(runtime.pid);
  if (alive) {
    if (runtime.status === 'running' || runtime.status === 'starting') return runtime;
    return {
      ...runtime,
      status: 'running',
      updated_at: nowIso(),
    };
  }

  if (runtime.status === 'stopped' && runtime.pid === null) return runtime;

  return {
    ...runtime,
    pid: null,
    status: 'stopped',
    last_exit_at: runtime.last_exit_at ?? nowIso(),
    updated_at: nowIso(),
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readVaultStewardConfig(): Promise<VaultStewardConfig> {
  return readJsonFile(VAULT_STEWARD_CONFIG_PATH, vaultStewardConfigSchema, DEFAULT_VAULT_STEWARD_CONFIG());
}

export async function writeVaultStewardConfig(config: VaultStewardConfig): Promise<void> {
  await writeJsonFile(VAULT_STEWARD_CONFIG_PATH, config);
}

export async function readVaultStewardRuntime(): Promise<VaultStewardRuntime> {
  return normalizeVaultStewardRuntime(
    await readJsonFile(VAULT_STEWARD_RUNTIME_PATH, vaultStewardRuntimeSchema, DEFAULT_VAULT_STEWARD_RUNTIME()),
  );
}

export async function writeVaultStewardRuntime(runtime: VaultStewardRuntime): Promise<void> {
  await writeJsonFile(VAULT_STEWARD_RUNTIME_PATH, runtime);
}

export async function readVaultStewardQueue(): Promise<VaultStewardQueue> {
  return readJsonFile(VAULT_STEWARD_QUEUE_PATH, vaultStewardQueueSchema, DEFAULT_VAULT_STEWARD_QUEUE());
}

export async function writeVaultStewardQueue(queue: VaultStewardQueue): Promise<void> {
  await writeJsonFile(VAULT_STEWARD_QUEUE_PATH, queue);
}

export async function readVaultStewardLatestRun(): Promise<VaultStewardRun | null> {
  return readJsonFile(VAULT_STEWARD_LATEST_PATH, vaultStewardRunSchema.nullable(), null);
}

export async function writeVaultStewardLatestRun(run: VaultStewardRun): Promise<void> {
  await writeJsonFile(VAULT_STEWARD_LATEST_PATH, run);
  await ensureAgentsDir();
  await fsp.appendFile(VAULT_STEWARD_HISTORY_PATH, `${JSON.stringify(run)}\n`, 'utf-8');
}

