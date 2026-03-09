// @anchor test:anchors.scorecard-contract links=test:anchors.intelligence-contract,test:anchors.root-docs-contract,interface:anchors.scorecard-api note="Contract tests for governance scorecard evaluation."
import { describe, expect, it } from "vitest";

import type { AnchorGraphIntelligence } from "@/lib/anchors/intelligence";
import type { CoverageReport, KpiReport } from "@/lib/anchors/metrics";
import {
  DEFAULT_THRESHOLDS,
  evaluateAnchorGovernance,
} from "@/lib/anchors/scorecard";

function makeHealthyCoverage(): CoverageReport {
  return {
    summary: {
      totalFiles: 40,
      anchoredFiles: 40,
      coveragePercent: 100,
    },
    coveragePercent: 100,
    darkMatter: [],
  };
}

function makeHealthyKpi(): KpiReport {
  return {
    anchorCount: 20,
    categoryCounts: { arch: 4, interface: 8, doc: 2, script: 2, flow: 2, invariant: 2 },
    meanLinksOverall: 2.5,
    meanLinksSpine: 2.0,
    zeroLinkOverallPct: 0.05,
    zeroLinkSpinePct: 0,
    medianAnchorPositionOverall: 0.05,
    medianAnchorPositionSpine: 0.04,
    spineHeaderCoveragePct: 100,
    ciOptionalSteps: [],
    appEntrypointCount: 3,
    appEntrypointsWithAnchor: 3,
    appEntrypointsWithAnchorPct: 1,
    appEntrypointsMissingAnchor: [],
  };
}

function makeHealthyIntelligence(): AnchorGraphIntelligence {
  return {
    anchorCount: 20,
    edgeCount: 50,
    brokenLinkCount: 0,
    zeroInboundCount: 0,
    weakComponentCount: 1,
    reciprocalEdgeRatio: 0.8,
    stronglyConnectedComponentCount: 8,
    largestStronglyConnectedComponentSize: 6,
    topOutDegree: [],
    topInDegree: [],
  };
}

describe("anchors scorecard", () => {
  it("uses strict default thresholds aligned with N1Hub governance policy", () => {
    expect(DEFAULT_THRESHOLDS).toEqual({
      maxBrokenLinks: 0,
      maxWeakComponents: 1,
      maxZeroInboundAnchors: 0,
      minCoveragePercent: 100,
      minAppEntrypointCoveragePct: 1,
      minSpineHeaderCoveragePct: 100,
      minReciprocalEdgeRatio: 0.6,
      minPassingScore: 95,
    });
  });

  it("flags low coverage when below strict default threshold", () => {
    const coverage = makeHealthyCoverage();
    coverage.summary.coveragePercent = 95;
    coverage.coveragePercent = 95;

    const result = evaluateAnchorGovernance({
      coverage,
      kpis: makeHealthyKpi(),
      intelligence: makeHealthyIntelligence(),
    });

    expect(result.issues.some((issue) => issue.code === "LOW_FILE_COVERAGE")).toBe(
      true,
    );
    expect(result.score).toBe(95);
  });

  it("passes healthy governance inputs", () => {
    const result = evaluateAnchorGovernance({
      coverage: makeHealthyCoverage(),
      kpis: makeHealthyKpi(),
      intelligence: makeHealthyIntelligence(),
    });

    expect(result.passed).toBe(true);
    expect(result.grade === "A" || result.grade === "B").toBe(true);
    expect(result.blockingIssueCount).toBe(0);
  });

  it("fails when broken links and fragmented graph exceed thresholds", () => {
    const intelligence = makeHealthyIntelligence();
    intelligence.brokenLinkCount = 3;
    intelligence.weakComponentCount = 4;

    const result = evaluateAnchorGovernance({
      coverage: makeHealthyCoverage(),
      kpis: makeHealthyKpi(),
      intelligence,
    });

    expect(result.passed).toBe(false);
    expect(result.blockingIssueCount).toBeGreaterThan(0);
    expect(result.issues.some((issue) => issue.code === "BROKEN_LINKS")).toBe(
      true,
    );
  });

  it("fails when zero-inbound anchors exceed strict threshold", () => {
    const intelligence = makeHealthyIntelligence();
    intelligence.zeroInboundCount = 1;

    const result = evaluateAnchorGovernance({
      coverage: makeHealthyCoverage(),
      kpis: makeHealthyKpi(),
      intelligence,
    });

    expect(result.passed).toBe(false);
    expect(result.blockingIssueCount).toBeGreaterThan(0);
    expect(result.issues.some((issue) => issue.code === "ZERO_INBOUND")).toBe(
      true,
    );
  });

  it("assigns grade bands deterministically", () => {
    const intelligence = makeHealthyIntelligence();
    intelligence.brokenLinkCount = 1;

    const result = evaluateAnchorGovernance({
      coverage: makeHealthyCoverage(),
      kpis: makeHealthyKpi(),
      intelligence,
      thresholds: {
        minPassingScore: 0,
        minCoveragePercent: 0,
        minReciprocalEdgeRatio: 0,
      },
    });

    expect(result.score).toBe(80);
    expect(result.grade).toBe("B");
  });
});
