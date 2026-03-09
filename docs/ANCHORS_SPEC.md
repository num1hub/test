<!-- @anchor arch:governance.anchor-spec links=doc:governance.anchors-spec,arch:app.root-layout,script:validate.anchors state=active note="Normative anchor-governance contract adapted to N1Hub architecture and instruction surfaces." -->
<!-- @anchor doc:governance.anchors-spec links=doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.codex,doc:n1hub.soul,doc:n1hub.memory,doc:n1hub.tools,doc:workflow.issue-worker,doc:workflow.ninfinity-night-shift,doc:governance.terminology,doc:governance.naming-grammar,doc:governance.patterns,doc:governance.risk-register,script:anchors.scorecard,script:anchors.lint-usage,script:anchors.terminology-lint,script:anchors.snapshot note="Normative specification for N1Hub anchor extraction, validation, scoring, and governance." -->
# N1Hub Anchor Governance Specification

## Scope

This specification governs anchor extraction, validation, reporting, scorecard evaluation, terminology enforcement, and snapshot history for `n1hub.com`.

It is deliberately scoped to N1Hub’s high-signal governance and architecture surfaces, not to the entire historical capsule corpus.

Related guidance:

- `docs/TERMINOLOGY.md`
- `docs/ANCHOR_NAMING_GRAMMAR.md`
- `docs/ANCHOR_GOVERNANCE_PATTERNS.md`
- `docs/ANCHOR_RISK_REGISTER.md`

## Anchor Model

- `id`: `<category>:<name>`
- `category`: `^[a-z][a-z0-9_-]*$`
- `name`: `^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$`
- `state`: `active | experimental | deprecated`
- `links`: outbound list of anchor IDs

## Syntax

In TS/JS files, anchors must be comments:

```ts
// @anchor category:name links=cat:other state=active note="optional"
```

In Markdown files, anchors must be HTML comments:

```md
<!-- @anchor category:name links=cat:other -->
```

## Extraction Rules

1. Traverse the repository deterministically.
2. Sort anchors by `id`, then `file`, then `line`.
3. Ignore Markdown fenced code blocks during extraction.
4. Exclude generated and transient directories such as `node_modules`, `dist`, `build`, `coverage`, and `node_modules_stale_*`.
5. Exclude generated anchor artifacts from extraction:
   - `docs/anchors.index.json`
   - `docs/ANCHOR_MAP.md`
   - `docs/ANCHOR_GRAPH.mermaid`
6. Emit generated artifacts:
   - `docs/anchors.index.json`
   - `docs/ANCHOR_MAP.md`
   - `docs/ANCHOR_GRAPH.mermaid`

## Validation Rules

1. Category, name, and state must be valid.
2. Anchor IDs must be globally unique.
3. All links must resolve to existing IDs.
4. Anchor lines must be comment anchors.
5. Generated artifacts must be fresh.
6. Spine chain continuity must hold.
7. Every configured spine file must expose an `arch` anchor inside its header zone.

## High-Signal Placement Policy

N1Hub does not try to anchor every source file.

Governed coverage is intentionally limited to explicit high-signal files in `lib/anchors/config.ts`, including:

- root instruction surfaces
- governance docs
- validator, A2C, Symphony, and graph boundary docs
- app root and validator API boundary
- validator, A2C, Symphony, and graph runtime files
- anchor governance library files and CLI scripts

Coverage and dark-matter reporting are therefore measured against the governed target set, not the whole repository tree.

## Spine Header Policy

`headerThreshold(totalLines) = min(50, max(15, ceil(totalLines * 0.15)))`

Every configured spine file must have at least one `arch` anchor inside the header zone.

Current spine:

- `README.md`
- `docs/ANCHORS_SPEC.md`
- `app/layout.tsx`
- `app/api/validate/route.ts`
- `lib/validator/core.ts`
- `lib/a2c/index.ts`
- `lib/symphony/index.ts`
- `lib/graph/capsuleGraph.ts`

Current spine chain:

- `arch:repo.entrypoint`
- `arch:governance.anchor-spec`
- `arch:app.root-layout`
- `arch:api.validate.route`
- `arch:validator.engine`
- `arch:a2c.runtime`
- `arch:symphony.runtime`
- `arch:graph.runtime`

## App Entrypoint Coverage Policy

App-entrypoint coverage is also explicit and scoped.

Current governed app entrypoints:

- `app/layout.tsx`
- `app/page.tsx`
- `app/api/validate/route.ts`

## Governance Commands

```bash
npm run extract:anchors
npm run validate:anchors
npm run verify:root-docs
npm run test:anchors
npm run typecheck
npm run anchors:coverage
npm run anchors:kpis
npm run anchors:intelligence
npm run anchors:scorecard
npm run anchors:assert-scorecard
npm run anchors:lint-usage
npm run terminology:lint
npm run anchors:snapshot
npm run check:anchors
npm run check:anchors:full
```

`npm run test:anchors` is bound to `vitest.anchors.config.ts` and executes only `__tests__/anchors/**/*.test.ts`.

## Scorecard Policy

Thresholds are loaded from `anchor-governance.thresholds.json`.

Current threshold values:

- `maxBrokenLinks: 0`
- `maxWeakComponents: 1`
- `maxZeroInboundAnchors: 0`
- `minCoveragePercent: 100`
- `minAppEntrypointCoveragePct: 1`
- `minSpineHeaderCoveragePct: 100`
- `minReciprocalEdgeRatio: 0.6`
- `minPassingScore: 95`

## Terminology Scope Policy

`npm run terminology:lint` is intentionally scoped to:

- `README.md`, `AGENTS.md`, `CODEX.md`, `SOUL.md`, `MEMORY.md`, `TOOLS.md`, `WORKFLOW.md`, `NINFINITY_WORKFLOW.md`
- anchor-governance docs
- anchor-governance scripts
- `lib/anchors/*`
- `__tests__/anchors/*`
- `.github/workflows/validate-capsules.yml`

It does not scan `data/capsules/` or the broader historical documentation corpus by default.

## Output Policy

- Generate JSON artifacts through script `--out` paths, not shell redirection.
- Treat `npm run anchors:assert-scorecard` as blocking.
- Treat `npm run anchors:lint-usage` as blocking.
- Treat `npm run terminology:lint` as blocking.
- Keep `.anchors-history.jsonl` append-only via `npm run anchors:snapshot`.
- Use `npm run check:anchors:full` as the authoritative anchor-governance gate.

## Root Docs Triad

The root docs triad is required:

- `README.md`
- `AGENTS.md`
- `CODEX.md`

It must stay coherent with the wider instruction stack:

- `SOUL.md`
- `MEMORY.md`
- `TOOLS.md`
- `WORKFLOW.md`
- `NINFINITY_WORKFLOW.md`
