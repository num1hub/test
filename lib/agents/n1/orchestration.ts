import fs from "node:fs";
import path from "node:path";

import YAML from "yaml";

import {
  CORE_INSTRUCTION_STACK,
  HOT_QUEUE_PATH,
  NINFINITY_WORKFLOW_PATH,
  ORCHESTRATION_HISTORY_PATH,
  ORCHESTRATION_LATEST_PATH,
  ORCHESTRATION_REPORTS_DIR,
  VAULT_STEWARD_LATEST_PATH,
  VAULT_STEWARD_RUNTIME_PATH,
  WORKFLOW_PATH,
} from "./constants";
import { readRepoState } from "./repo-state";
import { readLatestProjectSync, snapshotA2CRuntime, snapshotQueueFrontier } from "./repo-sync";
import { parseQueueTable } from "./task-packets";
import type {
  N1InputRoutingRule,
  N1OrchestrationResult,
  N1OrchestrationSnapshot,
  OrchestrationLaneSnapshot,
  QueueTask,
  RunN1OrchestrationOptions,
  VaultStewardRuntimeSnapshot,
  WorkflowContractSummary,
} from "./types";

function appendJsonl(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`, "utf8");
}

function readFrontmatter(file: string): Record<string, unknown> | null {
  if (!fs.existsSync(file)) return null;
  const content = fs.readFileSync(file, "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match?.[1]) return null;

  try {
    return YAML.parse(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function summarizeWorkflowContract(rootDir: string, relativePath: string): WorkflowContractSummary | null {
  const config = readFrontmatter(path.join(rootDir, relativePath));
  if (!config) return null;

  const tracker = (config.tracker ?? {}) as Record<string, unknown>;
  const workspace = (config.workspace ?? {}) as Record<string, unknown>;
  const agent = (config.agent ?? {}) as Record<string, unknown>;

  const nightStartHour = tracker.night_start_hour;
  const nightEndHour = tracker.night_end_hour;
  const hasNightWindow = typeof nightStartHour === "number" && typeof nightEndHour === "number";

  return {
    kind: typeof tracker.kind === "string" ? tracker.kind : "unknown",
    workspaceRoot: typeof workspace.root === "string" ? workspace.root : null,
    maxConcurrentAgents:
      typeof agent.max_concurrent_agents === "number" ? agent.max_concurrent_agents : null,
    mode: typeof tracker.mode === "string" ? tracker.mode : null,
    nightWindow: hasNightWindow ? `${nightStartHour}:00-${nightEndHour}:00` : null,
  };
}

function readVaultStewardRuntime(rootDir: string): VaultStewardRuntimeSnapshot {
  const runtimePath = path.join(rootDir, VAULT_STEWARD_RUNTIME_PATH);
  const latestPath = path.join(rootDir, VAULT_STEWARD_LATEST_PATH);

  let status: string | null = null;
  let latestRunId: string | null = null;
  let provider: string | null = null;
  let summary: string | null = null;

  if (fs.existsSync(runtimePath)) {
    try {
      const runtime = JSON.parse(fs.readFileSync(runtimePath, "utf8")) as {
        status?: string;
        latest_run_id?: string;
      };
      status = runtime.status ?? null;
      latestRunId = runtime.latest_run_id ?? null;
    } catch {
      status = null;
    }
  }

  if (fs.existsSync(latestPath)) {
    try {
      const latest = JSON.parse(fs.readFileSync(latestPath, "utf8")) as {
        provider?: string;
        overview?: string;
        run_id?: string;
      };
      provider = latest.provider ?? null;
      summary = latest.overview ?? null;
      latestRunId = latestRunId ?? latest.run_id ?? null;
    } catch {
      provider = null;
      summary = null;
    }
  }

  return {
    runtimePresent: fs.existsSync(runtimePath) || fs.existsSync(latestPath),
    status,
    latestRunId,
    provider,
    summary,
  };
}

function buildLanes(
  queue: QueueTask[],
  a2cIndexPresent: boolean,
  symphony: WorkflowContractSummary | null,
  ninfinity: WorkflowContractSummary | null,
  vaultSteward: VaultStewardRuntimeSnapshot,
): OrchestrationLaneSnapshot[] {
  const readyCount = queue.filter((task) => task.status === "READY" || task.status === "ACTIVE").length;

  return [
    {
      laneId: "n1_personal_assistant",
      label: "N1 Personal AI Assistant",
      status: "ready",
      reason: "Main carrier lane for operator synthesis, planning, and bounded routing.",
      surfaces: ["README.md", "AGENTS.md", "CODEX.md", "SOUL.md", "CONTEXT.md", "MEMORY.md"],
      nextAction: "Use this lane when the operator is still shaping intent or needs deep synthesis before execution.",
    },
    {
      laneId: "todo_executor",
      label: "TO-DO Executor",
      status: queue.length > 0 ? "ready" : "blocked",
      reason: queue.length > 0 ? "Hot queue contains actionable bounded tasks." : "Hot queue has no actionable items.",
      surfaces: ["TO-DO/HOT_QUEUE.md", "TO-DO/tasks/*"],
      nextAction: queue[0]
        ? `Pull ${queue[0].id} or the operator-selected bounded task and execute it with verification.`
        : "Refresh or mint the queue before trying direct execution.",
    },
    {
      laneId: "swarm_conductor",
      label: "Swarm Conductor",
      status: readyCount >= 3 ? "ready" : "degraded",
      reason:
        readyCount >= 3
          ? "Multiple bounded tasks exist, so decomposition and parallel lane coordination are justified."
          : "Keep this lane available, but current queue pressure does not yet force a swarm by default.",
      surfaces: ["TO-DO/AGENT_OPERATING_MODES.md", "skills/swarm-orchestrator/SKILL.md"],
      nextAction: "Use only when one bounded initiative needs disjoint lanes with clear merge contracts.",
    },
    {
      laneId: "symphony_issue_worker",
      label: "Symphony Issue Worker",
      status: symphony ? "ready" : "blocked",
      reason: symphony
        ? `Linear-backed issue lane is configured with tracker kind ${symphony.kind}.`
        : "Symphony workflow contract is unavailable.",
      surfaces: ["WORKFLOW.md", "lib/symphony/*", "scripts/symphony.ts"],
      nextAction: symphony
        ? "Use this lane for issue-driven isolated workspaces and repository-bound execution."
        : "Restore or define the Symphony workflow contract before depending on this lane.",
    },
    {
      laneId: "ninfinity_night_shift",
      label: "N-Infinity Night Shift",
      status: ninfinity ? "ready" : "blocked",
      reason: ninfinity
        ? `Night-shift graph lane is configured with tracker kind ${ninfinity.kind}.`
        : "N-Infinity workflow contract is unavailable.",
      surfaces: ["NINFINITY_WORKFLOW.md", "scripts/ninfinity.ts", "data/capsules/*"],
      nextAction: ninfinity
        ? "Use this lane for bounded graph and capsule maintenance rather than ordinary feature execution."
        : "Restore or define the N-Infinity workflow contract before relying on night-shift routing.",
    },
    {
      laneId: "vault_steward",
      label: "Vault Steward",
      status: vaultSteward.runtimePresent ? "ready" : "degraded",
      reason: vaultSteward.runtimePresent
        ? `Vault Steward runtime is present${vaultSteward.status ? ` and reports status ${vaultSteward.status}` : ""}.`
        : "Vault Steward artifacts are missing, so orchestration can only treat it as a latent lane.",
      surfaces: ["lib/agents/vaultSteward.ts", "lib/agents/vaultSteward/*", "data/private/agents/vault-steward.*"],
      nextAction: vaultSteward.runtimePresent
        ? "Use this lane for Dream-side maintenance and maintenance-queue generation."
        : "Bring up or refresh Vault Steward before routing autonomous vault work here.",
    },
    {
      laneId: "a2c_runtime",
      label: "A2C Runtime",
      status: a2cIndexPresent ? "ready" : "degraded",
      reason: a2cIndexPresent
        ? "A2C index and owned runtime surfaces are present for intake, indexing, and investigation."
        : "A2C runtime surfaces exist, but the live index is not present or not readable.",
      surfaces: ["docs/a2c.md", "lib/a2c/*", "scripts/a2c/*", "data/private/a2c/*"],
      nextAction: "Use this lane for Anything-to-Capsules intake, indexing, investigation, and future packet generation.",
    },
  ];
}

function toOrchestrationMarkdown(snapshot: N1OrchestrationSnapshot): string {
  return [
    "# N1 Orchestration Snapshot",
    "",
    `- Orchestration: \`${snapshot.orchestrationId}\``,
    `- Created At: \`${snapshot.createdAt}\``,
    `- Primary Lane: \`${snapshot.conductorDecision.primaryLane}\``,
    "",
    "## Queue Frontier",
    "",
    ...snapshot.queueFrontier.map(
      (item) =>
        `- \`${item.id}\` · \`${item.priority}\` · \`${item.executionBand}\` · \`${item.status}\` · ${item.goal}`,
    ),
    "",
    "## Runtime Signals",
    "",
    `- A2C Index Present: \`${snapshot.runtimeSignals.a2c.indexPresent ? "yes" : "no"}\``,
    `- A2C Nodes: \`${snapshot.runtimeSignals.a2c.nodeCount}\``,
    `- A2C Edges: \`${snapshot.runtimeSignals.a2c.edgeCount}\``,
    `- Vault Steward Runtime Present: \`${snapshot.runtimeSignals.vaultSteward.runtimePresent ? "yes" : "no"}\``,
    `- Vault Steward Status: \`${snapshot.runtimeSignals.vaultSteward.status ?? "unknown"}\``,
    "",
    "## Lanes",
    "",
    ...snapshot.lanes.map(
      (lane) => `- \`${lane.laneId}\` · \`${lane.status}\` · ${lane.reason} · next: ${lane.nextAction}`,
    ),
    "",
    "## Conductor Decision",
    "",
    `- Primary Lane: \`${snapshot.conductorDecision.primaryLane}\``,
    `- Secondary Lanes: ${snapshot.conductorDecision.secondaryLanes.length > 0 ? snapshot.conductorDecision.secondaryLanes.map((lane) => `\`${lane}\``).join(", ") : "none"}`,
    "",
    ...snapshot.conductorDecision.rationale.map((item) => `- ${item}`),
    "",
    "## Input Routing Model",
    "",
    `- Decision Rule: ${snapshot.routingModel.decisionRule}`,
    "",
    ...snapshot.routingModel.routes.map(
      (route) =>
        `- \`${route.routeId}\` · ${route.operatorShape} · primary mode: \`${route.primaryMode}\` · default skill: \`${route.defaultSkill}\` · handoff: \`${route.handoffTarget}\` · outcome: ${route.outcome}`,
    ),
    "",
    "### Defer Conditions",
    "",
    ...snapshot.routingModel.deferConditions.map((item) => `- ${item}`),
    "",
    "## Neural Orchestra Packet",
    "",
    "### Baton Order",
    "",
    ...snapshot.neuralOrchestraPacket.batonOrder.map((item) => `- ${item}`),
    "",
    "### Next Command Pack",
    "",
    ...snapshot.neuralOrchestraPacket.nextCommandPack.map((item) => `- \`${item}\``),
    "",
    "### Notes",
    "",
    ...snapshot.neuralOrchestraPacket.notes.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

function buildRoutingModel(): {
  decisionRule: string;
  routes: N1InputRoutingRule[];
  deferConditions: string[];
} {
  return {
    decisionRule:
      "Classify the operator request before execution starts. Prefer the smallest bounded lane, and let explicit user override beat heuristic routing.",
    routes: [
      {
        routeId: "assistant_synthesis",
        operatorShape: "broad thinking, explanation, architecture, comparison, or deep work on N1",
        primaryMode: "Personal AI Assistant",
        defaultSkill: "skills/personal-ai-assistant/SKILL.md",
        handoffTarget: "n1_personal_assistant",
        outcome:
          "Synthesize the smallest valuable next move and mint durable structure only when the result becomes bounded.",
      },
      {
        routeId: "queue_execution",
        operatorShape: "continue, /autoupdate, explicit TODO execution, or direct do-the-work requests",
        primaryMode: "TO-DO Executor",
        defaultSkill: "skills/todo-executor/SKILL.md",
        handoffTarget: "todo_executor",
        outcome: "Read the hot queue and task packet, then perform one bounded verified pass.",
      },
      {
        routeId: "orchestrate_or_sync",
        operatorShape: "sync N1Hub, refresh N1, choose the correct lane, or update multiple N1 surfaces coherently",
        primaryMode: "N1 Chief Orchestrator",
        defaultSkill: "skills/n1/SKILL.md",
        handoffTarget: "n1_chief_orchestrator",
        outcome:
          "Inspect repo-sync and orchestration truth, choose the baton lane, and return the next bounded command pack.",
      },
      {
        routeId: "capsule_projection",
        operatorShape: "turn this into capsules, preserve durable knowledge, or move intent out of chat residue",
        primaryMode: "Personal AI Assistant",
        defaultSkill: "skills/personal-ai-assistant/SKILL.md",
        handoffTarget: "capsule_planning_agent",
        outcome: "Produce capsule-planning or A2C-oriented structure without bypassing validator or queue law.",
      },
      {
        routeId: "swarm_split",
        operatorShape: "explicit swarm request or one bounded initiative that truly needs multiple lanes",
        primaryMode: "Swarm Conductor",
        defaultSkill: "skills/swarm-orchestrator/SKILL.md",
        handoffTarget: "swarm_conductor",
        outcome: "Emit disjoint lane packets with verification and merge contracts.",
      },
      {
        routeId: "defer_for_clarity",
        operatorShape: "ambiguous, conflicting, or high-risk requests with no stable mutation boundary",
        primaryMode: "Personal AI Assistant",
        defaultSkill: "skills/personal-ai-assistant/SKILL.md",
        handoffTarget: "n1_personal_assistant",
        outcome:
          "Ask one precise clarifying question or report the blocker instead of mutating queue or runtime truth blindly.",
      },
    ],
    deferConditions: [
      "The operator request is ambiguous enough that queue mutation would be speculative.",
      "Two lanes seem plausible, but the difference would change owned state or blast radius materially.",
      "The request appears to span intake normalization, packet generation, and execution in one jump.",
    ],
  };
}

function buildN1Orchestration(
  rootDir: string,
  queue: QueueTask[],
  repoState: ReturnType<typeof readRepoState>,
  now: Date,
): N1OrchestrationSnapshot {
  const createdAt = now.toISOString();
  const orchestrationId = `n1-orch-${createdAt.replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z")}`;
  const repoSync = readLatestProjectSync(rootDir);
  const symphony = summarizeWorkflowContract(rootDir, WORKFLOW_PATH);
  const ninfinity = summarizeWorkflowContract(rootDir, NINFINITY_WORKFLOW_PATH);
  const a2c = snapshotA2CRuntime(rootDir);
  const vaultSteward = readVaultStewardRuntime(rootDir);
  const queueFrontier = snapshotQueueFrontier(queue);
  const lanes = buildLanes(queue, a2c.indexPresent, symphony, ninfinity, vaultSteward);

  const primaryLane = queueFrontier.length > 0 ? "todo_executor" : "n1_personal_assistant";
  const secondaryLanes = lanes
    .filter((lane) => lane.status === "ready" && lane.laneId !== primaryLane)
    .map((lane) => lane.laneId)
    .filter((laneId) => laneId !== "n1_personal_assistant")
    .slice(0, 4);

  const rationale = [
    queueFrontier[0]
      ? `Hot queue is non-empty, so ${primaryLane} remains the main execution baton.`
      : "No hot task is ready, so N1 should stay in assistant-orchestrator posture.",
    repoSync
      ? `Latest repo sync ${repoSync.syncId} exists and should be used as a cold-start context bridge.`
      : "No repo sync artifact exists yet, so orchestration should rely on live repo truth directly.",
    symphony
      ? `Symphony issue worker is available with tracker kind ${symphony.kind}.`
      : "Symphony is not available as a ready execution lane.",
    ninfinity
      ? `N-Infinity is available as a graph-maintenance lane${ninfinity.nightWindow ? ` during ${ninfinity.nightWindow}` : ""}.`
      : "N-Infinity is not available as a ready execution lane.",
  ];
  const routingModel = buildRoutingModel();

  return {
    orchestrationId,
    createdAt,
    workflow: "n1_orchestration",
    repoState,
    queueFrontier,
    repoSyncId: repoSync?.syncId ?? null,
    runtimeSignals: {
      a2c,
      vaultSteward,
    },
    workflows: {
      symphony,
      ninfinity,
    },
    lanes,
    conductorDecision: {
      primaryLane,
      secondaryLanes,
      rationale,
    },
    routingModel,
    neuralOrchestraPacket: {
      loadOrder: [...CORE_INSTRUCTION_STACK, "data/private/agents/n1/repo-sync.latest.json", "data/private/agents/n1/orchestration.latest.json"],
      batonOrder: [
        "N1 Personal AI Assistant",
        "TO-DO Executor",
        "Swarm Conductor",
        "Symphony Issue Worker",
        "N-Infinity Night Shift",
        "Vault Steward",
        "A2C Runtime",
      ],
      nextCommandPack: [
        "./autoupdate sync",
        "./autoupdate",
        "./autoupdate orchestrate",
        "npm run symphony -- ./WORKFLOW.md",
        "npm run ninfinity",
      ],
      notes: [
        "N1 is the chief orchestrator and should route work by bounded lanes rather than by vague autonomy.",
        "Classify the operator request before picking a lane; ambiguous requests should defer instead of mutating queue truth blindly.",
        "Live repo truth outranks orchestration artifacts.",
        repoState.dirty
          ? "Repository is dirty, so orchestration should favor planning, routing, and verification over auto-commit posture."
          : "Repository is clean enough for bounded routed execution after verification.",
      ],
    },
  };
}

export function runN1Orchestration(options: RunN1OrchestrationOptions): N1OrchestrationResult {
  const rootDir = options.rootDir;
  const queue = parseQueueTable(fs.readFileSync(path.join(rootDir, HOT_QUEUE_PATH), "utf8"));
  const now = options.now ?? new Date();
  const repoState = (options.repoStateProvider ?? readRepoState)(rootDir);
  const snapshot = buildN1Orchestration(rootDir, queue, repoState, now);

  const latestPath = path.join(rootDir, ORCHESTRATION_LATEST_PATH);
  const historyPath = path.join(rootDir, ORCHESTRATION_HISTORY_PATH);
  const reportPath = path.join(rootDir, ORCHESTRATION_REPORTS_DIR, `${snapshot.orchestrationId}.md`);

  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(latestPath), { recursive: true });
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(latestPath, JSON.stringify(snapshot, null, 2), "utf8");
    appendJsonl(historyPath, snapshot);
    fs.writeFileSync(reportPath, toOrchestrationMarkdown(snapshot), "utf8");
  }

  return {
    snapshot,
    latestPath,
    historyPath,
    reportPath,
  };
}
