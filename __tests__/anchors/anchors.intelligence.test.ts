// @anchor test:anchors.intelligence-contract links=test:anchors.metrics-contract,test:anchors.scorecard-contract,interface:anchors.intelligence-api note="Contract tests for graph intelligence analytics."
import { describe, expect, it } from "vitest";

import type { Anchor } from "@/lib/anchors/core";
import { analyzeAnchorGraph } from "@/lib/anchors/intelligence";

const anchors: Anchor[] = [
  {
    id: "arch:a",
    category: "arch",
    name: "a",
    file: "src/a.ts",
    line: 1,
    links: ["arch:b"],
    state: "active",
    note: "",
  },
  {
    id: "arch:b",
    category: "arch",
    name: "b",
    file: "src/b.ts",
    line: 1,
    links: ["arch:a", "doc:c"],
    state: "active",
    note: "",
  },
  {
    id: "doc:c",
    category: "doc",
    name: "c",
    file: "docs/c.md",
    line: 1,
    links: [],
    state: "active",
    note: "",
  },
];

describe("anchors intelligence", () => {
  it("computes graph-level structural metrics", () => {
    const report = analyzeAnchorGraph(anchors);

    expect(report.anchorCount).toBe(3);
    expect(report.edgeCount).toBe(3);
    expect(report.brokenLinkCount).toBe(0);
    expect(report.zeroInboundCount).toBe(0);
    expect(report.weakComponentCount).toBe(1);
    expect(report.stronglyConnectedComponentCount).toBe(2);
    expect(report.largestStronglyConnectedComponentSize).toBe(2);
    expect(report.reciprocalEdgeRatio).toBe(0.667);
    expect(report.topOutDegree[0]?.id).toBe("arch:b");
    expect(report.topInDegree[0]?.id).toBe("arch:a");
  });
});
