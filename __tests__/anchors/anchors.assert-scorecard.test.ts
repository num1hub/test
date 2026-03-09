// @anchor test:anchors.assert-scorecard-contract links=interface:anchors.scorecard-assertion,script:anchors.assert-scorecard,test:anchors.scorecard-contract note="Contract tests for scorecard assertion diagnostics and outcomes."
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertScorecardFile,
  assertScorecardJsonText,
} from "@/lib/anchors/assert-scorecard";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "anchors-assert-"));
}

describe("scorecard assertion", () => {
  it("fails when file is missing", () => {
    const root = makeTempDir();
    const result = assertScorecardFile(".anchors-scorecard.json", root);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("MISSING_FILE");
    expect(result.message).toContain("missing file");
  });

  it("fails on malformed json", () => {
    const result = assertScorecardJsonText("{bad-json", "inline");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_JSON");
    expect(result.message).toContain("invalid JSON");
  });

  it("fails when scorecard.passed is not true", () => {
    const payload = JSON.stringify({
      scorecard: {
        passed: false,
        score: 82,
        grade: "B",
        issues: [{ code: "LOW_RECIPROCITY" }],
      },
    });
    const result = assertScorecardJsonText(payload, "inline");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("NOT_PASSED");
    expect(result.message).toContain("scorecard.passed=false");
  });

  it("passes when scorecard.passed is true", () => {
    const root = makeTempDir();
    const file = path.join(root, ".anchors-scorecard.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        scorecard: {
          passed: true,
          score: 100,
          grade: "A",
          issues: [],
        },
      }),
    );

    const result = assertScorecardFile(".anchors-scorecard.json", root);
    expect(result.ok).toBe(true);
    expect(result.code).toBe("OK");
    expect(result.message).toContain("assertion passed");
  });
});
