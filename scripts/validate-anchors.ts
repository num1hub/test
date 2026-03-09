// @anchor script:validate.anchors links=script:extract.anchors,script:verify.root-docs,script:test.anchors-config,interface:anchors.policy-config,doc:governance.anchors-spec note="Validates anchor integrity, freshness, and N1Hub spine rules."
import fs from "node:fs";
import path from "node:path";

import {
  ANCHOR_ARTIFACT_FILES,
  SPINE_CHAIN,
  SPINE_FILES,
  hasAnchorPayloadChanged,
  isMapFresh,
  normalizeNewlines,
  readIfExists,
  renderAnchorGraphMermaid,
  scanAnchors,
  sortAnchors,
  validateAnchors,
  validateCommentPlacement,
  validateSpineHeaders,
} from "../lib/anchors";

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, "docs", "anchors.index.json");
const MAP_PATH = path.join(ROOT, "docs", "ANCHOR_MAP.md");
const GRAPH_PATH = path.join(ROOT, "docs", "ANCHOR_GRAPH.mermaid");
const EXCLUDED_OUTPUTS = new Set<string>(ANCHOR_ARTIFACT_FILES);

function fail(errors: readonly string[]): never {
  console.error("\nAnchor validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

function main(): void {
  const anchors = sortAnchors(
    scanAnchors({
      rootDir: ROOT,
      excludeFiles: EXCLUDED_OUTPUTS,
    }),
  );

  const result = validateAnchors(anchors, {
    spineChain: SPINE_CHAIN,
  });

  const commentPlacementErrors = validateCommentPlacement(ROOT, anchors);
  const spineHeaderErrors =
    SPINE_FILES.length > 0 ? validateSpineHeaders(ROOT, anchors, SPINE_FILES) : [];

  const artifactErrors: string[] = [];
  if (!fs.existsSync(INDEX_PATH) || !fs.existsSync(MAP_PATH) || !fs.existsSync(GRAPH_PATH)) {
    artifactErrors.push("Missing generated anchor files. Run `npm run extract:anchors`.");
  } else {
    const existingJson = readIfExists(INDEX_PATH);
    if (hasAnchorPayloadChanged(existingJson, anchors)) {
      artifactErrors.push("docs/anchors.index.json is stale. Run `npm run extract:anchors`.");
    }

    const savedMap = readIfExists(MAP_PATH);
    if (savedMap === null || !isMapFresh(savedMap, anchors)) {
      artifactErrors.push("docs/ANCHOR_MAP.md is stale. Run `npm run extract:anchors`.");
    }

    const savedGraph = readIfExists(GRAPH_PATH);
    const nextGraph = renderAnchorGraphMermaid(anchors);
    if (
      savedGraph === null ||
      normalizeNewlines(savedGraph) !== normalizeNewlines(nextGraph)
    ) {
      artifactErrors.push("docs/ANCHOR_GRAPH.mermaid is stale. Run `npm run extract:anchors`.");
    }
  }

  for (const warning of result.warnings) {
    console.warn(warning);
  }

  const errors = [
    ...result.errors,
    ...commentPlacementErrors,
    ...spineHeaderErrors,
    ...artifactErrors,
  ];

  if (errors.length > 0) fail(errors);
  console.log(`Anchor validation passed (${anchors.length} anchors).`);
}

main();
