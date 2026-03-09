// @anchor test:anchors.snapshot-contract links=interface:anchors.snapshot-history,script:anchors.snapshot,interface:anchors.scorecard-assertion note="Contract tests for append-only governance history snapshots."
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  appendSnapshotLine,
  buildSnapshotFromScorecardPayload,
  parseScorecardSnapshotJson,
  snapshotFromScorecardFile,
  type AnchorGovernanceSnapshot,
} from "@/lib/anchors/snapshot";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "anchors-snapshot-"));
}

function makeScorecardPayload(
  overrides: Partial<{
    generatedAt: string;
    score: number;
    grade: string;
    passed: boolean;
    coveragePercent: number;
    anchorCount: number;
    appCoverage: number;
    spineCoverage: number;
    broken: number;
    zeroInbound: number;
    weakComponents: number;
    reciprocal: number;
  }> = {},
): string {
  return JSON.stringify({
    generatedAt: overrides.generatedAt ?? "2026-03-09T00:00:00.000Z",
    scorecard: {
      score: overrides.score ?? 100,
      grade: overrides.grade ?? "A",
      passed: overrides.passed ?? true,
    },
    coverage: {
      summary: {
        coveragePercent: overrides.coveragePercent ?? 100,
      },
    },
    kpis: {
      anchorCount: overrides.anchorCount ?? 30,
      appEntrypointsWithAnchorPct: overrides.appCoverage ?? 1,
      spineHeaderCoveragePct: overrides.spineCoverage ?? 100,
    },
    intelligence: {
      brokenLinkCount: overrides.broken ?? 0,
      zeroInboundCount: overrides.zeroInbound ?? 0,
      weakComponentCount: overrides.weakComponents ?? 1,
      reciprocalEdgeRatio: overrides.reciprocal ?? 0.74,
    },
  });
}

function parseJsonlLines(filePath: string): unknown[] {
  const text = fs.readFileSync(filePath, "utf8");
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

describe("anchors snapshot", () => {
  it("fails on malformed scorecard json", () => {
    expect(() => parseScorecardSnapshotJson("{bad-json")).toThrow(
      /Unable to parse scorecard JSON/,
    );
  });

  it("fails when scorecard payload is missing required fields", () => {
    expect(() => buildSnapshotFromScorecardPayload({})).toThrow(
      /Invalid scorecard payload/,
    );
  });

  it("fails when scorecard file is missing", () => {
    const root = makeTempDir();
    const missing = path.join(root, ".anchors-scorecard.json");
    expect(() => snapshotFromScorecardFile(missing)).toThrow(/missing file/);
  });

  it("builds a deterministic snapshot from valid payload", () => {
    const snapshot = parseScorecardSnapshotJson(makeScorecardPayload());
    expect(snapshot).toEqual<AnchorGovernanceSnapshot>({
      timestamp: "2026-03-09T00:00:00.000Z",
      anchor_count: 30,
      broken_link_count: 0,
      zero_inbound_count: 0,
      weak_component_count: 1,
      reciprocal_edge_ratio: 0.74,
      coverage_percent: 100,
      app_entrypoint_coverage_pct: 1,
      spine_header_coverage_pct: 100,
      score: 100,
      grade: "A",
      passed: true,
    });
  });

  it("appends snapshots as valid jsonl lines", () => {
    const root = makeTempDir();
    const history = path.join(root, ".anchors-history.jsonl");
    appendSnapshotLine(history, parseScorecardSnapshotJson(makeScorecardPayload()));
    appendSnapshotLine(
      history,
      parseScorecardSnapshotJson(
        makeScorecardPayload({
          generatedAt: "2026-03-10T00:00:00.000Z",
          score: 97,
          grade: "A",
        }),
      ),
    );

    const lines = parseJsonlLines(history);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ timestamp: "2026-03-09T00:00:00.000Z" });
    expect(lines[1]).toMatchObject({ timestamp: "2026-03-10T00:00:00.000Z" });
  });
});
