#!/usr/bin/env tsx
import path from "node:path";
import process from "node:process";

import {
  runAutomatedUpdate,
  runN1Orchestration,
  runProjectSync,
  scaffoldSkill,
} from "@/lib/agents/n1/automated-update";

interface IterationArgs {
  kind: "iteration";
  taskId?: string;
  dryRun: boolean;
  asJson: boolean;
}

interface SkillCreateArgs {
  kind: "skill-create";
  name: string;
  dryRun: boolean;
  asJson: boolean;
  force: boolean;
}

interface SyncArgs {
  kind: "sync";
  dryRun: boolean;
  asJson: boolean;
}

interface OrchestrateArgs {
  kind: "orchestrate";
  dryRun: boolean;
  asJson: boolean;
}

type CliArgs = IterationArgs | SkillCreateArgs | SyncArgs | OrchestrateArgs;

function parseArgs(argv: string[]): CliArgs {
  if (argv[0] === "sync") {
    const out: SyncArgs = {
      kind: "sync",
      dryRun: false,
      asJson: false,
    };

    for (let index = 1; index < argv.length; index += 1) {
      const token = argv[index];
      if (token === "--dry-run") {
        out.dryRun = true;
        continue;
      }
      if (token === "--json") {
        out.asJson = true;
        continue;
      }
      throw new Error(`Unexpected argument: ${token}`);
    }

    return out;
  }

  if (argv[0] === "orchestrate") {
    const out: OrchestrateArgs = {
      kind: "orchestrate",
      dryRun: false,
      asJson: false,
    };

    for (let index = 1; index < argv.length; index += 1) {
      const token = argv[index];
      if (token === "--dry-run") {
        out.dryRun = true;
        continue;
      }
      if (token === "--json") {
        out.asJson = true;
        continue;
      }
      throw new Error(`Unexpected argument: ${token}`);
    }

    return out;
  }

  if (argv[0] === "skill" && argv[1] === "create") {
    const name = argv[2];
    if (!name) {
      throw new Error("skill create requires a name");
    }

    const out: SkillCreateArgs = {
      kind: "skill-create",
      name,
      dryRun: false,
      asJson: false,
      force: false,
    };

    for (let index = 3; index < argv.length; index += 1) {
      const token = argv[index];
      if (token === "--dry-run") {
        out.dryRun = true;
        continue;
      }
      if (token === "--json") {
        out.asJson = true;
        continue;
      }
      if (token === "--force") {
        out.force = true;
        continue;
      }
      throw new Error(`Unexpected argument: ${token}`);
    }

    return out;
  }

  const out: IterationArgs = {
    kind: "iteration",
    dryRun: false,
    asJson: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--task") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--task requires a value");
      }
      out.taskId = value;
      index += 1;
      continue;
    }
    if (token === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (token === "--json") {
      out.asJson = true;
      continue;
    }

    throw new Error(`Unexpected argument: ${token}`);
  }

  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();

  if (args.kind === "skill-create") {
    const result = scaffoldSkill(rootDir, args.name, {
      dryRun: args.dryRun,
      force: args.force,
    });

    if (args.asJson) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }

    process.stdout.write("N1 skill scaffold\n");
    process.stdout.write(`name: ${result.name}\n`);
    process.stdout.write(`slug: ${result.slug}\n`);
    process.stdout.write(`skill file: ${path.relative(rootDir, result.skillFilePath)}\n`);
    process.stdout.write(`created: ${result.created ? "yes" : "no"}\n`);
    process.stdout.write(`overwritten: ${result.overwritten ? "yes" : "no"}\n`);
    if (args.dryRun) {
      process.stdout.write("dry-run: no files were written\n");
    }
    return;
  }

  if (args.kind === "sync") {
    const result = runProjectSync({
      rootDir,
      dryRun: args.dryRun,
    });

    if (args.asJson) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }

    process.stdout.write("N1 repo sync\n");
    process.stdout.write(`sync: ${result.snapshot.syncId}\n`);
    process.stdout.write(`next action: ${result.snapshot.neuralPacket.nextSuggestedAction}\n`);
    process.stdout.write(`repo sync latest: ${path.relative(rootDir, result.latestPath)}\n`);
    process.stdout.write(`repo sync history: ${path.relative(rootDir, result.historyPath)}\n`);
    process.stdout.write(`report: ${path.relative(rootDir, result.reportPath)}\n`);
    if (args.dryRun) {
      process.stdout.write("dry-run: no files were written\n");
    }
    return;
  }

  if (args.kind === "orchestrate") {
    const result = runN1Orchestration({
      rootDir,
      dryRun: args.dryRun,
    });

    if (args.asJson) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }

    process.stdout.write("N1 orchestration\n");
    process.stdout.write(`orchestration: ${result.snapshot.orchestrationId}\n`);
    process.stdout.write(`primary lane: ${result.snapshot.conductorDecision.primaryLane}\n`);
    process.stdout.write(
      `secondary lanes: ${result.snapshot.conductorDecision.secondaryLanes.length > 0 ? result.snapshot.conductorDecision.secondaryLanes.join(", ") : "none"}\n`,
    );
    process.stdout.write(`orchestration latest: ${path.relative(rootDir, result.latestPath)}\n`);
    process.stdout.write(`orchestration history: ${path.relative(rootDir, result.historyPath)}\n`);
    process.stdout.write(`report: ${path.relative(rootDir, result.reportPath)}\n`);
    if (args.dryRun) {
      process.stdout.write("dry-run: no files were written\n");
    }
    return;
  }

  const result = runAutomatedUpdate({
    rootDir,
    taskId: args.taskId,
    dryRun: args.dryRun,
  });

  if (args.asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write("N1 automated update workflow\n");
  process.stdout.write(`iteration: ${result.iteration.iterationId}\n`);
  process.stdout.write(`mode: ${result.iteration.mode}\n`);
  process.stdout.write(
    `selected task: ${result.iteration.selectedTask?.id ?? "none"}${result.iteration.selectedTask ? ` (${result.iteration.selectedTask.goal})` : ""}\n`,
  );
  process.stdout.write(`next action: ${result.iteration.nextAction}\n`);
  process.stdout.write(`teamwork latest: ${path.relative(rootDir, result.latestPath)}\n`);
  process.stdout.write(`teamwork history: ${path.relative(rootDir, result.historyPath)}\n`);
  process.stdout.write(`report: ${path.relative(rootDir, result.reportPath)}\n`);
  process.stdout.write(`repo sync latest: ${path.relative(rootDir, result.repoSync.latestPath)}\n`);
  process.stdout.write(`repo sync history: ${path.relative(rootDir, result.repoSync.historyPath)}\n`);
  process.stdout.write(`repo sync report: ${path.relative(rootDir, result.repoSync.reportPath)}\n`);
  process.stdout.write(`orchestration latest: ${path.relative(rootDir, result.orchestration.latestPath)}\n`);
  process.stdout.write(`orchestration history: ${path.relative(rootDir, result.orchestration.historyPath)}\n`);
  process.stdout.write(`orchestration report: ${path.relative(rootDir, result.orchestration.reportPath)}\n`);
  if (args.dryRun) {
    process.stdout.write("dry-run: no files were written\n");
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "automated update workflow failed"}\n`);
  process.exit(1);
});
