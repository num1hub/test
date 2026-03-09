// @anchor test:anchors.terminology-lint-contract links=interface:anchors.terminology-lint,script:anchors.terminology-lint,doc:governance.terminology note="Contract tests for restricted terminology linting."
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectTerminologyLintTargets,
  findRestrictedTerminologyViolations,
  findTerminologyMarkerIssues,
  scanTerminologyLint,
} from "@/lib/anchors/terminology-lint";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "anchors-terminology-lint-"));
}

describe("terminology lint", () => {
  it("collects targets deterministically and excludes terminology spec", () => {
    const root = makeTempRoot();
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(root, "lib"), { recursive: true });
    fs.mkdirSync(path.join(root, "__tests__"), { recursive: true });

    fs.writeFileSync(path.join(root, "README.md"), "# Readme\n");
    fs.writeFileSync(path.join(root, "AGENTS.md"), "# Agents\n");
    fs.writeFileSync(path.join(root, "CODEX.md"), "# Codex\n");
    fs.writeFileSync(path.join(root, "docs", "TERMINOLOGY.md"), "# Terms\n");
    fs.writeFileSync(path.join(root, "docs", "A.md"), "doc\n");
    fs.writeFileSync(path.join(root, "scripts", "a.ts"), "script\n");
    fs.writeFileSync(path.join(root, "lib", "a.ts"), "lib\n");
    fs.writeFileSync(path.join(root, "__tests__", "a.test.ts"), "test\n");

    expect(collectTerminologyLintTargets(root)).toEqual([
      "AGENTS.md",
      "CODEX.md",
      "README.md",
      "__tests__/a.test.ts",
      "docs/A.md",
      "lib/a.ts",
      "scripts/a.ts",
    ]);
  });

  it("detects restricted terminology with line numbers", () => {
    const text = [
      "Legacy layer is still referenced here.",
      "No issue on this line.",
      "Donor and heritage details are present.",
      "autoupdate should not appear here either.",
    ].join("\n");

    const violations = findRestrictedTerminologyViolations("README.md", text);
    expect(violations).toHaveLength(4);
    expect(violations[0]).toMatchObject({
      file: "README.md",
      line: 1,
      term: "legacy",
    });
    expect(
      violations.some(
        (violation) =>
          violation.file === "README.md" &&
          violation.line === 3 &&
          violation.term === "donor",
      ),
    ).toBe(true);
    expect(
      violations.some(
        (violation) =>
          violation.file === "README.md" &&
          violation.line === 3 &&
          violation.term === "heritage",
      ),
    ).toBe(true);
    expect(violations[3]).toMatchObject({
      file: "README.md",
      line: 4,
      term: "autoupdate",
    });
  });

  it("allows restricted terms inside a marked historical quote block", () => {
    const text = [
      "Spine-first phrasing remains in active text.",
      "<!-- terminology:historical-quote:start -->",
      "legacy donor heritage autoupdate",
      "<!-- terminology:historical-quote:end -->",
      "Active wording resumes.",
    ].join("\n");

    expect(findTerminologyMarkerIssues("README.md", text)).toEqual([]);
    expect(findRestrictedTerminologyViolations("README.md", text)).toEqual([]);
  });

  it("disallows restricted terms outside a marked historical quote block", () => {
    const text = "legacy donor heritage autoupdate";

    const violations = findRestrictedTerminologyViolations("README.md", text);
    expect(violations.map((violation) => violation.term)).toEqual([
      "legacy",
      "heritage",
      "donor",
      "autoupdate",
    ]);
  });

  it("treats unclosed historical quote markers as malformed and fail-closed", () => {
    const text = [
      "Baseline wording remains.",
      "<!-- terminology:historical-quote:start -->",
      "legacy donor",
    ].join("\n");

    expect(findTerminologyMarkerIssues("README.md", text)).toEqual([
      {
        file: "README.md",
        line: 2,
        kind: "unclosed-start",
        snippet: "<!-- terminology:historical-quote:start -->",
      },
    ]);

    const violations = findRestrictedTerminologyViolations("README.md", text);
    expect(violations).toHaveLength(2);
    expect(violations[0]).toMatchObject({
      file: "README.md",
      line: 3,
      term: "legacy",
    });
    expect(violations[1]).toMatchObject({
      file: "README.md",
      line: 3,
      term: "donor",
    });
  });

  it("passes clean active files even when terminology doc includes restricted words", () => {
    const root = makeTempRoot();
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(root, "lib"), { recursive: true });
    fs.mkdirSync(path.join(root, "__tests__"), { recursive: true });

    fs.writeFileSync(path.join(root, "README.md"), "Spine-first vocabulary.\n");
    fs.writeFileSync(path.join(root, "AGENTS.md"), "Spine-first vocabulary.\n");
    fs.writeFileSync(path.join(root, "CODEX.md"), "Spine-first vocabulary.\n");
    fs.writeFileSync(path.join(root, "docs", "TERMINOLOGY.md"), "legacy heritage donor\n");
    fs.writeFileSync(path.join(root, "docs", "ops.md"), "baseline source spine-first\n");
    fs.writeFileSync(
      path.join(root, "scripts", "ops.ts"),
      "export const mode = 'spine-first';\n",
    );
    fs.writeFileSync(path.join(root, "lib", "core.ts"), "export const scope = 'baseline';\n");
    fs.writeFileSync(path.join(root, "__tests__", "core.test.ts"), "expect(true).toBe(true);\n");

    const report = scanTerminologyLint(root);
    expect(report.markerIssues).toEqual([]);
    expect(report.violations).toEqual([]);
  });
});
