// @anchor interface:anchors.usage-lint links=interface:anchors.package-api,script:anchors.lint-usage,test:anchors.usage-lint-contract,script:validate.anchors note="Policy scanner for fragile anchor artifact redirection usage."
import fs from "node:fs";
import path from "node:path";

import { toPosixPath } from "./core";

export interface UsageLintViolation {
  file: string;
  line: number;
  command: "anchors:coverage" | "anchors:intelligence" | "anchors:scorecard";
  snippet: string;
}

export interface UsageLintReport {
  targets: string[];
  violations: UsageLintViolation[];
}

const ROOT_DOC_TARGETS = ["README.md", "AGENTS.md", "CODEX.md"] as const;
const DOCS_ROOT = "docs";
const WORKFLOWS_ROOT = ".github/workflows";
const DOC_EXT = ".md";
const WORKFLOW_EXTS = new Set([".yml", ".yaml"]);

const FRAGILE_REDIRECT_RE =
  /\bnpm run (anchors:coverage|anchors:intelligence|anchors:scorecard)\b[^\n\r]*?>\s*\S+/gi;

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function collectByExtension(
  rootDir: string,
  relativeDir: string,
  allowedExts: ReadonlySet<string>,
): string[] {
  const out: string[] = [];
  const absoluteRoot = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absoluteRoot)) return out;

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.sort((a, b) => compareText(a.name, b.name));
    for (const entry of entries) {
      const absPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!allowedExts.has(path.extname(entry.name).toLowerCase())) continue;
      out.push(toPosixPath(path.relative(rootDir, absPath)));
    }
  }

  walk(absoluteRoot);
  return out;
}

export function collectUsageLintTargets(
  rootDir: string,
  explicitTargets?: readonly string[],
): string[] {
  if (explicitTargets && explicitTargets.length > 0) {
    return explicitTargets
      .map((target) => toPosixPath(target))
      .filter((target) => fs.existsSync(path.join(rootDir, target)))
      .sort(compareText);
  }

  const targets: string[] = [];

  for (const file of ROOT_DOC_TARGETS) {
    const absPath = path.join(rootDir, file);
    if (fs.existsSync(absPath)) targets.push(file);
  }

  targets.push(
    ...collectByExtension(rootDir, DOCS_ROOT, new Set([DOC_EXT])),
    ...collectByExtension(rootDir, WORKFLOWS_ROOT, WORKFLOW_EXTS),
  );

  const unique = new Set(targets.map((item) => toPosixPath(item)));
  return [...unique].sort(compareText);
}

export function findFragileUsageViolations(
  file: string,
  text: string,
): UsageLintViolation[] {
  const violations: UsageLintViolation[] = [];
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const matches = line.matchAll(new RegExp(FRAGILE_REDIRECT_RE));
    for (const match of matches) {
      const command = (match[1] ?? "") as UsageLintViolation["command"];
      if (
        command !== "anchors:coverage" &&
        command !== "anchors:intelligence" &&
        command !== "anchors:scorecard"
      ) {
        continue;
      }
      violations.push({
        file: toPosixPath(file),
        line: index + 1,
        command,
        snippet: line.trim(),
      });
    }
  }

  return violations;
}

export function scanUsageLint(
  rootDir: string,
  explicitTargets?: readonly string[],
): UsageLintReport {
  const targets = collectUsageLintTargets(rootDir, explicitTargets);
  const violations: UsageLintViolation[] = [];

  for (const file of targets) {
    const absPath = path.join(rootDir, file);
    const text = fs.readFileSync(absPath, "utf8");
    violations.push(...findFragileUsageViolations(file, text));
  }

  violations.sort((a, b) => {
    if (a.file !== b.file) return compareText(a.file, b.file);
    if (a.line !== b.line) return a.line - b.line;
    return compareText(a.command, b.command);
  });

  return { targets, violations };
}
