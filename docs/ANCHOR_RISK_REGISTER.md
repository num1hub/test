<!-- @anchor doc:governance.risk-register links=doc:governance.anchors-spec,doc:governance.naming-grammar,doc:governance.patterns,script:anchors.scorecard note="Current anchor-governance risk register for N1Hub." -->
# Anchor Governance Risk Register

| Risk | Trigger | Impact | Mitigation |
| --- | --- | --- | --- |
| Anchor spam | Anchors spread into low-value helpers | Map readability drops and graph semantics weaken | Restrict coverage to governed high-signal targets. |
| Broken links | Refactors move anchors or delete referenced IDs | Validation fails and navigation edges rot | Treat `npm run validate:anchors` as blocking. |
| Stale artifacts | Docs or code change without regeneration | Graph outputs drift from source reality | Run `npm run extract:anchors` and enforce freshness in CI. |
| Instruction-stack drift | `README.md`, `AGENTS.md`, `CODEX.md`, `SOUL.md`, `TOOLS.md`, or workflow docs diverge | Operators and agents read conflicting rules | Keep the triad and instruction stack cross-linked and verify `npm run verify:root-docs`. |
| Coverage-scope inflation | Governance expands to the whole repository by accident | Pointless churn, especially in `data/capsules/` | Keep governed targets explicit in `lib/anchors/config.ts`. |
| Terminology overreach | Restricted vocabulary is applied to the whole corpus | Unnecessary repo-wide edits and noise | Keep terminology lint scoped to governed anchor surfaces. |
| Scorecard false comfort | Thresholds stay misaligned with the scoped model | CI can pass while key surfaces drift | Review `anchor-governance.thresholds.json` when governed targets or spine rules change. |
