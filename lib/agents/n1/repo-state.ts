import { execFileSync } from "node:child_process";

import type { RepoStateSnapshot } from "./types";

export function readRepoState(rootDir: string): RepoStateSnapshot {
  const safeExec = (args: string[]): string | null => {
    try {
      return execFileSync("git", args, {
        cwd: rootDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return null;
    }
  };

  const status = safeExec(["status", "--short"]) ?? "";
  const branch = safeExec(["rev-parse", "--abbrev-ref", "HEAD"]);
  const lines = status
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const untrackedCount = lines.filter((line) => line.startsWith("??")).length;

  return {
    branch,
    dirty: lines.length > 0,
    modifiedCount: lines.length - untrackedCount,
    untrackedCount,
    sample: lines.slice(0, 12),
  };
}
