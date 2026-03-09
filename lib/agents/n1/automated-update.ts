import fs from "node:fs";
import path from "node:path";

import { AUTOMATED_UPDATE_REPORTS_DIR, CORE_INSTRUCTION_STACK, HOT_QUEUE_PATH, TEAMWORK_HISTORY_PATH, TEAMWORK_LATEST_PATH } from "./constants";
import { runN1Orchestration } from "./orchestration";
import { readRepoState } from "./repo-state";
import { runProjectSync } from "./repo-sync";
import { scaffoldSkill } from "./skill-scaffold";
import { parseQueueTable, parseTaskPacket, readTaskPacket } from "./task-packets";
import type {
  AutomatedUpdateIteration,
  AutomatedUpdateResult,
  QueueTask,
  RepoStateSnapshot,
  RunAutomatedUpdateOptions,
  TaskPacket,
} from "./types";

function appendJsonl(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`, "utf8");
}

function toReportMarkdown(iteration: AutomatedUpdateIteration): string {
  const selectedTask = iteration.selectedTask;
  const taskLabel = selectedTask
    ? `${selectedTask.id} · ${selectedTask.title}`
    : "No queued task selected";

  return [
    "# N1 Automated Update Iteration",
    "",
    `- Iteration: \`${iteration.iterationId}\``,
    `- Created At: \`${iteration.createdAt}\``,
    `- Mode: \`${iteration.mode}\``,
    `- Selected Task: ${taskLabel}`,
    `- Next Action: ${iteration.nextAction}`,
    "",
    "## Repo State",
    "",
    `- Branch: \`${iteration.repoState.branch ?? "unknown"}\``,
    `- Dirty: \`${iteration.repoState.dirty ? "yes" : "no"}\``,
    `- Modified Count: \`${iteration.repoState.modifiedCount}\``,
    `- Untracked Count: \`${iteration.repoState.untrackedCount}\``,
    "",
    "## Instruction Stack",
    "",
    ...iteration.launchPacket.instructionStack.map((item) => `- \`${item}\``),
    "",
    "## Implementation Plan",
    "",
    ...(iteration.launchPacket.implementationPlan.length > 0
      ? iteration.launchPacket.implementationPlan.map((item, index) => `${index + 1}. ${item}`)
      : ["1. Read the selected task packet and confirm the boundary."]),
    "",
    "## Dependencies",
    "",
    ...(iteration.launchPacket.dependencies.length > 0
      ? iteration.launchPacket.dependencies.map((item) => `- ${item}`)
      : ["- none recorded"]),
    "",
    "## Source Signals",
    "",
    ...(iteration.launchPacket.sourceSignals.length > 0
      ? iteration.launchPacket.sourceSignals.map((item) => `- ${item}`)
      : ["- none recorded"]),
    "",
    "## Entry Checklist",
    "",
    ...(iteration.launchPacket.entryChecklist.length > 0
      ? iteration.launchPacket.entryChecklist.map((item) => `- ${item}`)
      : ["- confirm the packet still matches live repo truth"]),
    "",
    "## Operator Command Pack",
    "",
    ...iteration.launchPacket.operatorCommandPack.map((item) => `- \`${item}\``),
    "",
    "## Acceptance Criteria",
    "",
    ...(iteration.launchPacket.acceptanceCriteria.length > 0
      ? iteration.launchPacket.acceptanceCriteria.map((item) => `- ${item}`)
      : ["- no acceptance criteria recorded"]),
    "",
    "## Verification",
    "",
    ...iteration.launchPacket.verification.map((item) => `- \`${item}\``),
    "",
    "## Evidence and Artifacts",
    "",
    ...(iteration.launchPacket.evidenceArtifacts.length > 0
      ? iteration.launchPacket.evidenceArtifacts.map((item) => `- ${item}`)
      : ["- none recorded"]),
    "",
    "## Stop Conditions",
    "",
    ...iteration.launchPacket.stopConditions.map((item) => `- ${item}`),
    "",
    "## Queue Update Rule",
    "",
    ...(iteration.launchPacket.queueUpdateRule.length > 0
      ? iteration.launchPacket.queueUpdateRule.map((item) => `- ${item}`)
      : ["- update queue state honestly if the pass changes status"]),
    "",
  ].join("\n");
}

function buildIteration(
  rootDir: string,
  queue: QueueTask[],
  taskPacket: TaskPacket | null,
  now: Date,
  repoState: RepoStateSnapshot,
): AutomatedUpdateIteration {
  const createdAt = now.toISOString();
  const iterationId = `n1-iter-${createdAt.replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z")}`;
  const selectedTask = taskPacket
    ? {
        id: taskPacket.id,
        title: taskPacket.title,
        file: path.relative(rootDir, taskPacket.file).replace(/\\/g, "/"),
        priority: taskPacket.priority,
        executionBand: taskPacket.executionBand,
        ownerLane: taskPacket.ownerLane,
        status: taskPacket.status,
        goal: taskPacket.goal,
      }
    : null;

  const mode = taskPacket?.primaryMode ?? "Personal AI Assistant";
  const instructionStack = [
    ...CORE_INSTRUCTION_STACK,
    ...(taskPacket ? [path.relative(rootDir, taskPacket.file).replace(/\\/g, "/")] : []),
  ];
  const nextAction =
    taskPacket?.operatorCommandPack[0] ??
    "Read the hot queue, choose the top READY task, and prepare the smallest verified step.";

  const reportPath = path.join(AUTOMATED_UPDATE_REPORTS_DIR, `${iterationId}.md`);

  return {
    iterationId,
    createdAt,
    workflow: "n1_automated_update",
    mode,
    selectedTask,
    launchPacket: {
      instructionStack,
      dependencies: taskPacket?.dependencies ?? [],
      sourceSignals: taskPacket?.sourceSignals ?? [],
      entryChecklist:
        taskPacket?.entryChecklist.length
          ? taskPacket.entryChecklist
          : ["Confirm the queue packet still matches the live repository boundary."],
      implementationPlan:
        taskPacket?.implementationPlan.length
          ? taskPacket.implementationPlan
          : [
              "Read the hot queue and choose the first READY task.",
              "Inspect the exact files and boundaries named in that task packet.",
              "Complete one bounded verified step before widening scope.",
            ],
      operatorCommandPack:
        taskPacket?.operatorCommandPack.length
          ? taskPacket.operatorCommandPack
          : [
              "Read the hot queue and prepare the next bounded task packet.",
              "Use Personal AI Assistant mode first if the queue no longer reflects repo truth.",
            ],
      acceptanceCriteria: taskPacket?.acceptanceCriteria ?? [],
      verification: taskPacket?.verification ?? [],
      evidenceArtifacts: taskPacket?.evidenceArtifacts ?? [],
      stopConditions: taskPacket?.stopConditions ?? [],
      queueUpdateRule: taskPacket?.queueUpdateRule ?? [],
      systemPromptSlice: taskPacket?.systemPromptSlice,
      optionalSkill: taskPacket?.optionalSkill,
    },
    microUpdate: {
      kind: taskPacket ? "launch_packet_refresh" : "queue_heartbeat",
      summary: taskPacket
        ? `Prepared a launch packet for ${taskPacket.id} from the hot queue.`
        : "No queued task packet was found, so the workflow emitted a queue heartbeat.",
      teamworkLatestPath: TEAMWORK_LATEST_PATH,
      teamworkHistoryPath: TEAMWORK_HISTORY_PATH,
      reportPath,
    },
    repoState,
    nextAction,
    notes: [
      `Queue rows inspected: ${queue.length}`,
      repoState.dirty
        ? "Repository is already dirty, so this workflow should not auto-commit on its own."
        : "Repository is clean enough for a later verified micro-commit if a real code step succeeds.",
    ],
  };
}

export function runAutomatedUpdate(options: RunAutomatedUpdateOptions): AutomatedUpdateResult {
  const rootDir = options.rootDir;
  const hotQueuePath = path.join(rootDir, HOT_QUEUE_PATH);
  const queue = parseQueueTable(fs.readFileSync(hotQueuePath, "utf8"));

  const selectedQueueItem =
    (options.taskId ? queue.find((task) => task.id === options.taskId) : null) ??
    queue.find((task) => task.status === "READY" || task.status === "ACTIVE") ??
    null;
  const taskPacket = selectedQueueItem ? readTaskPacket(rootDir, selectedQueueItem.id) : null;
  const now = options.now ?? new Date();
  const repoState = (options.repoStateProvider ?? readRepoState)(rootDir);
  const iteration = buildIteration(rootDir, queue, taskPacket, now, repoState);

  const latestPath = path.join(rootDir, TEAMWORK_LATEST_PATH);
  const historyPath = path.join(rootDir, TEAMWORK_HISTORY_PATH);
  const reportPath = path.join(rootDir, iteration.microUpdate.reportPath);

  const projectSync = runProjectSync({
    rootDir,
    dryRun: options.dryRun,
    now,
    repoStateProvider: () => repoState,
  });
  const orchestration = runN1Orchestration({
    rootDir,
    dryRun: options.dryRun,
    now,
    repoStateProvider: () => repoState,
  });

  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(latestPath), { recursive: true });
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(latestPath, JSON.stringify(iteration, null, 2), "utf8");
    appendJsonl(historyPath, iteration);
    fs.writeFileSync(reportPath, toReportMarkdown(iteration), "utf8");
  }

  return {
    iteration,
    latestPath,
    historyPath,
    reportPath,
    repoSync: {
      latestPath: projectSync.latestPath,
      historyPath: projectSync.historyPath,
      reportPath: projectSync.reportPath,
    },
    orchestration: {
      latestPath: orchestration.latestPath,
      historyPath: orchestration.historyPath,
      reportPath: orchestration.reportPath,
    },
  };
}

export { parseTaskPacket } from "./task-packets";
export { readRepoState } from "./repo-state";
export { runProjectSync } from "./repo-sync";
export { scaffoldSkill } from "./skill-scaffold";
export { runN1Orchestration } from "./orchestration";
