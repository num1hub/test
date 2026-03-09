// @anchor test:anchors.core-contract links=test:anchors.metrics-contract,test:anchors.root-docs-contract,interface:anchors.core-api,interface:anchors.package-api,script:validate.anchors note="Contract tests for core anchor parsing and validation."
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  CAT_RE,
  NAME_RE,
  extractAnchorsFromText,
  getChainErrors,
  headerThreshold,
  isCommentAnchorLine,
  isMapFresh,
  parseMeta,
  renderAnchorGraphMermaid,
  renderAnchorMap,
  scanAnchors,
  validateAnchors,
} from "@/lib/anchors/core";

const TOKEN = "anchor";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "anchors-core-"));
}

function createAnchor(
  overrides: Partial<{
    id: string;
    category: string;
    name: string;
    file: string;
    line: number;
    links: string[];
    state: "active" | "experimental" | "deprecated";
    note: string;
  }> = {},
) {
  return {
    id: "arch:default",
    category: "arch",
    name: "default",
    file: "src/default.ts",
    line: 1,
    links: [] as string[],
    state: "active" as const,
    note: "",
    ...overrides,
  };
}

describe("anchor core", () => {
  it("parses metadata fields", () => {
    const meta = parseMeta('links=doc:beta,flow:gamma state=experimental note="hello"');
    expect(meta.links).toEqual(["doc:beta", "flow:gamma"]);
    expect(meta.state).toBe("experimental");
    expect(meta.note).toBe("hello");
  });

  it("enforces category and name regex contracts", () => {
    expect(CAT_RE.test("arch")).toBe(true);
    expect(CAT_RE.test("Arch")).toBe(false);
    expect(NAME_RE.test("core.loader")).toBe(true);
    expect(NAME_RE.test("bad_name")).toBe(false);
  });

  it("extracts markers from TS comments", () => {
    const text = `// @${TOKEN} arch:core.links links=doc:spec state=active`;
    const anchors = extractAnchorsFromText("src/core.ts", text);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]?.id).toBe("arch:core.links");
  });

  it("ignores fenced markdown code blocks", () => {
    const markdown = [
      "```ts",
      `// @${TOKEN} arch:inside.fence`,
      "```",
      `<!-- @${TOKEN} doc:outside -->`,
    ].join("\n");

    const anchors = extractAnchorsFromText("docs/spec.md", markdown);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]?.id).toBe("doc:outside");
  });

  it("checks comment-line requirements by extension", () => {
    expect(isCommentAnchorLine(`// @${TOKEN} arch:test`, ".ts")).toBe(true);
    expect(isCommentAnchorLine(`<!-- @${TOKEN} doc:test -->`, ".md")).toBe(true);
    expect(isCommentAnchorLine(`const x = "@${TOKEN} arch:test";`, ".ts")).toBe(false);
    expect(isCommentAnchorLine(`@${TOKEN} doc:test`, ".md")).toBe(false);
  });

  it("reports missing chain edges", () => {
    const chain = ["arch:first", "arch:second"];
    const byId = new Map([
      ["arch:first", { links: [] as string[] }],
      ["arch:second", { links: [] as string[] }],
    ]);

    const errors = getChainErrors(chain, byId);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("must link");
  });

  it("validates duplicate IDs and broken links", () => {
    const anchors = [
      createAnchor({ id: "arch:alpha", name: "alpha", links: ["doc:missing"] }),
      createAnchor({ id: "arch:alpha", name: "alpha-dup", file: "src/dup.ts" }),
    ];
    const result = validateAnchors(anchors);

    expect(result.errors.some((entry) => entry.includes("Duplicate anchor id"))).toBe(
      true,
    );
    expect(result.errors.some((entry) => entry.includes("Broken link"))).toBe(true);
  });

  it("renders map links relative to docs and supports freshness checks", () => {
    const anchors = [
      createAnchor({
        id: "arch:alpha",
        name: "alpha",
        file: "src/alpha.ts",
        line: 5,
        links: ["doc:beta"],
      }),
      createAnchor({
        id: "doc:beta",
        category: "doc",
        name: "beta",
        file: "docs/BETA.md",
        line: 2,
        links: ["arch:alpha"],
      }),
    ];

    const map = renderAnchorMap(anchors);
    expect(map).toContain("](../src/alpha.ts#L5)");
    expect(map).toContain("](BETA.md#L2)");
    expect(isMapFresh(map, anchors)).toBe(true);
    expect(isMapFresh(`${map}\nextra`, anchors)).toBe(false);
  });

  it("renders deterministic mermaid graph edges", () => {
    const anchors = [
      createAnchor({
        id: "arch:alpha",
        name: "alpha",
        file: "src/alpha.ts",
        line: 5,
        links: ["doc:beta"],
      }),
      createAnchor({
        id: "doc:beta",
        category: "doc",
        name: "beta",
        file: "docs/BETA.md",
        line: 2,
        links: ["arch:alpha"],
      }),
    ];

    const graph = renderAnchorGraphMermaid(anchors);
    expect(graph).toContain("graph TD");
    expect(graph).toContain("A_arch_alpha --> A_doc_beta");
    expect(graph).toContain("A_doc_beta --> A_arch_alpha");
  });

  it("computes clamped header thresholds", () => {
    expect(headerThreshold(10)).toBe(15);
    expect(headerThreshold(100)).toBe(15);
    expect(headerThreshold(400)).toBe(50);
  });

  it("ignores transient node_modules_stale directories during scan", () => {
    const rootDir = makeTempRoot();
    fs.mkdirSync(path.join(rootDir, "src"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "node_modules_stale_999", "pkg"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(rootDir, "src", "keep.ts"),
      `// @${TOKEN} arch:keep links=doc:ref\n`,
    );
    fs.writeFileSync(
      path.join(rootDir, "node_modules_stale_999", "pkg", "drop.ts"),
      `// @${TOKEN} arch:drop links=doc:ref\n`,
    );

    const anchors = scanAnchors({ rootDir });
    expect(anchors.map((anchor) => anchor.id)).toEqual(["arch:keep"]);
    expect(anchors.map((anchor) => anchor.file)).toEqual(["src/keep.ts"]);

    fs.rmSync(rootDir, { recursive: true, force: true });
  });
});
