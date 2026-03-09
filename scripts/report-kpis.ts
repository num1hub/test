// @anchor script:anchors.kpis links=script:anchors.intelligence,script:anchors.coverage,interface:anchors.metrics-api note="Computes anchor governance KPI report for N1Hub."
import fs from "node:fs";
import path from "node:path";

import {
  ANCHOR_ARTIFACT_FILES,
  CI_WORKFLOW_PATHS,
  GOVERNED_APP_ENTRYPOINT_FILES,
  SPINE_CHAIN,
  SPINE_FILES,
  computeKpiReport,
  scanAnchors,
  sortAnchors,
  writeIfChanged,
} from "../lib/anchors";

const ROOT = process.cwd();
const EXCLUDED_OUTPUTS = new Set<string>(ANCHOR_ARTIFACT_FILES);

function readCiText(): string {
  for (const workflowPath of CI_WORKFLOW_PATHS) {
    const absPath = path.join(ROOT, workflowPath);
    if (fs.existsSync(absPath)) {
      return fs.readFileSync(absPath, "utf8");
    }
  }
  return "";
}

function main(): void {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const outArg = args.find((arg) => arg.startsWith("--out="));

  const anchors = sortAnchors(
    scanAnchors({
      rootDir: ROOT,
      excludeFiles: EXCLUDED_OUTPUTS,
    }),
  );

  const report = computeKpiReport({
    rootDir: ROOT,
    anchors,
    spineChain: SPINE_CHAIN,
    spineFiles: SPINE_FILES,
    ciText: readCiText(),
    appEntrypoints: GOVERNED_APP_ENTRYPOINT_FILES,
  });

  if (outArg) {
    const target = outArg.slice("--out=".length);
    const absTarget = path.isAbsolute(target) ? target : path.join(ROOT, target);
    writeIfChanged(absTarget, `${JSON.stringify(report, null, 2)}\n`);
    if (!asJson) {
      console.log(`Wrote ${path.relative(ROOT, absTarget)}`);
    }
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("Anchor KPIs");
  console.log(`anchor_count: ${report.anchorCount}`);
  console.log("category_counts:");
  for (const [key, value] of Object.entries(report.categoryCounts)) {
    console.log(`- ${key}: ${value}`);
  }

  console.log(`mean_links_overall: ${report.meanLinksOverall.toFixed(2)}`);
  console.log(`mean_links_spine: ${report.meanLinksSpine.toFixed(2)}`);
  console.log(`zero_link_overall_pct: ${report.zeroLinkOverallPct.toFixed(2)}`);
  console.log(`zero_link_spine_pct: ${report.zeroLinkSpinePct.toFixed(2)}`);
  console.log(
    `median_anchor_position_overall: ${report.medianAnchorPositionOverall.toFixed(3)}`,
  );
  console.log(
    `median_anchor_position_spine: ${report.medianAnchorPositionSpine.toFixed(3)}`,
  );
  console.log(`spine_header_coverage: ${report.spineHeaderCoveragePct.toFixed(1)}%`);
  console.log(
    report.ciOptionalSteps.length > 0
      ? `ci_optional_steps: ${report.ciOptionalSteps.join(", ")}`
      : "ci_optional_steps: none",
  );

  console.log("Governed app entrypoint coverage");
  console.log(`app_entrypoint_count: ${report.appEntrypointCount}`);
  console.log(`app_entrypoints_with_anchor: ${report.appEntrypointsWithAnchor}`);
  console.log(
    `app_entrypoints_with_anchor_pct: ${report.appEntrypointsWithAnchorPct.toFixed(2)}`,
  );
  if (report.appEntrypointsMissingAnchor.length > 0) {
    console.log("app_entrypoints_missing_anchor:");
    for (const item of report.appEntrypointsMissingAnchor.slice(0, 25)) {
      console.log(`- ${item}`);
    }
  }
}

main();
