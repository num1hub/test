// @anchor script:anchors.snapshot links=interface:anchors.snapshot-history,script:anchors.scorecard,test:anchors.snapshot-contract,doc:governance.anchors-spec note="Appends scorecard KPI snapshots to N1Hub anchor history."
import path from "node:path";

import { appendSnapshotLine, snapshotFromScorecardFile } from "../lib/anchors";

const ROOT = process.cwd();

function resolveArgValue(prefix: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function main(): void {
  const scorecardArg = resolveArgValue("--scorecard=");
  const outArg = resolveArgValue("--out=");

  const scorecardPath = path.resolve(
    ROOT,
    scorecardArg ?? ".anchors-scorecard.json",
  );
  const outPath = path.resolve(ROOT, outArg ?? ".anchors-history.jsonl");

  const snapshot = snapshotFromScorecardFile(scorecardPath);
  appendSnapshotLine(outPath, snapshot);

  console.log(`Appended snapshot to ${path.relative(ROOT, outPath)}`);
  console.log(
    `score=${snapshot.score} grade=${snapshot.grade} passed=${snapshot.passed ? "true" : "false"}`,
  );
}

main();
