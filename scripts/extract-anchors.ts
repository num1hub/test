// @anchor script:extract.anchors links=arch:repo.entrypoint,script:validate.anchors,script:anchors.scorecard,doc:governance.anchors-spec note="Generates anchor index, map, and graph artifacts for N1Hub."
import path from "node:path";

import {
  ANCHOR_ARTIFACT_FILES,
  buildAnchorIndexPayload,
  hasAnchorPayloadChanged,
  readIfExists,
  renderAnchorGraphMermaid,
  renderAnchorMap,
  scanAnchors,
  sortAnchors,
  writeIfChanged,
} from "../lib/anchors";

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, "docs", "anchors.index.json");
const OUT_MAP = path.join(ROOT, "docs", "ANCHOR_MAP.md");
const OUT_GRAPH = path.join(ROOT, "docs", "ANCHOR_GRAPH.mermaid");
const EXCLUDED_OUTPUTS = new Set<string>(ANCHOR_ARTIFACT_FILES);

function main(): void {
  const anchors = sortAnchors(
    scanAnchors({
      rootDir: ROOT,
      excludeFiles: EXCLUDED_OUTPUTS,
    }),
  );

  const existingJson = readIfExists(OUT_JSON);
  if (hasAnchorPayloadChanged(existingJson, anchors)) {
    const payload = buildAnchorIndexPayload(anchors);
    writeIfChanged(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  }

  writeIfChanged(OUT_MAP, renderAnchorMap(anchors));
  writeIfChanged(OUT_GRAPH, renderAnchorGraphMermaid(anchors));

  console.log(`Extracted ${anchors.length} anchors.`);
  console.log(`Wrote/verified ${path.relative(ROOT, OUT_JSON)}`);
  console.log(`Wrote/verified ${path.relative(ROOT, OUT_MAP)}`);
  console.log(`Wrote/verified ${path.relative(ROOT, OUT_GRAPH)}`);
}

main();
