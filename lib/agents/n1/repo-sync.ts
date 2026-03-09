import fs from "node:fs";
import path from "node:path";

import {
  A2C_DROPZONE_DIR,
  A2C_INDEX_PATH,
  A2C_PIPELINE_DIR,
  A2C_REPORTS_DIR,
  A2C_TASKS_DIR,
  CAPSULES_DIR,
  CORE_INSTRUCTION_STACK,
  HOT_QUEUE_PATH,
  REPO_SYNC_HISTORY_PATH,
  REPO_SYNC_LATEST_PATH,
  REPO_SYNC_REPORTS_DIR,
  TEAMWORK_LATEST_PATH,
} from "./constants";
import type {
  A2CRuntimeSnapshot,
  CapsuleVaultSnapshot,
  InstructionSurfaceSnapshot,
  ProjectSyncResult,
  ProjectSyncSnapshot,
  QueueFrontierSnapshot,
  QueueTask,
  RunProjectSyncOptions,
  TeamworkStateSnapshot,
} from "./types";
import { readRepoState } from "./repo-state";
import { parseQueueTable } from "./task-packets";

function appendJsonl(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`, "utf8");
}

function countLines(file: string): number {
  if (!fs.existsSync(file)) return 0;
  return fs.readFileSync(file, "utf8").split(/\r?\n/).length;
}

export function snapshotInstructionSurfaces(rootDir: string): InstructionSurfaceSnapshot[] {
  return CORE_INSTRUCTION_STACK.map((relativePath) => {
    const fullPath = path.join(rootDir, relativePath);
    return {
      path: relativePath,
      exists: fs.existsSync(fullPath),
      lineCount: countLines(fullPath),
    };
  });
}

export function snapshotQueueFrontier(queue: QueueTask[]): QueueFrontierSnapshot[] {
  return queue.slice(0, 8).map((task) => ({
    id: task.id,
    priority: task.priority,
    executionBand: task.executionBand,
    ownerLane: task.ownerLane,
    status: task.status,
    goal: task.goal,
  }));
}

export function snapshotCapsuleVault(rootDir: string): CapsuleVaultSnapshot {
  const capsulesDir = path.join(rootDir, CAPSULES_DIR);
  if (!fs.existsSync(capsulesDir)) {
    return {
      total: 0,
      realCount: 0,
      dreamCount: 0,
    };
  }

  const files = fs
    .readdirSync(capsulesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);

  const dreamCount = files.filter((name) => name.includes("@dream")).length;

  return {
    total: files.length,
    realCount: files.length - dreamCount,
    dreamCount,
  };
}

function countFiles(directory: string): number {
  if (!fs.existsSync(directory)) return 0;
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile()).length;
}

export function snapshotA2CRuntime(rootDir: string): A2CRuntimeSnapshot {
  const indexPath = path.join(rootDir, A2C_INDEX_PATH);
  const tasksDir = path.join(rootDir, A2C_TASKS_DIR);
  const pipelineDir = path.join(rootDir, A2C_PIPELINE_DIR);
  const dropzoneDir = path.join(rootDir, A2C_DROPZONE_DIR);
  const reportsDir = path.join(rootDir, A2C_REPORTS_DIR);

  let nodeCount = 0;
  let edgeCount = 0;
  let generatedAt: string | null = null;

  if (fs.existsSync(indexPath)) {
    try {
      const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
        graph?: { nodes?: unknown[]; edges?: unknown[]; generated_at?: string };
      };
      nodeCount = Array.isArray(index.graph?.nodes) ? index.graph.nodes.length : 0;
      edgeCount = Array.isArray(index.graph?.edges) ? index.graph.edges.length : 0;
      generatedAt = index.graph?.generated_at ?? null;
    } catch {
      nodeCount = 0;
      edgeCount = 0;
      generatedAt = null;
    }
  }

  return {
    indexPresent: fs.existsSync(indexPath),
    nodeCount,
    edgeCount,
    generatedAt,
    tasksCount: countFiles(tasksDir),
    reportCount: fs.existsSync(reportsDir) ? fs.readdirSync(reportsDir).length : 0,
    pipelinePresent: fs.existsSync(pipelineDir),
    intakeDropzonePresent: fs.existsSync(dropzoneDir),
  };
}

export function snapshotTeamworkState(rootDir: string): TeamworkStateSnapshot {
  const teamworkPath = path.join(rootDir, TEAMWORK_LATEST_PATH);
  if (!fs.existsSync(teamworkPath)) {
    return {
      latestPresent: false,
      latestIterationId: null,
      latestTaskId: null,
    };
  }

  try {
    const teamwork = JSON.parse(fs.readFileSync(teamworkPath, "utf8")) as {
      iterationId?: string;
      selectedTask?: { id?: string };
    };

    return {
      latestPresent: true,
      latestIterationId: teamwork.iterationId ?? null,
      latestTaskId: teamwork.selectedTask?.id ?? null,
    };
  } catch {
    return {
      latestPresent: true,
      latestIterationId: null,
      latestTaskId: null,
    };
  }
}

function toProjectSyncMarkdown(snapshot: ProjectSyncSnapshot): string {
  return [
    "# N1 Repo Sync",
    "",
    `- Sync: \`${snapshot.syncId}\``,
    `- Created At: \`${snapshot.createdAt}\``,
    `- Next Suggested Action: ${snapshot.neuralPacket.nextSuggestedAction}`,
    "",
    "## Repo State",
    "",
    `- Branch: \`${snapshot.repoState.branch ?? "unknown"}\``,
    `- Dirty: \`${snapshot.repoState.dirty ? "yes" : "no"}\``,
    `- Modified Count: \`${snapshot.repoState.modifiedCount}\``,
    `- Untracked Count: \`${snapshot.repoState.untrackedCount}\``,
    "",
    "## Instruction Surfaces",
    "",
    ...snapshot.instructionSurfaces.map(
      (surface) =>
        `- \`${surface.path}\` · exists=\`${surface.exists ? "yes" : "no"}\` · lines=\`${surface.lineCount}\``,
    ),
    "",
    "## Queue Frontier",
    "",
    ...snapshot.queueFrontier.map(
      (item) =>
        `- \`${item.id}\` · \`${item.priority}\` · \`${item.executionBand}\` · \`${item.status}\` · ${item.goal}`,
    ),
    "",
    "## Capsule Vault",
    "",
    `- Total Capsules: \`${snapshot.capsuleVault.total}\``,
    `- Real Capsules: \`${snapshot.capsuleVault.realCount}\``,
    `- Dream Capsules: \`${snapshot.capsuleVault.dreamCount}\``,
    "",
    "## A2C Runtime",
    "",
    `- Index Present: \`${snapshot.a2c.indexPresent ? "yes" : "no"}\``,
    `- Node Count: \`${snapshot.a2c.nodeCount}\``,
    `- Edge Count: \`${snapshot.a2c.edgeCount}\``,
    `- Generated At: \`${snapshot.a2c.generatedAt ?? "unknown"}\``,
    `- Tasks Count: \`${snapshot.a2c.tasksCount}\``,
    `- Report Count: \`${snapshot.a2c.reportCount}\``,
    `- Pipeline Present: \`${snapshot.a2c.pipelinePresent ? "yes" : "no"}\``,
    `- Intake Dropzone Present: \`${snapshot.a2c.intakeDropzonePresent ? "yes" : "no"}\``,
    "",
    "## Teamwork",
    "",
    `- Latest Present: \`${snapshot.teamwork.latestPresent ? "yes" : "no"}\``,
    `- Latest Iteration: \`${snapshot.teamwork.latestIterationId ?? "none"}\``,
    `- Latest Task: \`${snapshot.teamwork.latestTaskId ?? "none"}\``,
    "",
    "## Neural Packet",
    "",
    "### Load Order",
    "",
    ...snapshot.neuralPacket.loadOrder.map((item) => `- \`${item}\``),
    "",
    "### Active Frontier",
    "",
    ...snapshot.neuralPacket.activeFrontier.map((item) => `- ${item}`),
    "",
    "### Notes",
    "",
    ...snapshot.neuralPacket.notes.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

function buildProjectSync(
  rootDir: string,
  queue: QueueTask[],
  repoState: ReturnType<typeof readRepoState>,
  now: Date,
): ProjectSyncSnapshot {
  const createdAt = now.toISOString();
  const syncId = `n1-sync-${createdAt.replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z")}`;
  const queueFrontier = snapshotQueueFrontier(queue);
  const teamwork = snapshotTeamworkState(rootDir);

  return {
    syncId,
    createdAt,
    workflow: "n1_repo_sync",
    repoState,
    instructionSurfaces: snapshotInstructionSurfaces(rootDir),
    queueFrontier,
    capsuleVault: snapshotCapsuleVault(rootDir),
    a2c: snapshotA2CRuntime(rootDir),
    teamwork,
    neuralPacket: {
      loadOrder: [...CORE_INSTRUCTION_STACK],
      activeFrontier: queueFrontier.slice(0, 5).map((task) => `${task.id} · ${task.goal}`),
      nextSuggestedAction:
        teamwork.latestTaskId && queueFrontier.some((task) => task.id === teamwork.latestTaskId)
          ? `Resume ${teamwork.latestTaskId} using the freshest teamwork and queue packet.`
          : queueFrontier[0]
            ? `Start from ${queueFrontier[0].id} or reroute if the operator overrides priority.`
            : "Queue is empty or unreadable; inspect TO-DO surfaces before taking action.",
      notes: [
        "This snapshot is for N1 cold-start synchronization, not for replacing live repo truth.",
        repoState.dirty
          ? "Repository is dirty; treat this sync as context refresh rather than commit permission."
          : "Repository is clean enough for bounded execution after normal verification.",
        "A2C runtime and capsule vault counts are included to keep planning grounded in live repository state.",
      ],
    },
  };
}

export function readLatestProjectSync(rootDir: string): ProjectSyncSnapshot | null {
  const latestPath = path.join(rootDir, REPO_SYNC_LATEST_PATH);
  if (!fs.existsSync(latestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(latestPath, "utf8")) as ProjectSyncSnapshot;
  } catch {
    return null;
  }
}

export function runProjectSync(options: RunProjectSyncOptions): ProjectSyncResult {
  const rootDir = options.rootDir;
  const hotQueuePath = path.join(rootDir, HOT_QUEUE_PATH);
  const queue = parseQueueTable(fs.readFileSync(hotQueuePath, "utf8"));
  const now = options.now ?? new Date();
  const repoState = (options.repoStateProvider ?? readRepoState)(rootDir);
  const snapshot = buildProjectSync(rootDir, queue, repoState, now);

  const latestPath = path.join(rootDir, REPO_SYNC_LATEST_PATH);
  const historyPath = path.join(rootDir, REPO_SYNC_HISTORY_PATH);
  const reportPath = path.join(rootDir, REPO_SYNC_REPORTS_DIR, `${snapshot.syncId}.md`);

  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(latestPath), { recursive: true });
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(latestPath, JSON.stringify(snapshot, null, 2), "utf8");
    appendJsonl(historyPath, snapshot);
    fs.writeFileSync(reportPath, toProjectSyncMarkdown(snapshot), "utf8");
  }

  return {
    snapshot,
    latestPath,
    historyPath,
    reportPath,
  };
}
