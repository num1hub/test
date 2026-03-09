// @anchor script:anchors.scorecard links=script:extract.anchors,script:anchors.intelligence,script:anchors.assert-scorecard,script:anchors.snapshot,interface:anchors.scorecard-api,doc:governance.risk-register note="Evaluates governance thresholds and final scorecard for N1Hub anchors."
import fs from "node:fs";
import path from "node:path";

import {
  ANCHOR_ARTIFACT_FILES,
  CI_WORKFLOW_PATHS,
  DEFAULT_THRESHOLDS,
  GOVERNED_APP_ENTRYPOINT_FILES,
  GOVERNED_TARGET_FILES,
  SPINE_CHAIN,
  SPINE_FILES,
  analyzeAnchorGraph,
  computeCoverageReport,
  computeKpiReport,
  evaluateAnchorGovernance,
  type Anchor,
  normalizeAnchor,
  readIfExists,
  scanAnchors,
  sortAnchors,
  writeIfChanged,
  type GovernanceThresholds,
} from "../lib/anchors";

const ROOT = process.cwd();
const EXCLUDED_OUTPUTS = new Set<string>(ANCHOR_ARTIFACT_FILES);
const DEFAULT_THRESHOLDS_FILE = "anchor-governance.thresholds.json";

function resolveArgValue(prefix: string): string | undefined {
  const entry = process.argv.find((arg) => arg.startsWith(prefix));
  if (!entry) return undefined;
  return entry.slice(prefix.length);
}

function loadThresholds(
  thresholdPath: string | undefined,
): Partial<GovernanceThresholds> {
  if (!thresholdPath) return {};
  const absPath = path.isAbsolute(thresholdPath)
    ? thresholdPath
    : path.join(ROOT, thresholdPath);
  const text = fs.readFileSync(absPath, "utf8");
  return JSON.parse(text) as Partial<GovernanceThresholds>;
}

function loadAnchorsFromIndex(): Anchor[] {
  const indexPath = path.join(ROOT, "docs", "anchors.index.json");
  const text = readIfExists(indexPath);
  if (!text) return [];
  const parsed = JSON.parse(text) as { anchors?: Partial<Anchor>[] };
  return (parsed.anchors ?? []).map(normalizeAnchor);
}

function readCiText(): string {
  for (const relativePath of CI_WORKFLOW_PATHS) {
    const text = readIfExists(path.join(ROOT, relativePath));
    if (text !== null) return text;
  }
  return "";
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const asJson = args.has("--json");
  const failOnThreshold = args.has("--fail-on-threshold");
  const useIndex = args.has("--from-index");
  const explicitThresholdPath = resolveArgValue("--thresholds=");
  const thresholdPath =
    explicitThresholdPath ??
    (fs.existsSync(path.join(ROOT, DEFAULT_THRESHOLDS_FILE))
      ? DEFAULT_THRESHOLDS_FILE
      : undefined);
  const outPath = resolveArgValue("--out=");

  const thresholds = {
    ...DEFAULT_THRESHOLDS,
    ...loadThresholds(thresholdPath),
  };

  if (!thresholdPath) {
    console.warn(
      `WARN: No threshold file found at '${DEFAULT_THRESHOLDS_FILE}'. Using code defaults.`,
    );
  }

  const anchors = useIndex
    ? sortAnchors(loadAnchorsFromIndex())
    : sortAnchors(
        scanAnchors({
          rootDir: ROOT,
          excludeFiles: EXCLUDED_OUTPUTS,
        }),
      );

  const coverage = computeCoverageReport(ROOT, anchors, GOVERNED_TARGET_FILES);
  const kpis = computeKpiReport({
    rootDir: ROOT,
    anchors,
    spineChain: SPINE_CHAIN,
    spineFiles: SPINE_FILES,
    ciText: readCiText(),
    appEntrypoints: GOVERNED_APP_ENTRYPOINT_FILES,
  });
  const intelligence = analyzeAnchorGraph(anchors);

  const scorecard = evaluateAnchorGovernance({
    coverage,
    kpis,
    intelligence,
    thresholds,
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    scorecard,
    coverage,
    kpis,
    intelligence,
  };

  if (outPath) {
    const absOut = path.isAbsolute(outPath) ? outPath : path.join(ROOT, outPath);
    writeIfChanged(absOut, `${JSON.stringify(payload, null, 2)}\n`);
    if (!asJson) {
      console.log(`Wrote ${path.relative(ROOT, absOut)}`);
    }
  }

  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("Anchor Governance Scorecard");
    console.log(`score: ${scorecard.score}`);
    console.log(`grade: ${scorecard.grade}`);
    console.log(`passed: ${scorecard.passed ? "yes" : "no"}`);
    console.log(`blocking_issues: ${scorecard.blockingIssueCount}`);
    if (scorecard.issues.length > 0) {
      console.log("issues:");
      for (const issue of scorecard.issues) {
        console.log(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
      }
    }
  }

  if (failOnThreshold && !scorecard.passed) {
    process.exit(1);
  }
}

main();
