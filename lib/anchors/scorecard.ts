// @anchor interface:anchors.scorecard-api links=interface:anchors.package-api,interface:anchors.metrics-api,doc:governance.anchors-spec,script:anchors.scorecard,test:anchors.scorecard-contract,script:anchors.assert-scorecard note="Governance threshold evaluation contract for N1Hub anchor policy."
import type { AnchorGraphIntelligence } from "./intelligence";
import type { CoverageReport, KpiReport } from "./metrics";

export interface GovernanceThresholds {
  maxBrokenLinks: number;
  maxWeakComponents: number;
  maxZeroInboundAnchors: number;
  minCoveragePercent: number;
  minAppEntrypointCoveragePct: number;
  minSpineHeaderCoveragePct: number;
  minReciprocalEdgeRatio: number;
  minPassingScore: number;
}

export interface ScoreIssue {
  severity: "critical" | "major" | "minor";
  code: string;
  message: string;
}

export interface GovernanceScorecard {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  passed: boolean;
  blockingIssueCount: number;
  issues: ScoreIssue[];
  thresholds: GovernanceThresholds;
}

export const DEFAULT_THRESHOLDS: GovernanceThresholds = {
  maxBrokenLinks: 0,
  maxWeakComponents: 1,
  maxZeroInboundAnchors: 0,
  minCoveragePercent: 100,
  minAppEntrypointCoveragePct: 1,
  minSpineHeaderCoveragePct: 100,
  minReciprocalEdgeRatio: 0.6,
  minPassingScore: 95,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function gradeFor(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function evaluateAnchorGovernance(params: {
  coverage: CoverageReport;
  kpis: KpiReport;
  intelligence: AnchorGraphIntelligence;
  thresholds?: Partial<GovernanceThresholds>;
}): GovernanceScorecard {
  const thresholds: GovernanceThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(params.thresholds ?? {}),
  };

  const { coverage, kpis, intelligence } = params;
  const issues: ScoreIssue[] = [];
  let score = 100;

  if (intelligence.brokenLinkCount > thresholds.maxBrokenLinks) {
    issues.push({
      severity: "critical",
      code: "BROKEN_LINKS",
      message: `Broken links ${intelligence.brokenLinkCount} exceed max ${thresholds.maxBrokenLinks}.`,
    });
    score -= clamp(intelligence.brokenLinkCount * 20, 10, 50);
  }

  if (intelligence.weakComponentCount > thresholds.maxWeakComponents) {
    issues.push({
      severity: "critical",
      code: "GRAPH_FRAGMENTED",
      message: `Weak components ${intelligence.weakComponentCount} exceed max ${thresholds.maxWeakComponents}.`,
    });
    score -= clamp(
      (intelligence.weakComponentCount - thresholds.maxWeakComponents) * 12,
      8,
      30,
    );
  }

  if (intelligence.zeroInboundCount > thresholds.maxZeroInboundAnchors) {
    issues.push({
      severity: "critical",
      code: "ZERO_INBOUND",
      message: `Zero-inbound anchors ${intelligence.zeroInboundCount} exceed max ${thresholds.maxZeroInboundAnchors}.`,
    });
    score -= clamp(
      (intelligence.zeroInboundCount - thresholds.maxZeroInboundAnchors) * 0.5,
      4,
      20,
    );
  }

  if (coverage.summary.coveragePercent < thresholds.minCoveragePercent) {
    const gap = thresholds.minCoveragePercent - coverage.summary.coveragePercent;
    issues.push({
      severity: "major",
      code: "LOW_FILE_COVERAGE",
      message: `Coverage ${coverage.summary.coveragePercent}% below minimum ${thresholds.minCoveragePercent}%.`,
    });
    score -= clamp(gap * 0.5, 5, 25);
  }

  if (kpis.appEntrypointsWithAnchorPct < thresholds.minAppEntrypointCoveragePct) {
    const gap =
      (thresholds.minAppEntrypointCoveragePct - kpis.appEntrypointsWithAnchorPct) *
      100;
    issues.push({
      severity: "critical",
      code: "LOW_APP_ENTRYPOINT_COVERAGE",
      message: `App entrypoint coverage ${(kpis.appEntrypointsWithAnchorPct * 100).toFixed(1)}% below minimum ${(thresholds.minAppEntrypointCoveragePct * 100).toFixed(1)}%.`,
    });
    score -= clamp(gap * 0.7, 8, 35);
  }

  if (kpis.spineHeaderCoveragePct < thresholds.minSpineHeaderCoveragePct) {
    const gap = thresholds.minSpineHeaderCoveragePct - kpis.spineHeaderCoveragePct;
    issues.push({
      severity: "major",
      code: "LOW_SPINE_HEADER_COVERAGE",
      message: `Spine header coverage ${kpis.spineHeaderCoveragePct}% below minimum ${thresholds.minSpineHeaderCoveragePct}%.`,
    });
    score -= clamp(gap * 0.4, 5, 25);
  }

  if (intelligence.reciprocalEdgeRatio < thresholds.minReciprocalEdgeRatio) {
    issues.push({
      severity: "minor",
      code: "LOW_RECIPROCITY",
      message: `Reciprocal edge ratio ${intelligence.reciprocalEdgeRatio} below minimum ${thresholds.minReciprocalEdgeRatio}.`,
    });
    score -= 5;
  }

  const normalized = clamp(Math.round(score), 0, 100);
  const blockingIssueCount = issues.filter(
    (issue) => issue.severity === "critical",
  ).length;
  const passed =
    blockingIssueCount === 0 && normalized >= thresholds.minPassingScore;

  return {
    score: normalized,
    grade: gradeFor(normalized),
    passed,
    blockingIssueCount,
    issues,
    thresholds,
  };
}
