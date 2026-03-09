// @anchor interface:anchors.scorecard-assertion links=interface:anchors.package-api,interface:anchors.scorecard-api,script:anchors.assert-scorecard,test:anchors.assert-scorecard-contract note="Typed scorecard assertion contract for N1Hub CLI and CI."
import fs from "node:fs";
import path from "node:path";

export interface ScorecardPayload {
  scorecard?: {
    passed?: boolean;
    score?: number;
    grade?: string;
    issues?: unknown[];
  };
}

export interface ScorecardAssertionResult {
  ok: boolean;
  code: "OK" | "MISSING_FILE" | "INVALID_JSON" | "NOT_PASSED";
  message: string;
}

export function assertScorecardJsonText(
  raw: string,
  label: string,
): ScorecardAssertionResult {
  let parsed: ScorecardPayload;
  try {
    parsed = JSON.parse(raw) as ScorecardPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      code: "INVALID_JSON",
      message: `Scorecard assertion failed: invalid JSON in '${label}' (${message}).`,
    };
  }

  const passed = parsed.scorecard?.passed;
  if (passed !== true) {
    const score = parsed.scorecard?.score ?? "unknown";
    const grade = parsed.scorecard?.grade ?? "unknown";
    const issueCount = Array.isArray(parsed.scorecard?.issues)
      ? parsed.scorecard?.issues.length
      : "unknown";
    return {
      ok: false,
      code: "NOT_PASSED",
      message:
        `Scorecard assertion failed: scorecard.passed=${String(passed)} ` +
        `(score=${score}, grade=${grade}, issues=${issueCount}).`,
    };
  }

  return {
    ok: true,
    code: "OK",
    message: `Scorecard assertion passed for '${label}'.`,
  };
}

export function assertScorecardFile(
  targetPath: string,
  cwd = process.cwd(),
): ScorecardAssertionResult {
  const absolute = path.isAbsolute(targetPath)
    ? targetPath
    : path.join(cwd, targetPath);

  if (!fs.existsSync(absolute)) {
    return {
      ok: false,
      code: "MISSING_FILE",
      message: `Scorecard assertion failed: missing file '${targetPath}'.`,
    };
  }

  const raw = fs.readFileSync(absolute, "utf8");
  return assertScorecardJsonText(raw, targetPath);
}
