// @anchor test:anchors.usage-lint-contract links=interface:anchors.usage-lint,script:anchors.lint-usage,test:anchors.assert-scorecard-contract note="Contract tests for fragile anchors JSON usage linting."
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectUsageLintTargets,
  findFragileUsageViolations,
  scanUsageLint,
} from "@/lib/anchors/usage-lint";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "anchors-usage-lint-"));
}

describe("anchors usage lint", () => {
  it("collects root-doc, docs, and workflow targets deterministically", () => {
    const root = makeTempRoot();
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
    fs.writeFileSync(path.join(root, "README.md"), "# Readme\n");
    fs.writeFileSync(path.join(root, "AGENTS.md"), "# Agents\n");
    fs.writeFileSync(path.join(root, "CODEX.md"), "# Codex\n");
    fs.writeFileSync(path.join(root, "docs", "A.md"), "doc\n");
    fs.writeFileSync(path.join(root, "docs", "z.md"), "doc\n");
    fs.writeFileSync(
      path.join(root, ".github", "workflows", "anchors-governance.yml"),
      "name: ci\n",
    );

    expect(collectUsageLintTargets(root)).toEqual([
      ".github/workflows/anchors-governance.yml",
      "AGENTS.md",
      "CODEX.md",
      "README.md",
      "docs/A.md",
      "docs/z.md",
    ]);
  });

  it("detects fragile npm redirection patterns with line numbers", () => {
    const text = [
      "npm run anchors:coverage > .anchors-coverage.json",
      "npm run anchors:intelligence",
      "npm run anchors:scorecard > .anchors-scorecard.json",
    ].join("\n");

    const violations = findFragileUsageViolations("README.md", text);
    expect(violations).toHaveLength(2);
    expect(violations[0]).toMatchObject({
      file: "README.md",
      line: 1,
      command: "anchors:coverage",
    });
    expect(violations[1]).toMatchObject({
      file: "README.md",
      line: 3,
      command: "anchors:scorecard",
    });
  });

  it("passes safe command usage without redirection", () => {
    const root = makeTempRoot();
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
    fs.writeFileSync(path.join(root, "README.md"), "npm run anchors:coverage\n");
    fs.writeFileSync(path.join(root, "AGENTS.md"), "npm run anchors:intelligence\n");
    fs.writeFileSync(path.join(root, "CODEX.md"), "npm run anchors:scorecard\n");
    fs.writeFileSync(path.join(root, "docs", "ops.md"), "npm run check:anchors:full\n");
    fs.writeFileSync(
      path.join(root, ".github", "workflows", "anchors-governance.yml"),
      "run: npm run check:anchors:full\n",
    );

    const report = scanUsageLint(root);
    expect(report.targets).toContain("README.md");
    expect(report.violations).toEqual([]);
  });
});
