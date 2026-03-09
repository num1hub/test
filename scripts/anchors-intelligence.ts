// @anchor script:anchors.intelligence links=script:anchors.scorecard,script:anchors.kpis,interface:anchors.intelligence-api note="Computes topology and link-structure intelligence for the N1Hub anchor graph."
import fs from "node:fs";
import path from "node:path";

import {
  ANCHOR_ARTIFACT_FILES,
  analyzeAnchorGraph,
  normalizeAnchor,
  type Anchor,
  scanAnchors,
  sortAnchors,
  toPosixPath,
  writeIfChanged,
} from "../lib/anchors";

const ROOT = process.cwd();
const EXCLUDED_OUTPUTS = new Set<string>(ANCHOR_ARTIFACT_FILES);

function loadAnchorsFromIndex(indexPath: string): Anchor[] {
  if (!fs.existsSync(indexPath)) return [];
  const text = fs.readFileSync(indexPath, "utf8");
  const parsed = JSON.parse(text) as { anchors?: Partial<Anchor>[] };
  return (parsed.anchors ?? []).map((anchor) =>
    normalizeAnchor({
      ...anchor,
      file: toPosixPath(anchor.file ?? ""),
    }),
  );
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const indexPath = path.join(ROOT, "docs", "anchors.index.json");
  const useIndex = args.has("--from-index");
  const asJson = args.has("--json");
  const outPath = process.argv.find((arg) => arg.startsWith("--out="));

  const anchors = useIndex
    ? loadAnchorsFromIndex(indexPath)
    : sortAnchors(
        scanAnchors({
          rootDir: ROOT,
          excludeFiles: EXCLUDED_OUTPUTS,
        }),
      );

  const intelligence = analyzeAnchorGraph(anchors);
  if (outPath) {
    const target = outPath.slice("--out=".length);
    const absTarget = path.isAbsolute(target) ? target : path.join(ROOT, target);
    writeIfChanged(absTarget, `${JSON.stringify(intelligence, null, 2)}\n`);
    if (!asJson) {
      console.log(`Wrote ${path.relative(ROOT, absTarget)}`);
    }
  }

  if (asJson) {
    console.log(JSON.stringify(intelligence, null, 2));
    return;
  }

  console.log("Anchor Intelligence");
  console.log(`anchors: ${intelligence.anchorCount}`);
  console.log(`edges: ${intelligence.edgeCount}`);
  console.log(`broken_links: ${intelligence.brokenLinkCount}`);
  console.log(`zero_inbound: ${intelligence.zeroInboundCount}`);
  console.log(`weak_components: ${intelligence.weakComponentCount}`);
  console.log(`reciprocal_edge_ratio: ${intelligence.reciprocalEdgeRatio}`);
  console.log(
    `scc_count: ${intelligence.stronglyConnectedComponentCount} (largest=${intelligence.largestStronglyConnectedComponentSize})`,
  );
}

main();
