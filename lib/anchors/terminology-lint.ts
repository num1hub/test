// @anchor interface:anchors.terminology-lint links=interface:anchors.package-api,script:anchors.terminology-lint,test:anchors.terminology-lint-contract,doc:governance.terminology note="Policy scanner for restricted terminology across scoped N1Hub governance surfaces."
import fs from "node:fs";
import path from "node:path";

import { toPosixPath } from "./core";

export type RestrictedTerm = "legacy" | "heritage" | "donor" | "autoupdate";
export type TerminologyMarkerIssueKind =
  | "nested-start"
  | "unexpected-end"
  | "unclosed-start";

export interface TerminologyViolation {
  file: string;
  line: number;
  term: RestrictedTerm;
  snippet: string;
}

export interface TerminologyMarkerIssue {
  file: string;
  line: number;
  kind: TerminologyMarkerIssueKind;
  snippet: string;
}

export interface TerminologyLintReport {
  targets: string[];
  markerIssues: TerminologyMarkerIssue[];
  violations: TerminologyViolation[];
}

export interface TerminologyLintOptions {
  explicitTargets?: readonly string[];
  scanRoots?: readonly string[];
}

export const HISTORICAL_QUOTE_START_MARKER =
  "<!-- terminology:historical-quote:start -->";
export const HISTORICAL_QUOTE_END_MARKER =
  "<!-- terminology:historical-quote:end -->";

const ROOT_DOC_TARGETS = ["README.md", "AGENTS.md", "CODEX.md"] as const;
const DEFAULT_SCAN_ROOTS = ["docs", "scripts", "lib", "__tests__"] as const;
const ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".ts",
  ".tsx",
  ".js",
  ".json",
  ".csv",
  ".mermaid",
  ".yml",
  ".yaml",
]);
const EXCLUDED_PATHS = new Set([
  "docs/TERMINOLOGY.md",
  "scripts/terminology-lint.ts",
  "lib/anchors/terminology-lint.ts",
  "__tests__/anchors/anchors.terminology-lint.test.ts",
]);
const TERM_PATTERNS: ReadonlyArray<Readonly<{ term: RestrictedTerm; re: RegExp }>> = [
  { term: "legacy", re: /\blegacy\b/gi },
  { term: "heritage", re: /\bheritage\b/gi },
  { term: "donor", re: /\bdonor\b/gi },
  { term: "autoupdate", re: /\bautoupdate\b/gi },
];

type MarkerType = "start" | "end";
interface HistoricalQuoteBlock {
  startLine: number;
  endLine: number;
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function classifyHistoricalMarker(line: string): MarkerType | null {
  const trimmed = line.trim();
  if (trimmed === HISTORICAL_QUOTE_START_MARKER) return "start";
  if (trimmed === HISTORICAL_QUOTE_END_MARKER) return "end";
  return null;
}

function isLineInsideHistoricalQuote(
  lineNumber: number,
  blocks: ReadonlyArray<HistoricalQuoteBlock>,
): boolean {
  for (const block of blocks) {
    if (lineNumber >= block.startLine && lineNumber <= block.endLine) {
      return true;
    }
  }
  return false;
}

function analyzeHistoricalQuoteMarkers(
  file: string,
  lines: ReadonlyArray<string>,
): {
  blocks: HistoricalQuoteBlock[];
  markerIssues: TerminologyMarkerIssue[];
} {
  const blocks: HistoricalQuoteBlock[] = [];
  const markerIssues: TerminologyMarkerIssue[] = [];
  let currentStartLine: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index] ?? "";
    const marker = classifyHistoricalMarker(line);
    if (!marker) continue;

    if (marker === "start") {
      if (currentStartLine !== null) {
        markerIssues.push({
          file: toPosixPath(file),
          line: lineNumber,
          kind: "nested-start",
          snippet: line.trim(),
        });
        continue;
      }

      currentStartLine = lineNumber;
      continue;
    }

    if (currentStartLine === null) {
      markerIssues.push({
        file: toPosixPath(file),
        line: lineNumber,
        kind: "unexpected-end",
        snippet: line.trim(),
      });
      continue;
    }

    blocks.push({
      startLine: currentStartLine + 1,
      endLine: lineNumber - 1,
    });
    currentStartLine = null;
  }

  if (currentStartLine !== null) {
    markerIssues.push({
      file: toPosixPath(file),
      line: currentStartLine,
      kind: "unclosed-start",
      snippet: lines[currentStartLine - 1]?.trim() ?? "",
    });
  }

  return { blocks, markerIssues };
}

function pushIfPresent(rootDir: string, file: string, targets: string[]): void {
  const relPath = toPosixPath(file);
  if (EXCLUDED_PATHS.has(relPath)) return;
  if (fs.existsSync(path.join(rootDir, relPath))) {
    targets.push(relPath);
  }
}

function walkForTargets(
  rootDir: string,
  relativeDir: string,
  targets: string[],
): void {
  const absRoot = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absRoot)) return;

  function walk(absDir: string): void {
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    entries.sort((a, b) => compareText(a.name, b.name));

    for (const entry of entries) {
      const absPath = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        walk(absPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;

      const relPath = toPosixPath(path.relative(rootDir, absPath));
      if (EXCLUDED_PATHS.has(relPath)) continue;
      targets.push(relPath);
    }
  }

  walk(absRoot);
}

export function collectTerminologyLintTargets(
  rootDir: string,
  options: TerminologyLintOptions = {},
): string[] {
  const targets: string[] = [];

  if (options.explicitTargets && options.explicitTargets.length > 0) {
    for (const target of options.explicitTargets) {
      pushIfPresent(rootDir, target, targets);
    }
  } else {
    for (const rootDoc of ROOT_DOC_TARGETS) {
      pushIfPresent(rootDir, rootDoc, targets);
    }
  }

  const scanRoots =
    options.scanRoots && options.scanRoots.length > 0
      ? options.scanRoots
      : options.explicitTargets && options.explicitTargets.length > 0
        ? []
        : DEFAULT_SCAN_ROOTS;

  for (const scanRoot of scanRoots) {
    walkForTargets(rootDir, scanRoot, targets);
  }

  return [...new Set(targets)].sort(compareText);
}

export function findRestrictedTerminologyViolations(
  file: string,
  text: string,
): TerminologyViolation[] {
  const violations: TerminologyViolation[] = [];
  const lines = text.split(/\r?\n/);
  const { blocks } = analyzeHistoricalQuoteMarkers(file, lines);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const lineNumber = index + 1;
    if (classifyHistoricalMarker(line)) continue;
    if (isLineInsideHistoricalQuote(lineNumber, blocks)) continue;

    for (const pattern of TERM_PATTERNS) {
      const matches = line.matchAll(new RegExp(pattern.re));
      for (const _match of matches) {
        violations.push({
          file: toPosixPath(file),
          line: lineNumber,
          term: pattern.term,
          snippet: line.trim(),
        });
      }
    }
  }

  return violations;
}

export function findTerminologyMarkerIssues(
  file: string,
  text: string,
): TerminologyMarkerIssue[] {
  const lines = text.split(/\r?\n/);
  const { markerIssues } = analyzeHistoricalQuoteMarkers(file, lines);
  return markerIssues;
}

export function scanTerminologyLint(
  rootDir: string,
  options: TerminologyLintOptions = {},
): TerminologyLintReport {
  const targets = collectTerminologyLintTargets(rootDir, options);
  const markerIssues: TerminologyMarkerIssue[] = [];
  const violations: TerminologyViolation[] = [];

  for (const file of targets) {
    const absPath = path.join(rootDir, file);
    const text = fs.readFileSync(absPath, "utf8");
    markerIssues.push(...findTerminologyMarkerIssues(file, text));
    violations.push(...findRestrictedTerminologyViolations(file, text));
  }

  markerIssues.sort((a, b) => {
    if (a.file !== b.file) return compareText(a.file, b.file);
    if (a.line !== b.line) return a.line - b.line;
    return compareText(a.kind, b.kind);
  });

  violations.sort((a, b) => {
    if (a.file !== b.file) return compareText(a.file, b.file);
    if (a.line !== b.line) return a.line - b.line;
    return compareText(a.term, b.term);
  });

  return { targets, markerIssues, violations };
}
