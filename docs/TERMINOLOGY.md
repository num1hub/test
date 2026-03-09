<!-- @anchor doc:governance.terminology links=doc:n1hub.readme,doc:n1hub.codex,doc:governance.anchors-spec,doc:governance.naming-grammar,script:anchors.terminology-lint note="Canonical anchor-governance terminology contract for N1Hub." -->
# Anchor Governance Terminology

This document defines the canonical vocabulary for the N1Hub anchor-governance layer.

The enforcement scope is intentionally narrow: root instruction surfaces, anchor-governance docs and scripts, `lib/anchors`, anchor tests, and the main validation workflow.

## Canonical Terms

| Term | Definition | Preferred Usage |
| --- | --- | --- |
| N1Hub Anchor Governance | The repo-native governance layer for anchors, docs, scripts, scorecards, and CI. | Use in overview and policy text. |
| Anchor | Deterministic marker that binds a boundary, contract, or policy node into the graph. | Use for a single `@anchor` record. |
| Architecture Spine | Ordered set of high-signal files that describe repository intent and runtime flow first. | Use for header coverage and chain policy. |
| Root Docs Triad | `README.md`, `AGENTS.md`, and `CODEX.md`. | Use for root-doc validation language. |
| Instruction Stack | The triad plus `SOUL.md`, `MEMORY.md`, `TOOLS.md`, `WORKFLOW.md`, and `NINFINITY_WORKFLOW.md`. | Use when discussing operator and agent guidance surfaces together. |
| Memory Surface | Curated markdown continuity layer for durable operator preferences, repo truths, and active priorities. | Use for `MEMORY.md` and similar long-lived context surfaces. |
| Governed Target | Explicit file covered by anchor coverage and dark-matter reporting. | Use for scoped coverage policy. |
| Governance Artifact | Generated machine-checked output such as the index, map, graph, coverage report, or scorecard. | Use when describing generated files. |
| Scorecard | Threshold evaluation result for the anchor graph and governed coverage metrics. | Use for pass/fail governance state. |
| Snapshot History | Append-only JSONL stream of scorecard summaries over time. | Use for `.anchors-history.jsonl`. |
| Thresholds File | JSON policy input for scorecard enforcement. | Use for `anchor-governance.thresholds.json`. |
| Usage Lint | Policy check that blocks fragile shell redirection for governance outputs. | Use for `anchors:lint-usage`. |

## Restricted Vocabulary

These terms are restricted inside the linted scope and should be replaced:

| Restricted Term | Replace With | Use Rule |
| --- | --- | --- |
| legacy | baseline, prior, or compatibility | Use a more specific phrase for compatibility or historical state. |
| heritage | baseline | Prefer `baseline` in active contracts. |
| donor | source snapshot | Use when referring to imported or upstream material. |
| autoupdate | automated update workflow | Use explicit automation wording. |

## Historical Quote Escape Hatch

Restricted terms are allowed only inside a historical quote block marked with both lines exactly:

- `<!-- terminology:historical-quote:start -->`
- `<!-- terminology:historical-quote:end -->`

Marker rules are strict:

1. Nested start markers are invalid.
2. End markers without a matching start are invalid.
3. Missing end markers are invalid and fail closed.

## Validation Command

```bash
npm run terminology:lint
```
