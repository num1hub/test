// @anchor interface:anchors.metrics-api links=interface:anchors.package-api,interface:anchors.core-api,interface:anchors.intelligence-api,interface:anchors.scorecard-api,test:anchors.metrics-contract note="Coverage and KPI reporting interfaces for scoped N1Hub anchor governance."
import fs from "node:fs";
import path from "node:path";

import {
  type Anchor,
  DEFAULT_EXCLUDE_DIRS,
  DEFAULT_INCLUDE_EXTS,
  headerThreshold,
  toPosixPath,
} from "./core";

export interface FileCoverageStat {
  file: string;
  lines: number;
  anchors: number;
  density: number;
}

export interface CoverageSummary {
  totalFiles: number;
  anchoredFiles: number;
  coveragePercent: number;
}

export interface CoverageReport {
  summary: CoverageSummary;
  coveragePercent: number;
  darkMatter: FileCoverageStat[];
}

export interface KpiReport {
  anchorCount: number;
  categoryCounts: Record<string, number>;
  meanLinksOverall: number;
  meanLinksSpine: number;
  zeroLinkOverallPct: number;
  zeroLinkSpinePct: number;
  medianAnchorPositionOverall: number;
  medianAnchorPositionSpine: number;
  spineHeaderCoveragePct: number;
  ciOptionalSteps: string[];
  appEntrypointCount: number;
  appEntrypointsWithAnchor: number;
  appEntrypointsWithAnchorPct: number;
  appEntrypointsMissingAnchor: string[];
}

const DENSITY_PER_LINES = 1000;
const DECIMAL_PRECISION = 2;
const DARK_MATTER_LIMIT = 10;
const SOURCE_FILE_EXCLUDES = new Set<string>();
const COVERAGE_EXCLUDE_PATH_PREFIXES: readonly string[] = [];
const STALE_NODE_MODULES_PREFIX = "node_modules_stale_";

const EXPLICIT_APP_ENTRYPOINTS = new Set([
  "app/layout.tsx",
  "app/error.tsx",
  "app/not-found.tsx",
  "app/robots.ts",
  "app/sitemap.ts",
]);

const APP_ENTRY_SUFFIXES = [
  "/page.tsx",
  "/page.jsx",
  "/page.js",
  "/route.ts",
  "/route.js",
];

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function resolveExplicitFiles(
  rootDir: string,
  explicitTargets?: readonly string[],
): string[] | null {
  if (explicitTargets === undefined) return null;
  const root = path.resolve(rootDir);
  return explicitTargets
    .map((target) => toPosixPath(target))
    .filter((target) => fs.existsSync(path.join(root, target)))
    .sort(compareText);
}

export function collectSourceFiles(
  rootDir: string,
  explicitTargets?: readonly string[],
): string[] {
  const resolvedExplicit = resolveExplicitFiles(rootDir, explicitTargets);
  if (resolvedExplicit) return resolvedExplicit;

  const includeExts = new Set(
    [...DEFAULT_INCLUDE_EXTS].filter((ext) => ext !== ".md"),
  );

  const out: string[] = [];
  const root = path.resolve(rootDir);

  const shouldExcludePath = (relPath: string): boolean => {
    const normalized = relPath.toLowerCase();
    return COVERAGE_EXCLUDE_PATH_PREFIXES.some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
    );
  };

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.sort((a, b) => compareText(a.name, b.name));

    for (const entry of entries) {
      const absPath = path.join(dir, entry.name);
      const relPath = toPosixPath(path.relative(root, absPath));
      if (entry.isDirectory()) {
        if (entry.name.toLowerCase().startsWith(STALE_NODE_MODULES_PREFIX)) {
          continue;
        }
        if (shouldExcludePath(relPath)) continue;
        if (DEFAULT_EXCLUDE_DIRS.has(entry.name)) continue;
        walk(absPath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!includeExts.has(path.extname(entry.name))) continue;
      if (shouldExcludePath(relPath)) continue;
      if (SOURCE_FILE_EXCLUDES.has(relPath)) continue;
      out.push(relPath);
    }
  }

  walk(root);
  return out;
}

export function countLines(absolutePath: string): number {
  const text = fs.readFileSync(absolutePath, "utf8");
  let count = 1;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") count += 1;
  }
  return count;
}

function buildAnchorCountMap(anchors: readonly Anchor[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const anchor of anchors) {
    counts.set(anchor.file, (counts.get(anchor.file) ?? 0) + 1);
  }
  return counts;
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

export function computeCoverageReport(
  rootDir: string,
  anchors: readonly Anchor[],
  explicitTargets?: readonly string[],
): CoverageReport {
  const files = collectSourceFiles(rootDir, explicitTargets);
  const anchorCounts = buildAnchorCountMap(anchors);
  const root = path.resolve(rootDir);

  const stats: FileCoverageStat[] = files.map((file) => {
    const absolutePath = path.join(root, file);
    const lines = countLines(absolutePath);
    const anchorsInFile = anchorCounts.get(file) ?? 0;
    const density = round(
      (anchorsInFile / Math.max(lines, 1)) * DENSITY_PER_LINES,
      DECIMAL_PRECISION,
    );

    return {
      file,
      lines,
      anchors: anchorsInFile,
      density,
    };
  });

  const totalFiles = stats.length;
  const anchoredFiles = stats.filter((stat) => stat.anchors > 0).length;
  const coveragePercent =
    totalFiles === 0
      ? 100
      : round((anchoredFiles / totalFiles) * 100, DECIMAL_PRECISION);

  const darkMatter = stats
    .filter((stat) => stat.anchors === 0)
    .sort((a, b) => b.lines - a.lines)
    .slice(0, DARK_MATTER_LIMIT);

  return {
    summary: {
      totalFiles,
      anchoredFiles,
      coveragePercent,
    },
    coveragePercent,
    darkMatter,
  };
}

function collectAppEntrypoints(
  rootDir: string,
  explicitAppEntrypoints?: readonly string[],
): string[] {
  const resolvedExplicit = resolveExplicitFiles(rootDir, explicitAppEntrypoints);
  if (resolvedExplicit) return resolvedExplicit;

  const appRoot = path.join(rootDir, "app");
  if (!fs.existsSync(appRoot)) return [];

  const out = new Set<string>();
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

      const rel = toPosixPath(path.relative(rootDir, absPath));
      if (EXPLICIT_APP_ENTRYPOINTS.has(rel)) {
        out.add(rel);
        continue;
      }
      if (
        rel.startsWith("app/") &&
        APP_ENTRY_SUFFIXES.some((suffix) => rel.endsWith(suffix))
      ) {
        out.add(rel);
      }
    }
  }

  walk(appRoot);
  return [...out].sort(compareText);
}

export function detectCiOptionalSteps(
  ciText: string,
  scripts: readonly string[],
): string[] {
  const optional: string[] = [];
  for (const script of scripts) {
    const pattern = new RegExp(`npm run ${script}\\s+--if-present`);
    if (pattern.test(ciText)) optional.push(script);
  }
  return optional;
}

export function computeKpiReport(params: {
  rootDir: string;
  anchors: readonly Anchor[];
  spineChain?: readonly string[];
  spineFiles?: readonly string[];
  ciText?: string;
  ciScripts?: readonly string[];
  governedTargets?: readonly string[];
  appEntrypoints?: readonly string[];
}): KpiReport {
  const {
    rootDir,
    anchors,
    spineChain = [],
    spineFiles = [],
    ciText = "",
    ciScripts = ["validate:anchors", "check:anchors:full", "typecheck"],
    appEntrypoints,
  } = params;

  const anchoredFiles = new Set(anchors.map((anchor) => anchor.file));
  const categoryCounts = new Map<string, number>();
  for (const anchor of anchors) {
    categoryCounts.set(
      anchor.category,
      (categoryCounts.get(anchor.category) ?? 0) + 1,
    );
  }

  const lineCache = new Map<string, number>();
  const root = path.resolve(rootDir);
  const getLineCount = (file: string): number => {
    if (lineCache.has(file)) return lineCache.get(file) as number;
    const count = countLines(path.join(root, file));
    lineCache.set(file, count);
    return count;
  };

  const allLinks = anchors.map((anchor) => anchor.links.length);
  const zeroLinksOverall = anchors.filter((anchor) => anchor.links.length === 0).length;
  const allPositions = anchors.map(
    (anchor) => anchor.line / Math.max(getLineCount(anchor.file), 1),
  );

  const spineSet = new Set(spineChain);
  const spineAnchors = anchors.filter((anchor) => spineSet.has(anchor.id));
  const spineLinks = spineAnchors.map((anchor) => anchor.links.length);
  const zeroLinksSpine = spineAnchors.filter((anchor) => anchor.links.length === 0).length;
  const spinePositions = spineAnchors.map(
    (anchor) => anchor.line / Math.max(getLineCount(anchor.file), 1),
  );

  const byFile = new Map<string, Anchor[]>();
  for (const anchor of anchors) {
    if (!byFile.has(anchor.file)) byFile.set(anchor.file, []);
    byFile.get(anchor.file)?.push(anchor);
  }

  let spineHeaderHits = 0;
  for (const spineFile of spineFiles) {
    const threshold = headerThreshold(getLineCount(spineFile));
    const fileAnchors = byFile.get(spineFile) ?? [];
    const hit = fileAnchors.some(
      (anchor) => anchor.category === "arch" && anchor.line <= threshold,
    );
    if (hit) spineHeaderHits += 1;
  }
  const spineHeaderCoveragePct =
    spineFiles.length === 0
      ? 0
      : round((spineHeaderHits / spineFiles.length) * 100, 1);

  const scopedAppEntrypoints = collectAppEntrypoints(rootDir, appEntrypoints);
  const appAnchoredCount = scopedAppEntrypoints.filter((entry) =>
    anchoredFiles.has(entry),
  ).length;
  const appCoverage =
    scopedAppEntrypoints.length === 0
      ? 1
      : round(appAnchoredCount / scopedAppEntrypoints.length, 2);
  const appMissing = scopedAppEntrypoints.filter((entry) => !anchoredFiles.has(entry));

  const categoryObject: Record<string, number> = {};
  for (const key of [...categoryCounts.keys()].sort(compareText)) {
    categoryObject[key] = categoryCounts.get(key) ?? 0;
  }

  return {
    anchorCount: anchors.length,
    categoryCounts: categoryObject,
    meanLinksOverall: round(mean(allLinks), 2),
    meanLinksSpine: round(mean(spineLinks), 2),
    zeroLinkOverallPct:
      anchors.length === 0 ? 0 : round(zeroLinksOverall / anchors.length, 2),
    zeroLinkSpinePct:
      spineAnchors.length === 0 ? 0 : round(zeroLinksSpine / spineAnchors.length, 2),
    medianAnchorPositionOverall: round(median(allPositions), 3),
    medianAnchorPositionSpine: round(median(spinePositions), 3),
    spineHeaderCoveragePct,
    ciOptionalSteps: detectCiOptionalSteps(ciText, ciScripts),
    appEntrypointCount: scopedAppEntrypoints.length,
    appEntrypointsWithAnchor: appAnchoredCount,
    appEntrypointsWithAnchorPct: appCoverage,
    appEntrypointsMissingAnchor: appMissing,
  };
}
