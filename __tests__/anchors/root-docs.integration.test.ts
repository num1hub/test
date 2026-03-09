// @anchor test:anchors.root-docs-contract links=test:anchors.scorecard-contract,test:anchors.core-contract,invariant:anchors.root-docs-policy,script:verify.root-docs note="Integration tests for the N1Hub root-doc triad policy."
import { describe, expect, it } from "vitest";

import {
  extractMarkdownAnchorIds,
  extractNpmRunCommands,
  validateRootDocsBundle,
} from "@/lib/anchors/root-docs";

const TOKEN = "anchor";

function createValidBundle() {
  return {
    readme: [
      `<!-- @${TOKEN} doc:n1hub.readme links=doc:n1hub.agents,doc:n1hub.codex,doc:n1hub.soul,doc:n1hub.memory,doc:n1hub.tools,doc:workflow.issue-worker,doc:workflow.ninfinity-night-shift,doc:governance.anchors-spec -->`,
      "# N1Hub",
      "See AGENTS.md, CODEX.md, SOUL.md, MEMORY.md, TOOLS.md, WORKFLOW.md, NINFINITY_WORKFLOW.md, docs/ANCHORS_SPEC.md, docs/TERMINOLOGY.md, docs/ANCHOR_NAMING_GRAMMAR.md, docs/ANCHOR_GOVERNANCE_PATTERNS.md, docs/ANCHOR_RISK_REGISTER.md, and docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md.",
      "Run npm run extract:anchors, npm run validate:anchors, npm run verify:root-docs, npm run test:anchors, npm run typecheck, npm run anchors:coverage, npm run anchors:kpis, npm run anchors:intelligence, npm run anchors:scorecard, npm run anchors:assert-scorecard, npm run anchors:lint-usage, npm run terminology:lint, npm run anchors:snapshot, npm run check:anchors, and npm run check:anchors:full.",
    ].join("\n"),
    agents: [
      `<!-- @${TOKEN} doc:n1hub.agents links=doc:n1hub.readme,doc:n1hub.codex,doc:n1hub.soul,doc:n1hub.memory,doc:n1hub.tools,doc:governance.anchors-spec -->`,
      "# N1Hub Agent Guide",
      "Refer to README.md, CODEX.md, SOUL.md, MEMORY.md, TOOLS.md, WORKFLOW.md, NINFINITY_WORKFLOW.md, docs/ANCHORS_SPEC.md, docs/TERMINOLOGY.md, docs/ANCHOR_NAMING_GRAMMAR.md, docs/ANCHOR_GOVERNANCE_PATTERNS.md, docs/ANCHOR_RISK_REGISTER.md, and docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md.",
      "Mandatory command surface: npm run extract:anchors, npm run validate:anchors, npm run verify:root-docs, npm run test:anchors, npm run typecheck, npm run anchors:coverage, npm run anchors:kpis, npm run anchors:intelligence, npm run anchors:scorecard, npm run anchors:assert-scorecard, npm run anchors:lint-usage, npm run terminology:lint, npm run anchors:snapshot, npm run check:anchors, and npm run check:anchors:full.",
    ].join("\n"),
    codex: [
      `<!-- @${TOKEN} doc:n1hub.codex links=doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.soul,doc:n1hub.memory,doc:n1hub.tools,doc:governance.anchors-spec -->`,
      "# N1Hub Codex Charter",
      "See README.md, AGENTS.md, SOUL.md, MEMORY.md, TOOLS.md, WORKFLOW.md, NINFINITY_WORKFLOW.md, docs/ANCHORS_SPEC.md, docs/TERMINOLOGY.md, docs/ANCHOR_NAMING_GRAMMAR.md, docs/ANCHOR_GOVERNANCE_PATTERNS.md, docs/ANCHOR_RISK_REGISTER.md, and docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md.",
      "Gate: npm run extract:anchors.",
      "Gate: npm run validate:anchors.",
      "Gate: npm run verify:root-docs.",
      "Gate: npm run test:anchors.",
      "Gate: npm run typecheck.",
      "Gate: npm run check:anchors:full.",
    ].join("\n"),
  };
}

describe("root docs validation", () => {
  it("extracts markdown anchor ids", () => {
    const source = [
      `<!-- @${TOKEN} doc:n1hub.readme -->`,
      `<!-- @${TOKEN} doc:n1hub.agents -->`,
    ].join("\n");

    expect(extractMarkdownAnchorIds(source)).toEqual([
      "doc:n1hub.readme",
      "doc:n1hub.agents",
    ]);
  });

  it("extracts npm run commands", () => {
    const source = "npm run extract:anchors && npm run validate:anchors";
    expect(extractNpmRunCommands(source)).toEqual([
      "extract:anchors",
      "validate:anchors",
    ]);
  });

  it("passes for a complete root docs triad", () => {
    const result = validateRootDocsBundle(createValidBundle());
    expect(result.errors).toEqual([]);
  });

  it("fails when a required root-doc anchor is missing", () => {
    const bundle = createValidBundle();
    bundle.codex = bundle.codex.replace("doc:n1hub.codex", "doc:n1hub.codex.missing");

    const result = validateRootDocsBundle(bundle);
    expect(
      result.errors.some((error) => error.includes("doc:n1hub.codex")),
    ).toBe(true);
  });

  it("fails when required command references are absent", () => {
    const bundle = createValidBundle();
    bundle.readme = bundle.readme.replace("npm run verify:root-docs, ", "");
    bundle.agents = bundle.agents.replace("npm run verify:root-docs, ", "");
    bundle.codex = bundle.codex.replace("Gate: npm run verify:root-docs.", "");

    const result = validateRootDocsBundle(bundle);
    expect(
      result.errors.some((error) => error.includes("verify:root-docs")),
    ).toBe(true);
  });
});
