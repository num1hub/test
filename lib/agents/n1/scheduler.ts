import fs from "node:fs";
import path from "node:path";

import { runAutomatedUpdate } from "@/lib/agents/n1/automated-update";
import {
  SCHEDULER_HISTORY_PATH,
  SCHEDULER_LATEST_PATH,
  SCHEDULER_REPORTS_DIR,
  SCHEDULER_STATE_PATH,
} from "@/lib/agents/n1/constants";
import type {
  RepoStateSnapshot,
  RunScheduledIterationOptions,
  ScheduledIterationExecutionSnapshot,
  ScheduledIterationResult,
} from "@/lib/agents/n1/types";

interface ScheduledIterationState {
  lastRunAt: string | null;
  lastIterationId: string | null;
  lastTaskId: string | null;
}

const readSchedulerState = (statePath: string): ScheduledIterationState => {
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8")) as ScheduledIterationState;
  } catch {
    return {
      lastRunAt: null,
      lastIterationId: null,
      lastTaskId: null,
    };
  }
};

const ensureParentDir = (targetPath: string): void => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
};

const writeJson = (targetPath: string, value: unknown): void => {
  ensureParentDir(targetPath);
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const appendJsonLine = (targetPath: string, value: unknown): void => {
  ensureParentDir(targetPath);
  fs.appendFileSync(targetPath, `${JSON.stringify(value)}\n`, "utf8");
};

const toSlug = (timestamp: string): string => timestamp.replace(/[:.]/g, "-");

const addMinutes = (value: Date, minutes: number): string => new Date(value.getTime() + minutes * 60 * 1000).toISOString();

const writeReport = (
  reportPath: string,
  scheduleId: string,
  intervalMinutes: number,
  previousRunAt: string | null,
  nextEligibleAt: string,
  command: string,
  execution: ScheduledIterationExecutionSnapshot,
): void => {
  ensureParentDir(reportPath);
  const lines = [
    "# N1 Scheduled Iteration",
    "",
    `- Schedule id: \`${scheduleId}\``,
    `- Status: \`${execution.status}\``,
    `- Reason: ${execution.reason}`,
    `- Interval minutes: \`${intervalMinutes}\``,
    `- Previous run at: ${previousRunAt ? `\`${previousRunAt}\`` : "`none`"}`,
    `- Next eligible at: \`${nextEligibleAt}\``,
    `- Command: \`${command}\``,
    `- Selected task: ${execution.selectedTaskId ? `\`${execution.selectedTaskId}\`` : "`none`"}`,
    `- Automated update latest: ${execution.automatedUpdateLatestPath ? `\`${execution.automatedUpdateLatestPath}\`` : "`none`"}`,
    `- Automated update report: ${execution.automatedUpdateReportPath ? `\`${execution.automatedUpdateReportPath}\`` : "`none`"}`,
    `- Repo sync latest: ${execution.repoSyncLatestPath ? `\`${execution.repoSyncLatestPath}\`` : "`none`"}`,
    `- Orchestration latest: ${execution.orchestrationLatestPath ? `\`${execution.orchestrationLatestPath}\`` : "`none`"}`,
    "",
  ];
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
};

export const runScheduledIteration = ({
  rootDir,
  intervalMinutes,
  taskId,
  dryRun = false,
  force = false,
  now = new Date(),
  repoStateProvider,
}: RunScheduledIterationOptions): ScheduledIterationResult => {
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    throw new Error("intervalMinutes must be greater than zero");
  }

  const createdAt = now.toISOString();
  const scheduleId = `n1-schedule-${toSlug(createdAt)}`;
  const latestPath = path.join(rootDir, SCHEDULER_LATEST_PATH);
  const historyPath = path.join(rootDir, SCHEDULER_HISTORY_PATH);
  const statePath = path.join(rootDir, SCHEDULER_STATE_PATH);
  const reportPath = path.join(rootDir, SCHEDULER_REPORTS_DIR, `${scheduleId}.md`);
  const commandParts = ["npm run n1:update:schedule", "--", `--interval-minutes ${intervalMinutes}`];
  if (taskId) commandParts.push(`--task ${taskId}`);
  if (force) commandParts.push("--force");
  if (dryRun) commandParts.push("--dry-run");
  const command = commandParts.join(" ");

  const state = readSchedulerState(statePath);
  const previousRunAt = state.lastRunAt;
  const previousRunMs = previousRunAt ? Date.parse(previousRunAt) : Number.NaN;
  const elapsedMs = Number.isNaN(previousRunMs) ? Number.POSITIVE_INFINITY : now.getTime() - previousRunMs;
  const intervalMs = intervalMinutes * 60 * 1000;
  const due = force || !previousRunAt || elapsedMs >= intervalMs;
  const nextEligibleAt = due
    ? addMinutes(now, intervalMinutes)
    : new Date(previousRunMs + intervalMs).toISOString();

  let execution: ScheduledIterationExecutionSnapshot;

  if (due) {
    const automatedUpdate = runAutomatedUpdate({
      rootDir,
      taskId,
      dryRun,
      now,
      repoStateProvider: repoStateProvider as ((rootDir: string) => RepoStateSnapshot) | undefined,
    });

    execution = {
      status: "EXECUTED",
      reason: force ? "forced scheduler pass executed one bounded iteration" : "interval due; executed one bounded iteration",
      selectedTaskId: automatedUpdate.iteration.selectedTask?.id ?? null,
      automatedUpdateIterationId: automatedUpdate.iteration.iterationId,
      automatedUpdateLatestPath: automatedUpdate.latestPath,
      automatedUpdateReportPath: automatedUpdate.reportPath,
      repoSyncLatestPath: automatedUpdate.repoSync.latestPath,
      orchestrationLatestPath: automatedUpdate.orchestration.latestPath,
    };

    if (!dryRun) {
      writeJson(statePath, {
        lastRunAt: createdAt,
        lastIterationId: automatedUpdate.iteration.iterationId,
        lastTaskId: automatedUpdate.iteration.selectedTask?.id ?? null,
      } satisfies ScheduledIterationState);
    }
  } else {
    execution = {
      status: "SKIPPED_NOT_DUE",
      reason: `interval guard active until ${nextEligibleAt}`,
      selectedTaskId: null,
      automatedUpdateIterationId: null,
      automatedUpdateLatestPath: null,
      automatedUpdateReportPath: null,
      repoSyncLatestPath: null,
      orchestrationLatestPath: null,
    };
  }

  const snapshot = {
    scheduleId,
    createdAt,
    workflow: "n1_scheduled_iteration" as const,
    intervalMinutes,
    due,
    force,
    previousRunAt,
    nextEligibleAt,
    command,
    execution,
  };

  if (!dryRun) {
    writeJson(latestPath, snapshot);
    appendJsonLine(historyPath, snapshot);
    writeReport(reportPath, scheduleId, intervalMinutes, previousRunAt, nextEligibleAt, command, execution);
  }

  return {
    snapshot,
    latestPath,
    historyPath,
    statePath,
    reportPath,
  };
};
