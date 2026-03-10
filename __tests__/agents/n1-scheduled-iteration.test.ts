import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runScheduledIteration } from "@/lib/agents/n1/scheduler";

const tempRoots: string[] = [];

function makeTempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "n1-scheduled-iteration-"));
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

describe("N1 scheduled iteration", () => {
  it("executes one bounded automated-update pass when the interval is due", () => {
    const root = makeTempRoot();
    writeFile(
      root,
      "TO-DO/HOT_QUEUE.md",
      `# Queue

| ID | Priority | Execution Band | Owner Lane | Status | Goal | Surface |
| --- | --- | --- | --- | --- | --- | --- |
| \`TODO-014\` | \`P0\` | \`NOW\` | \`N1 Runtime Agent\` | \`READY\` | Add scheduler-friendly iteration control. | \`lib/agents/n1/*\` |
`,
    );
    writeFile(
      root,
      "TO-DO/tasks/TODO-014-n1-scheduled-iteration-loop.md",
      `# TODO-014 N1 Scheduled Iteration Loop

- Priority: \`P0\`
- Execution Band: \`NOW\`
- Status: \`READY\`
- Owner Lane: \`N1 Runtime Agent\`
- Cluster: \`N1 runtime\`

## Goal

Run one bounded N1 autoupdate pass behind an external scheduler contract.

## Implementation Plan

1. Read the queue packet.
2. Write the next iteration artifacts.

## Mode and Skill

- Primary mode: \`TO-DO Executor\`
- Optional skill: \`skills/n1/SKILL.md\`

## System Prompt Slice

\`\`\`text
Do one bounded scheduler-safe N1 pass.
\`\`\`

## Operator Command Pack

- \`Take TODO-014 and make N1 autoupdate scheduler-friendly without making it unsafe.\`

## Verification

- \`npx vitest run __tests__/agents/*.test.ts\`

## Stop Conditions

- the pass turns into a hidden endless daemon
`,
    );

    const result = runScheduledIteration({
      rootDir: root,
      intervalMinutes: 30,
      now: new Date("2026-03-10T10:00:00.000Z"),
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
      execution: { status: string; selectedTaskId: string | null; automatedUpdateLatestPath: string | null };
      nextEligibleAt: string;
    };
    const state = JSON.parse(fs.readFileSync(result.statePath, "utf8")) as {
      lastRunAt: string;
      lastTaskId: string | null;
    };
    const report = fs.readFileSync(result.reportPath, "utf8");

    expect(latest.workflow).toBe("n1_scheduled_iteration");
    expect(latest.execution.status).toBe("EXECUTED");
    expect(latest.execution.selectedTaskId).toBe("TODO-014");
    expect(latest.execution.automatedUpdateLatestPath).toBeTruthy();
    expect(state.lastRunAt).toBe("2026-03-10T10:00:00.000Z");
    expect(state.lastTaskId).toBe("TODO-014");
    expect(latest.nextEligibleAt).toBe("2026-03-10T10:30:00.000Z");
    expect(report).toContain("N1 Scheduled Iteration");
    expect(report).toContain("TODO-014");
  });

  it("skips execution when the interval guard is still active", () => {
    const root = makeTempRoot();
    writeFile(
      root,
      "data/private/agents/n1/scheduler.state.json",
      JSON.stringify({
        lastRunAt: "2026-03-10T10:00:00.000Z",
        lastIterationId: "n1-iter-earlier",
        lastTaskId: "TODO-014",
      }),
    );

    const result = runScheduledIteration({
      rootDir: root,
      intervalMinutes: 30,
      now: new Date("2026-03-10T10:10:00.000Z"),
    });

    const latest = JSON.parse(fs.readFileSync(result.latestPath, "utf8")) as {
      due: boolean;
      execution: { status: string; selectedTaskId: string | null };
      nextEligibleAt: string;
      previousRunAt: string | null;
    };
    const state = JSON.parse(fs.readFileSync(result.statePath, "utf8")) as {
      lastRunAt: string;
      lastTaskId: string | null;
    };
    const report = fs.readFileSync(result.reportPath, "utf8");

    expect(latest.due).toBe(false);
    expect(latest.execution.status).toBe("SKIPPED_NOT_DUE");
    expect(latest.execution.selectedTaskId).toBeNull();
    expect(latest.previousRunAt).toBe("2026-03-10T10:00:00.000Z");
    expect(latest.nextEligibleAt).toBe("2026-03-10T10:30:00.000Z");
    expect(state.lastRunAt).toBe("2026-03-10T10:00:00.000Z");
    expect(state.lastTaskId).toBe("TODO-014");
    expect(report).toContain("SKIPPED_NOT_DUE");
  });
});
