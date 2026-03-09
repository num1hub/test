// @anchor script:anchors.coverage links=script:anchors.kpis,script:verify.root-docs,interface:anchors.metrics-api note="Computes governed-target coverage and dark-matter report for N1Hub anchors."
import path from "node:path";

import {
  ANCHOR_ARTIFACT_FILES,
  GOVERNED_TARGET_FILES,
  computeCoverageReport,
  scanAnchors,
  sortAnchors,
  writeIfChanged,
} from "../lib/anchors";

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const outArg = process.argv.find((arg) => arg.startsWith("--out="));
const EXCLUDED_OUTPUTS = new Set<string>(ANCHOR_ARTIFACT_FILES);

function main(): void {
  const anchors = sortAnchors(
    scanAnchors({
      rootDir: ROOT,
      excludeFiles: EXCLUDED_OUTPUTS,
    }),
  );

  const report = computeCoverageReport(ROOT, anchors, GOVERNED_TARGET_FILES);
  const json = JSON.stringify(report, null, 2);

  if (outArg) {
    const target = outArg.slice("--out=".length);
    const absTarget = path.isAbsolute(target) ? target : path.join(ROOT, target);
    writeIfChanged(absTarget, `${json}\n`);
    if (!asJson) {
      console.log(`Wrote ${path.relative(ROOT, absTarget)}`);
    }
  }

  if (asJson) {
    console.log(json);
    return;
  }

  console.log(
    `Anchor coverage: ${report.summary.anchoredFiles}/${report.summary.totalFiles} governed files (${report.summary.coveragePercent}%).`,
  );
  console.log("Top governed dark matter files (zero anchors):");
  for (const item of report.darkMatter) {
    console.log(`- ${item.file} (${item.lines} lines)`);
  }
}

main();
