// @anchor interface:anchors.snapshot-history links=interface:anchors.package-api,script:anchors.snapshot,interface:anchors.scorecard-api,test:anchors.snapshot-contract note="Append-only governance history snapshot contract for N1Hub anchor scorecards."
import fs from "node:fs";
import path from "node:path";

import { detectEol } from "./core";

export interface AnchorGovernanceSnapshot {
  timestamp: string;
  anchor_count: number;
  broken_link_count: number;
  zero_inbound_count: number;
  weak_component_count: number;
  reciprocal_edge_ratio: number;
  coverage_percent: number;
  app_entrypoint_coverage_pct: number;
  spine_header_coverage_pct: number;
  score: number;
  grade: string;
  passed: boolean;
}

interface ScorecardLikePayload {
  generatedAt?: unknown;
  scorecard?: {
    score?: unknown;
    grade?: unknown;
    passed?: unknown;
  };
  coverage?: {
    summary?: {
      coveragePercent?: unknown;
    };
  };
  kpis?: {
    anchorCount?: unknown;
    appEntrypointsWithAnchorPct?: unknown;
    spineHeaderCoveragePct?: unknown;
  };
  intelligence?: {
    brokenLinkCount?: unknown;
    zeroInboundCount?: unknown;
    weakComponentCount?: unknown;
    reciprocalEdgeRatio?: unknown;
  };
}

function asFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid scorecard payload: '${field}' must be a finite number.`);
  }
  return value;
}

function asBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid scorecard payload: '${field}' must be a boolean.`);
  }
  return value;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid scorecard payload: '${field}' must be a non-empty string.`);
  }
  return value;
}

function asOptionalTimestamp(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return value;
}

export function buildSnapshotFromScorecardPayload(
  payload: ScorecardLikePayload,
): AnchorGovernanceSnapshot {
  const timestamp =
    asOptionalTimestamp(payload.generatedAt) ?? new Date().toISOString();

  return {
    timestamp,
    anchor_count: asFiniteNumber(payload.kpis?.anchorCount, "kpis.anchorCount"),
    broken_link_count: asFiniteNumber(
      payload.intelligence?.brokenLinkCount,
      "intelligence.brokenLinkCount",
    ),
    zero_inbound_count: asFiniteNumber(
      payload.intelligence?.zeroInboundCount,
      "intelligence.zeroInboundCount",
    ),
    weak_component_count: asFiniteNumber(
      payload.intelligence?.weakComponentCount,
      "intelligence.weakComponentCount",
    ),
    reciprocal_edge_ratio: asFiniteNumber(
      payload.intelligence?.reciprocalEdgeRatio,
      "intelligence.reciprocalEdgeRatio",
    ),
    coverage_percent: asFiniteNumber(
      payload.coverage?.summary?.coveragePercent,
      "coverage.summary.coveragePercent",
    ),
    app_entrypoint_coverage_pct: asFiniteNumber(
      payload.kpis?.appEntrypointsWithAnchorPct,
      "kpis.appEntrypointsWithAnchorPct",
    ),
    spine_header_coverage_pct: asFiniteNumber(
      payload.kpis?.spineHeaderCoveragePct,
      "kpis.spineHeaderCoveragePct",
    ),
    score: asFiniteNumber(payload.scorecard?.score, "scorecard.score"),
    grade: asString(payload.scorecard?.grade, "scorecard.grade"),
    passed: asBoolean(payload.scorecard?.passed, "scorecard.passed"),
  };
}

export function parseScorecardSnapshotJson(
  rawJson: string,
): AnchorGovernanceSnapshot {
  let parsed: ScorecardLikePayload;
  try {
    parsed = JSON.parse(rawJson) as ScorecardLikePayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to parse scorecard JSON: ${message}`);
  }
  return buildSnapshotFromScorecardPayload(parsed);
}

function hasTrailingNewline(text: string): boolean {
  return text.endsWith("\n") || text.endsWith("\r\n");
}

export function appendSnapshotLine(
  historyFilePath: string,
  snapshot: AnchorGovernanceSnapshot,
): void {
  const absolute = path.resolve(historyFilePath);
  const existing = fs.existsSync(absolute)
    ? fs.readFileSync(absolute, "utf8")
    : null;
  const eol = existing === null ? "\n" : detectEol(existing);
  const prefix =
    existing !== null && existing.length > 0 && !hasTrailingNewline(existing)
      ? eol
      : "";
  const line = JSON.stringify(snapshot);

  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.appendFileSync(absolute, `${prefix}${line}${eol}`, "utf8");
}

export function snapshotFromScorecardFile(scorecardPath: string): AnchorGovernanceSnapshot {
  if (!fs.existsSync(scorecardPath)) {
    throw new Error(
      `Scorecard snapshot failed: missing file '${scorecardPath}'. Run npm run anchors:scorecard first.`,
    );
  }
  const raw = fs.readFileSync(scorecardPath, "utf8");
  return parseScorecardSnapshotJson(raw);
}
