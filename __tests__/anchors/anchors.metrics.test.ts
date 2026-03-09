// @anchor test:anchors.metrics-contract links=test:anchors.core-contract,test:anchors.intelligence-contract,interface:anchors.metrics-api note="Contract tests for governed coverage and KPI metric computation."
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { Anchor } from "@/lib/anchors/core";
import { computeCoverageReport, computeKpiReport } from "@/lib/anchors/metrics";

function makeTempProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anchors-kit-"));
  fs.mkdirSync(path.join(dir, "docs"), { recursive: true });
  fs.mkdirSync(path.join(dir, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.mkdirSync(path.join(dir, "app"), { recursive: true });
  fs.writeFileSync(path.join(dir, "README.md"), "# Toolkit\n");
  fs.writeFileSync(path.join(dir, "docs", "ANCHORS_SPEC.md"), "# Spec\n");
  fs.writeFileSync(path.join(dir, "src", "index.ts"), "export const entry = true;\n");
  fs.writeFileSync(
    path.join(dir, "scripts", "extract-anchors.ts"),
    "export const cli = true;\n",
  );
  fs.writeFileSync(path.join(dir, "src", "dark-matter.ts"), "export const x = 1;\n");
  fs.writeFileSync(path.join(dir, "app", "page.tsx"), "export default function Page() { return null; }\n");
  return dir;
}

describe("anchors metrics", () => {
  it("computes coverage summary and dark matter list for explicit governed targets", () => {
    const rootDir = makeTempProject();
    const anchors: Anchor[] = [
      {
        id: "arch:repo.entrypoint",
        category: "arch",
        name: "repo.entrypoint",
        file: "README.md",
        line: 1,
        links: ["arch:governance.anchor-spec"],
        state: "active",
        note: "",
      },
      {
        id: "arch:governance.anchor-spec",
        category: "arch",
        name: "governance.anchor-spec",
        file: "docs/ANCHORS_SPEC.md",
        line: 1,
        links: ["script:extract.anchors"],
        state: "active",
        note: "",
      },
      {
        id: "script:extract.anchors",
        category: "script",
        name: "extract.anchors",
        file: "scripts/extract-anchors.ts",
        line: 1,
        links: ["arch:repo.entrypoint"],
        state: "active",
        note: "",
      },
    ];

    const report = computeCoverageReport(rootDir, anchors, [
      "README.md",
      "docs/ANCHORS_SPEC.md",
      "scripts/extract-anchors.ts",
      "src/dark-matter.ts",
    ]);
    expect(report.summary.totalFiles).toBe(4);
    expect(report.summary.anchoredFiles).toBe(3);
    expect(report.darkMatter.some((item) => item.file === "src/dark-matter.ts")).toBe(
      true,
    );
  });

  it("computes kpi report and treats missing app entrypoints as satisfied", () => {
    const rootDir = makeTempProject();
    const anchors: Anchor[] = [
      {
        id: "arch:repo.entrypoint",
        category: "arch",
        name: "repo.entrypoint",
        file: "README.md",
        line: 1,
        links: ["arch:governance.anchor-spec"],
        state: "active",
        note: "",
      },
      {
        id: "arch:governance.anchor-spec",
        category: "arch",
        name: "governance.anchor-spec",
        file: "docs/ANCHORS_SPEC.md",
        line: 1,
        links: ["arch:validator.engine"],
        state: "active",
        note: "",
      },
      {
        id: "arch:validator.engine",
        category: "arch",
        name: "validator.engine",
        file: "src/index.ts",
        line: 1,
        links: ["arch:repo.entrypoint"],
        state: "active",
        note: "",
      },
    ];

    const report = computeKpiReport({
      rootDir,
      anchors,
      spineChain: [
        "arch:repo.entrypoint",
        "arch:governance.anchor-spec",
        "arch:validator.engine",
      ],
      spineFiles: ["README.md", "docs/ANCHORS_SPEC.md", "src/index.ts"],
      ciText: "npm run validate:anchors --if-present",
      appEntrypoints: [],
    });

    expect(report.anchorCount).toBe(3);
    expect(report.appEntrypointCount).toBe(0);
    expect(report.appEntrypointsWithAnchorPct).toBe(1);
    expect(report.spineHeaderCoveragePct).toBe(100);
    expect(report.ciOptionalSteps).toContain("validate:anchors");
  });

  it("ignores transient node_modules_stale directories in coverage", () => {
    const rootDir = makeTempProject();
    const staleDir = path.join(rootDir, "node_modules_stale_123");
    fs.mkdirSync(path.join(staleDir, "pkg"), { recursive: true });
    fs.writeFileSync(
      path.join(staleDir, "pkg", "shadow.ts"),
      "export const stale = true;\n",
    );

    const anchors: Anchor[] = [
      {
        id: "arch:validator.engine",
        category: "arch",
        name: "validator.engine",
        file: "src/index.ts",
        line: 1,
        links: [],
        state: "active",
        note: "",
      },
      {
        id: "script:extract.anchors",
        category: "script",
        name: "extract.anchors",
        file: "scripts/extract-anchors.ts",
        line: 1,
        links: [],
        state: "active",
        note: "",
      },
    ];

    const report = computeCoverageReport(rootDir, anchors);
    expect(report.summary.totalFiles).toBe(4);
    expect(report.darkMatter.some((item) => item.file === "src/dark-matter.ts")).toBe(
      true,
    );
  });
});
