import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  parseTaskPacket,
  readRepoState,
  runAutomatedUpdate,
  runN1Orchestration,
  runProjectSync,
  scaffoldSkill,
} from "@/lib/agents/n1/automated-update";

const tempRoots: string[] = [];

function makeTempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "n1-automated-update-"));
  tempRoots.push(root);
  return root;
}

function writeFile(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

describe("N1 automated update workflow", () => {
  it("parses a task packet into a launchable structure", () => {
    const packet = parseTaskPacket(
      "/tmp/TODO-999-sample.md",
      `# TODO-999 Sample Task

- Priority: \`P0\`
- Execution Band: \`NOW\`
- Status: \`READY\`
- Owner Lane: \`Agent Lane\`
- Cluster: \`Example\`

## Goal

Prepare one bounded step.

## Dependencies

- \`hard: TODO-001\`

## Source Signals

- \`reports/example.md\`

## Scope

- \`lib/example.ts\`

## Entry Checklist

- confirm the boundary

## Implementation Plan

1. Read the code.
2. Apply one bounded edit.

## Mode and Skill

- Primary mode: \`TO-DO Executor\`
- Optional skill: \`skills/example/SKILL.md\`

## System Prompt Slice

\`\`\`text
Do one bounded thing.
\`\`\`

## Operator Command Pack

- \`Execute TODO-999.\`

## Verification

- \`npm test -- --run\`

## Stop Conditions

- unexpected scope expansion
`,
    );

    expect(packet.id).toBe("TODO-999");
    expect(packet.primaryMode).toBe("TO-DO Executor");
    expect(packet.optionalSkill).toBe("skills/example/SKILL.md");
    expect(packet.systemPromptSlice).toBe("Do one bounded thing.");
    expect(packet.dependencies).toEqual(["hard: TODO-001"]);
    expect(packet.sourceSignals).toEqual(["reports/example.md"]);
    expect(packet.entryChecklist).toEqual(["confirm the boundary"]);
    expect(packet.implementationPlan).toEqual(["Read the code.", "Apply one bounded edit."]);
  });

  it("writes teamwork artifacts for the hottest ready task", () => {
    const root = makeTempRoot();
    writeFile(
      root,
      "TO-DO/HOT_QUEUE.md",
      `# Queue

| ID | Priority | Execution Band | Owner Lane | Status | Goal | Surface |
| --- | --- | --- | --- | --- | --- | --- |
| \`TODO-007\` | \`P0\` | \`NOW\` | \`Branch Audit Agent\` | \`READY\` | Freeze the branch field. | \`data/capsules/*\` |
| \`TODO-001\` | \`P1\` | \`NEXT\` | \`Runtime Agent\` | \`READY\` | Make the query safer. | \`lib/a2c/query.ts\` |
`,
    );
    writeFile(
      root,
      "TO-DO/tasks/TODO-007-real-dream-global-audit.md",
      `# TODO-007 Real Dream Global Audit

- Priority: \`P0\`
- Execution Band: \`NOW\`
- Status: \`READY\`
- Owner Lane: \`Branch Audit Agent\`
- Cluster: \`Real/Dream governance\`

## Goal

Freeze the current branch field into one deterministic audit.

## Implementation Plan

1. Reproduce the current corpus counts.
2. Rank the highest-drift hubs.

## Mode and Skill

- Primary mode: \`TO-DO Executor\`
- Optional skill: \`skills/capsule-graph-snapshot/SKILL.md\`

## System Prompt Slice

\`\`\`text
Measure the live branch field and prepare one deterministic launch packet.
\`\`\`

## Operator Command Pack

- \`Take TODO-007 and freeze the branch field into one deterministic audit.\`

## Verification

- \`npm run validate -- --dir data/capsules --strict --report\`

## Stop Conditions

- the counts do not reproduce
`,
    );

    const result = runAutomatedUpdate({
      rootDir: root,
      now: new Date("2026-03-09T18:45:00.000Z"),
      repoStateProvider: () => ({
        branch: "main",
        dirty: true,
        modifiedCount: 3,
        untrackedCount: 1,
        sample: [" M README.md", "?? CONTEXT.md"],
      }),
    });

    const latest = JSON.parse(fs.readFileSync(result.latestPath, "utf8")) as {
      selectedTask: { id: string };
      mode: string;
    };
    const history = fs.readFileSync(result.historyPath, "utf8");
    const report = fs.readFileSync(result.reportPath, "utf8");
    const repoSync = JSON.parse(fs.readFileSync(result.repoSync.latestPath, "utf8")) as {
      workflow: string;
      capsuleVault: { total: number };
      teamwork: { latestTaskId: string | null };
    };
    const orchestration = JSON.parse(fs.readFileSync(result.orchestration.latestPath, "utf8")) as {
      workflow: string;
      conductorDecision: { primaryLane: string };
    };

    expect(latest.selectedTask.id).toBe("TODO-007");
    expect(latest.mode).toBe("TO-DO Executor");
    expect(history).toContain('"workflow":"n1_automated_update"');
    expect(report).toContain("N1 Automated Update Iteration");
    expect(report).toContain("TODO-007");
    expect(repoSync.workflow).toBe("n1_repo_sync");
    expect(repoSync.capsuleVault.total).toBe(0);
    expect(repoSync.teamwork.latestTaskId).toBeNull();
    expect(orchestration.workflow).toBe("n1_orchestration");
    expect(orchestration.conductorDecision.primaryLane).toBe("todo_executor");
  });

  it("reports git state defensively outside a git checkout", () => {
    const root = makeTempRoot();
    const repoState = readRepoState(root);

    expect(repoState.branch).toBeNull();
    expect(repoState.dirty).toBe(false);
    expect(repoState.modifiedCount).toBe(0);
    expect(repoState.untrackedCount).toBe(0);
  });

  it("creates the N1 skill scaffold in repo-native format", () => {
    const root = makeTempRoot();

    const result = scaffoldSkill(root, "N1");
    const content = fs.readFileSync(result.skillFilePath, "utf8");

    expect(result.slug).toBe("n1");
    expect(result.created).toBe(true);
    expect(content).toContain("name: n1");
    expect(content).toContain("# N1");
    expect(content).toContain("stable assistant identity");
    expect(content).toContain("TO-DO/AGENT_OPERATING_MODES.md");
  });

  it("writes a repo sync packet that compresses project state for N1", () => {
    const root = makeTempRoot();
    writeFile(
      root,
      "TO-DO/HOT_QUEUE.md",
      `# Queue

| ID | Priority | Execution Band | Owner Lane | Status | Goal | Surface |
| --- | --- | --- | --- | --- | --- | --- |
| \`TODO-016\` | \`P1\` | \`NEXT\` | \`A2C Intake Agent\` | \`READY\` | Convert user input into A2C intake. | \`lib/a2c/*\` |
| \`TODO-017\` | \`P1\` | \`NEXT\` | \`Task Packet Agent\` | \`READY\` | Build packet generation. | \`TO-DO/tasks/*\` |
`,
    );
    writeFile(root, "README.md", "# N1Hub\n");
    writeFile(root, "AGENTS.md", "# Agents\n");
    writeFile(root, "CODEX.md", "# Codex\n");
    writeFile(root, "SOUL.md", "# Soul\n");
    writeFile(root, "CONTEXT.md", "# Context\n");
    writeFile(root, "MEMORY.md", "# Memory\n");
    writeFile(root, "TOOLS.md", "# Tools\n");
    writeFile(root, "TO-DO/README.md", "# TO-DO\n");
    writeFile(root, "TO-DO/AGENT_OPERATING_MODES.md", "# Modes\n");
    writeFile(root, "data/capsules/capsule.one.json", "{}\n");
    writeFile(root, "data/capsules/capsule.two@dream.json", "{}\n");
    writeFile(
      root,
      "data/private/a2c/index.json",
      JSON.stringify({
        graph: {
          generated_at: "2026-03-09T00:00:00.000Z",
          nodes: [{ id: "a" }, { id: "b" }],
          edges: [{ source: "a", target: "b" }],
        },
      }),
    );
    writeFile(root, "data/private/a2c/tasks/task-one.json", "{}\n");
    writeFile(root, "reports/a2c/report-one.md", "# report\n");
    writeFile(
      root,
      "data/private/agents/n1/teamwork.latest.json",
      JSON.stringify({
        iterationId: "n1-iter-test",
        selectedTask: { id: "TODO-016" },
      }),
    );

    const result = runProjectSync({
      rootDir: root,
      now: new Date("2026-03-09T20:00:00.000Z"),
      repoStateProvider: () => ({
        branch: "main",
        dirty: false,
        modifiedCount: 0,
        untrackedCount: 0,
        sample: [],
      }),
    });

    const latest = JSON.parse(fs.readFileSync(result.latestPath, "utf8")) as {
      workflow: string;
      capsuleVault: { total: number; realCount: number; dreamCount: number };
      a2c: { indexPresent: boolean; nodeCount: number; edgeCount: number; tasksCount: number };
      teamwork: { latestTaskId: string | null };
      neuralPacket: { nextSuggestedAction: string };
    };
    const report = fs.readFileSync(result.reportPath, "utf8");

    expect(latest.workflow).toBe("n1_repo_sync");
    expect(latest.capsuleVault).toEqual({
      total: 2,
      realCount: 1,
      dreamCount: 1,
    });
    expect(latest.a2c.indexPresent).toBe(true);
    expect(latest.a2c.nodeCount).toBe(2);
    expect(latest.a2c.edgeCount).toBe(1);
    expect(latest.a2c.tasksCount).toBe(1);
    expect(latest.teamwork.latestTaskId).toBe("TODO-016");
    expect(latest.neuralPacket.nextSuggestedAction).toContain("TODO-016");
    expect(report).toContain("N1 Repo Sync");
    expect(report).toContain("TODO-016");
  });

  it("writes an orchestration snapshot with lane routing for N1", () => {
    const root = makeTempRoot();
    writeFile(
      root,
      "TO-DO/HOT_QUEUE.md",
      `# Queue

| ID | Priority | Execution Band | Owner Lane | Status | Goal | Surface |
| --- | --- | --- | --- | --- | --- | --- |
| \`TODO-007\` | \`P0\` | \`NOW\` | \`Branch Audit Agent\` | \`READY\` | Freeze the branch field. | \`data/capsules/*\` |
| \`TODO-008\` | \`P0\` | \`NOW\` | \`Constitution Agent\` | \`READY\` | Triage constitutional hubs. | \`data/capsules/*\` |
| \`TODO-009\` | \`P0\` | \`NOW\` | \`Vault Steward Agent\` | \`ACTIVE\` | Review dream-only operations. | \`lib/agents/vaultSteward/*\` |
| \`TODO-010\` | \`P1\` | \`NEXT\` | \`Law Sync Agent\` | \`READY\` | Sync real-only law capsules. | \`data/capsules/*\` |
`,
    );
    writeFile(
      root,
      "WORKFLOW.md",
      `---
tracker:
  kind: linear_issue
  mode: worktree
workspace:
  root: .symphony/workspaces
agent:
  max_concurrent_agents: 4
---

# Workflow
`,
    );
    writeFile(
      root,
      "NINFINITY_WORKFLOW.md",
      `---
tracker:
  kind: capsule_graph
  mode: night_shift
  night_start_hour: 1
  night_end_hour: 6
workspace:
  root: .ninfinity/workspaces
agent:
  max_concurrent_agents: 2
---

# NInfinity
`,
    );
    writeFile(
      root,
      "data/private/agents/n1/repo-sync.latest.json",
      JSON.stringify({
        syncId: "n1-sync-test",
      }),
    );
    writeFile(
      root,
      "data/private/agents/vault-steward.runtime.json",
      JSON.stringify({
        status: "idle",
        latest_run_id: "vault-run-1",
      }),
    );
    writeFile(
      root,
      "data/private/agents/vault-steward.latest.json",
      JSON.stringify({
        provider: "test-provider",
        overview: "Prepared Dream-side maintenance queue.",
      }),
    );
    writeFile(
      root,
      "data/private/a2c/index.json",
      JSON.stringify({
        graph: {
          generated_at: "2026-03-09T00:00:00.000Z",
          nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
          edges: [{ source: "a", target: "b" }, { source: "b", target: "c" }],
        },
      }),
    );

    const result = runN1Orchestration({
      rootDir: root,
      now: new Date("2026-03-09T21:00:00.000Z"),
      repoStateProvider: () => ({
        branch: "main",
        dirty: false,
        modifiedCount: 0,
        untrackedCount: 0,
        sample: [],
      }),
    });

    const latest = JSON.parse(fs.readFileSync(result.latestPath, "utf8")) as {
      workflow: string;
      queueFrontier: Array<{ id: string }>;
      conductorDecision: { primaryLane: string; secondaryLanes: string[] };
      workflows: {
        symphony: { kind: string; maxConcurrentAgents: number | null } | null;
        ninfinity: { kind: string; nightWindow: string | null } | null;
      };
      runtimeSignals: {
        a2c: { indexPresent: boolean; nodeCount: number };
        vaultSteward: { runtimePresent: boolean; provider: string | null };
      };
    };
    const report = fs.readFileSync(result.reportPath, "utf8");

    expect(latest.workflow).toBe("n1_orchestration");
    expect(latest.queueFrontier[0]?.id).toBe("TODO-007");
    expect(latest.conductorDecision.primaryLane).toBe("todo_executor");
    expect(latest.conductorDecision.secondaryLanes).toContain("swarm_conductor");
    expect(latest.workflows.symphony?.kind).toBe("linear_issue");
    expect(latest.workflows.symphony?.maxConcurrentAgents).toBe(4);
    expect(latest.workflows.ninfinity?.kind).toBe("capsule_graph");
    expect(latest.workflows.ninfinity?.nightWindow).toBe("1:00-6:00");
    expect(latest.runtimeSignals.a2c.indexPresent).toBe(true);
    expect(latest.runtimeSignals.a2c.nodeCount).toBe(3);
    expect(latest.runtimeSignals.vaultSteward.runtimePresent).toBe(true);
    expect(latest.runtimeSignals.vaultSteward.provider).toBe("test-provider");
    expect(report).toContain("N1 Orchestration Snapshot");
    expect(report).toContain("TODO-007");
    expect(report).toContain("swarm_conductor");
  });

  it("refuses to overwrite an existing skill scaffold without force", () => {
    const root = makeTempRoot();

    scaffoldSkill(root, "N1");

    expect(() => scaffoldSkill(root, "N1")).toThrow("Skill already exists");
  });
});
