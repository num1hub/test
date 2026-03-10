#!/usr/bin/env tsx
import { runScheduledIteration } from "@/lib/agents/n1/scheduler";

interface ParsedArgs {
  intervalMinutes: number;
  taskId?: string;
  dryRun: boolean;
  force: boolean;
}

const parseArgs = (argv: string[]): ParsedArgs => {
  let intervalMinutes = 30;
  let taskId: string | undefined;
  let dryRun = false;
  let force = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--interval-minutes") {
      const rawValue = argv[index + 1];
      if (!rawValue) {
        throw new Error("--interval-minutes requires a value");
      }
      intervalMinutes = Number.parseInt(rawValue, 10);
      index += 1;
      continue;
    }
    if (arg === "--task") {
      const rawValue = argv[index + 1];
      if (!rawValue) {
        throw new Error("--task requires a value");
      }
      taskId = rawValue;
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    throw new Error("--interval-minutes must be greater than zero");
  }

  return {
    intervalMinutes,
    taskId,
    dryRun,
    force,
  };
};

void (async () => {
  const args = parseArgs(process.argv.slice(2));
  const result = runScheduledIteration({
    rootDir: process.cwd(),
    intervalMinutes: args.intervalMinutes,
    taskId: args.taskId,
    dryRun: args.dryRun,
    force: args.force,
  });
  process.stdout.write(`${JSON.stringify(result.snapshot, null, 2)}\n`);
})()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "scheduled iteration failed"}\n`);
    process.exit(1);
  });
