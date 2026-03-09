// @anchor interface:anchors.policy-config links=interface:anchors.package-api,invariant:anchors.root-docs-policy,doc:governance.anchors-spec,doc:governance.terminology,test:anchors.root-docs-contract note="N1Hub anchor governance policy, scope, and architecture spine configuration."
function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export const ANCHOR_ARTIFACT_FILES = [
  "docs/anchors.index.json",
  "docs/ANCHOR_MAP.md",
  "docs/ANCHOR_GRAPH.mermaid",
] as const;

export const ROOT_DOC_FILES = ["README.md", "AGENTS.md", "CODEX.md"] as const;

export const INSTRUCTION_SURFACE_FILES = [
  ...ROOT_DOC_FILES,
  "SOUL.md",
  "MEMORY.md",
  "TOOLS.md",
  "WORKFLOW.md",
  "NINFINITY_WORKFLOW.md",
] as const;

export const GOVERNANCE_DOC_FILES = [
  "docs/ANCHORS_SPEC.md",
  "docs/TERMINOLOGY.md",
  "docs/ANCHOR_NAMING_GRAMMAR.md",
  "docs/ANCHOR_GOVERNANCE_PATTERNS.md",
  "docs/ANCHOR_RISK_REGISTER.md",
] as const;

export const REFERENCE_DOC_FILES = [
  "docs/validator.md",
  "docs/a2c.md",
  "docs/symphony.md",
  "docs/projects.md",
  "docs/real-dream-diff.md",
  "docs/openclaw-fork.md",
  "docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md",
] as const;

export const ARCHITECTURE_BOUNDARY_FILES = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/api/validate/route.ts",
  "lib/validator/index.ts",
  "lib/validator/core.ts",
  "lib/a2c/index.ts",
  "lib/a2c/recon.ts",
  "lib/symphony/index.ts",
  "lib/symphony/prompt.ts",
  "lib/graph/capsuleGraph.ts",
  "scripts/validate-cli.ts",
  "scripts/generate-validate-openapi.ts",
] as const;

export const ANCHOR_LIBRARY_FILES = [
  "lib/anchors/index.ts",
  "lib/anchors/config.ts",
  "lib/anchors/core.ts",
  "lib/anchors/root-docs.ts",
  "lib/anchors/metrics.ts",
  "lib/anchors/intelligence.ts",
  "lib/anchors/scorecard.ts",
  "lib/anchors/usage-lint.ts",
  "lib/anchors/terminology-lint.ts",
  "lib/anchors/snapshot.ts",
  "lib/anchors/assert-scorecard.ts",
] as const;

export const ANCHOR_SCRIPT_FILES = [
  "scripts/extract-anchors.ts",
  "scripts/validate-anchors.ts",
  "scripts/verify-root-docs.ts",
  "scripts/analyze-coverage.ts",
  "scripts/report-kpis.ts",
  "scripts/anchors-intelligence.ts",
  "scripts/anchors-scorecard.ts",
  "scripts/assert-scorecard.ts",
  "scripts/lint-anchors-usage.ts",
  "scripts/terminology-lint.ts",
  "scripts/anchors-snapshot.ts",
] as const;

export const GOVERNED_APP_ENTRYPOINT_FILES = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/api/validate/route.ts",
] as const;

export const SPINE_FILES = [
  "README.md",
  "docs/ANCHORS_SPEC.md",
  "app/layout.tsx",
  "app/api/validate/route.ts",
  "lib/validator/core.ts",
  "lib/a2c/index.ts",
  "lib/symphony/index.ts",
  "lib/graph/capsuleGraph.ts",
] as const;

export const SPINE_CHAIN = [
  "arch:repo.entrypoint",
  "arch:governance.anchor-spec",
  "arch:app.root-layout",
  "arch:api.validate.route",
  "arch:validator.engine",
  "arch:a2c.runtime",
  "arch:symphony.runtime",
  "arch:graph.runtime",
] as const;

export const ROOT_DOC_REQUIRED_COMMANDS = [
  "extract:anchors",
  "validate:anchors",
  "verify:root-docs",
  "test:anchors",
  "typecheck",
  "anchors:coverage",
  "anchors:kpis",
  "anchors:intelligence",
  "anchors:scorecard",
  "anchors:assert-scorecard",
  "anchors:lint-usage",
  "terminology:lint",
  "anchors:snapshot",
  "check:anchors",
  "check:anchors:full",
] as const;

export const ROOT_DOC_REQUIRED_MENTIONS = {
  readme: [
    "AGENTS.md",
    "CODEX.md",
    "SOUL.md",
    "MEMORY.md",
    "TOOLS.md",
    "WORKFLOW.md",
    "NINFINITY_WORKFLOW.md",
    "docs/ANCHORS_SPEC.md",
    "docs/TERMINOLOGY.md",
    "docs/ANCHOR_NAMING_GRAMMAR.md",
    "docs/ANCHOR_GOVERNANCE_PATTERNS.md",
    "docs/ANCHOR_RISK_REGISTER.md",
    "docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md",
  ],
  agents: [
    "README.md",
    "CODEX.md",
    "SOUL.md",
    "MEMORY.md",
    "TOOLS.md",
    "WORKFLOW.md",
    "NINFINITY_WORKFLOW.md",
    "docs/ANCHORS_SPEC.md",
    "docs/TERMINOLOGY.md",
    "docs/ANCHOR_NAMING_GRAMMAR.md",
    "docs/ANCHOR_GOVERNANCE_PATTERNS.md",
    "docs/ANCHOR_RISK_REGISTER.md",
    "docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md",
  ],
  codex: [
    "README.md",
    "AGENTS.md",
    "SOUL.md",
    "MEMORY.md",
    "TOOLS.md",
    "WORKFLOW.md",
    "NINFINITY_WORKFLOW.md",
    "docs/ANCHORS_SPEC.md",
    "docs/TERMINOLOGY.md",
    "docs/ANCHOR_NAMING_GRAMMAR.md",
    "docs/ANCHOR_GOVERNANCE_PATTERNS.md",
    "docs/ANCHOR_RISK_REGISTER.md",
    "docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md",
  ],
} as const;

export const GOVERNED_TARGET_FILES = uniqueSorted([
  ...INSTRUCTION_SURFACE_FILES,
  ...GOVERNANCE_DOC_FILES,
  ...REFERENCE_DOC_FILES,
  ...ARCHITECTURE_BOUNDARY_FILES,
  ...ANCHOR_LIBRARY_FILES,
  ...ANCHOR_SCRIPT_FILES,
  "vitest.anchors.config.ts",
]);

export const USAGE_LINT_TARGET_FILES = uniqueSorted([
  ...INSTRUCTION_SURFACE_FILES,
  ...GOVERNANCE_DOC_FILES,
  "docs/openclaw-fork.md",
  ".github/workflows/validate-capsules.yml",
]);

export const TERMINOLOGY_LINT_EXPLICIT_FILES = uniqueSorted([
  ...INSTRUCTION_SURFACE_FILES,
  "docs/ANCHORS_SPEC.md",
  "docs/ANCHOR_NAMING_GRAMMAR.md",
  "docs/ANCHOR_GOVERNANCE_PATTERNS.md",
  "docs/ANCHOR_RISK_REGISTER.md",
  "docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md",
  ...ANCHOR_SCRIPT_FILES.filter((file) => file !== "scripts/terminology-lint.ts"),
  "vitest.anchors.config.ts",
  ".github/workflows/validate-capsules.yml",
]);

export const TERMINOLOGY_LINT_SCAN_DIRS = [
  "lib/anchors",
  "__tests__/anchors",
] as const;

export const CI_WORKFLOW_PATHS = [
  ".github/workflows/validate-capsules.yml",
] as const;
