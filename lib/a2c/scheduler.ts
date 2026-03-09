import fs from 'fs/promises';
import path from 'path';
import { isoUtcNow } from './common';
import { resolveRuntimeLayout } from './layout';
import type { A2CCommandReport } from './types';

interface TaskState {
  day: string;
  week_day: number;
  completed_at: string;
  tasks: string[];
}

const TASKS = {
  morning: {
    name: 'morning',
    cron: '07:00',
    module: 'query_orchestrator',
    description: 'frontier and integrity scan',
  },
  night: {
    name: 'night',
    cron: '23:00',
    module: 'autonomous_weaver',
    description: 'weaver/gardener pass',
  },
  weekend: {
    name: 'weekend',
    cron: 'SUN',
    module: 'apoptosis_sweeper',
    description: 'stale maintenance sweep',
  },
};

const readState = async (statePath: string): Promise<TaskState | null> => {
  try {
    return JSON.parse(await fs.readFile(statePath, 'utf-8')) as TaskState;
  } catch {
    return null;
  }
};

const writeState = async (statePath: string, state: TaskState): Promise<void> => {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
};

const staleLock = async (lockPath: string, ttlMs = 60 * 60 * 1000): Promise<boolean> => {
  try {
    const raw = JSON.parse(await fs.readFile(lockPath, 'utf-8')) as { started_at: string };
    const then = Date.parse(raw.started_at);
    if (Number.isNaN(then)) return false;
    if (Date.now() - then > ttlMs) {
      await fs.unlink(lockPath);
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const acquireLock = async (lockPath: string): Promise<boolean> => {
  const locked = await staleLock(lockPath);
  if (locked) return false;
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  await fs.writeFile(lockPath, `${JSON.stringify({ started_at: isoUtcNow() }, null, 2)}\n`, 'utf-8');
  return true;
};

const releaseLock = async (lockPath: string): Promise<void> => {
  try {
    await fs.unlink(lockPath);
  } catch {
    // ignore
  }
};

const dayName = (date = new Date()) => date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 3);

export const runCronPlanner = async (argv: string[]): Promise<A2CCommandReport> => {
  const once = argv.includes('--once');
  const root = process.cwd();
  const layout = resolveRuntimeLayout(root);

  const lockPath = layout.cronRunLockPath;
  const acquired = await acquireLock(lockPath);
  if (!acquired && !once) {
    return {
      skill_id: 'anything-to-capsules',
      module: 'CRON',
      timestamp: isoUtcNow(),
      status: 'FAILED',
      scope: { reason: 'cron_lock_present', kb_root: root },
      metrics: { scheduled: 0 },
      results: {},
      warnings: ['stale lock prevented execution'],
      errors: ['lock_present'],
      metadata: { confidence: 'LOW', human_review_required: true, self_corrections: 0 },
    };
  }

  try {
    const state = (await readState(layout.cronStatePath)) ?? {
      day: new Date().toDateString(),
      week_day: new Date().getDay(),
      completed_at: '',
      tasks: [],
    };

    const planned = [] as Array<{ task: string; command: string; reason: string }>;
    const now = new Date();
    const today = dayName(now);

    planned.push({ task: TASKS.morning.name, command: TASKS.morning.module, reason: TASKS.morning.description });

    if (now.getHours() >= 21 || now.getHours() <= 4) {
      planned.push({ task: TASKS.night.name, command: TASKS.night.module, reason: TASKS.night.description });
    }
    if (today === 'SAT' || today === 'SUN') {
      planned.push({ task: TASKS.weekend.name, command: TASKS.weekend.module, reason: TASKS.weekend.description });
    }

    state.completed_at = isoUtcNow();
    state.tasks = planned.map((item) => item.task);
    state.day = now.toDateString();
    state.week_day = now.getDay();
    await writeState(layout.cronStatePath, state);

    const logLine = [
      {
        timestamp: isoUtcNow(),
        planned: planned.length,
        tasks: planned.map((item) => item.task),
      },
    ];

    await fs.appendFile(layout.cronLogPath, `${JSON.stringify(logLine, null, 2)}\n`);

    return {
      skill_id: 'anything-to-capsules',
      module: 'CRON',
      timestamp: isoUtcNow(),
      status: 'COMPLETE',
      scope: { kb_root: root, once: once },
      metrics: { scheduled: planned.length },
      results: { tasks: planned },
      warnings: [],
      errors: [],
      metadata: { confidence: 'MEDIUM', human_review_required: false, self_corrections: 0 },
    };
  } finally {
    if (!once) {
      await releaseLock(lockPath);
    }
  }
};
