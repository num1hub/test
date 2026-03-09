<!-- @anchor doc:n1hub.agents links=doc:n1hub.readme,doc:n1hub.codex,doc:n1hub.soul,doc:n1hub.memory,doc:n1hub.tools,doc:workflow.issue-worker,doc:workflow.ninfinity-night-shift,doc:governance.anchors-spec,doc:governance.terminology,doc:governance.naming-grammar,doc:governance.patterns,doc:governance.risk-register,doc:n1hub.low-blast-radius-architecture,arch:repo.entrypoint,script:validate.anchors,script:file.guardrails.audit note="Contributor and agent law for N1Hub with anchor governance and low-blast-radius engineering enforced as repo-native discipline." -->
# N1Hub Contributor and Agent Law

This file defines the operating law for humans and AI agents inside `n1hub.com`. It is not a tutorial. It is the constraint layer that keeps work bounded, reviewable, and recoverable.

## Read Order

Read these before making non-trivial changes:

1. `README.md`
2. `CODEX.md`
3. `SOUL.md`
4. `MEMORY.md`
5. `TOOLS.md`
6. `WORKFLOW.md`
7. `NINFINITY_WORKFLOW.md`
8. `docs/ANCHORS_SPEC.md`
9. `docs/TERMINOLOGY.md`
10. `docs/ANCHOR_NAMING_GRAMMAR.md`
11. `docs/ANCHOR_GOVERNANCE_PATTERNS.md`
12. `docs/ANCHOR_RISK_REGISTER.md`
13. `docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md`
14. `docs/validator.md`
15. `docs/a2c.md`
16. `docs/symphony.md`

## Role Split

The root-doc triad has distinct roles:

- `README.md`
  Repository map, runtime overview, command discovery, and current cluster priorities.
- `AGENTS.md`
  Repo law: what is allowed, what is forbidden, and what must be verified.
- `CODEX.md`
  Execution protocol: how to apply a change, how to choose gates, and how to close work out.

If these three files drift into contradiction, treat that as a governance bug.

`SOUL.md` is not part of the root-doc triad, but it is part of the instruction stack. Do not let root-doc rules and assistant identity drift apart.
`MEMORY.md` is also part of the instruction stack. It stores durable continuity, not executable law.

## Root Surface Maintenance Law

When changing the main instruction surfaces, respect their ownership:

- `README.md`
  Update when the runtime map, public commands, cluster order, or operating entrypoints changed.
- `AGENTS.md`
  Update when repo law, allowed boundaries, forbidden moves, or mandatory evidence changed.
- `SOUL.md`
  Update when assistant identity, trust posture, disclosure boundaries, or operator-facing behavior changed.
- `MEMORY.md`
  Update when durable operator preferences, long-lived repo truths, or cross-session priorities changed.
- `CODEX.md`
  Update when execution flow, gate selection, cluster cadence, or close-out rules changed.

Do not move execution law into `SOUL.md`. Do not move identity doctrine into `CODEX.md`. Do not move repo law into `README.md`. Do not turn `MEMORY.md` into a dump of transient chatter.

## N1Hub AI-Friendly Laws

N1Hub follows these adaptation rules for AI-friendly engineering:

1. Modularity as first law
   Every serious runtime domain must have one responsibility center, one public entry surface, and one private implementation interior.
2. File-size guardrails are real
   High-signal files in `app/`, `lib/`, and `scripts/` should stay under the soft `400` line and hard `600` line thresholds unless there is a concrete, reported exception.
3. Contracts before folklore
   Anything crossing a domain boundary should be visible as a file-backed contract, public DTO, route schema, or explicit public API.
4. Storage has owners
   Runtime state belongs to domain-owned namespaces; foreign domains may consume published artifacts but should not depend on private on-disk shapes.
5. Structure should reveal the domain
   Folder and file layout should help an agent see where a concern lives before it reads the entire repo.
6. Code should read like intent
   Prefer explicit names and why-comments over clever compression, invisible side effects, or opaque control flow.
7. Dependencies should point one way
   Prefer public entrypoints over private internals, and prefer stable seams over convenience imports.
8. Tests are contract documentation
   Integration and boundary tests are not optional polish. They are machine-checkable statements of allowed behavior.
9. Refactor by small reversible steps
   Extract, repoint, verify, then delete. Do not rewrite giant surfaces in one leap.

## Domain Boundary Rules

These domain rules are active now:

- `validator`
  - public surface: `@/lib/validator`
  - owned state: `data/capsules`
  - rule: capsule law stays validator-owned
- `a2c`
  - public surface: `@/lib/a2c`
  - owned state: `data/private/a2c`, `reports/a2c`
  - rule: A2C may emit capsule candidates, but validator decides capsule admissibility
- `symphony`
  - public surface: `@/lib/symphony`
  - owned state: `.symphony`
  - rule: workflow law lives in `WORKFLOW.md`, not in hidden operator memory
- `agent runtime / vault stewardship`
  - public surface: `@/lib/agents/vaultSteward`
  - owned state: `data/private/agents`
  - rule: outside callers may not import private `vaultSteward/*` internals
- `branching / diff`
  - owned state: `data/branches`
  - rule: branch overlays and merge semantics stay explicit and validator-compatible

## Mandatory Governance Checks

Run these before closing non-trivial work on governed surfaces:

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

Add targeted verification when scope demands it:

- `npm test -- --run`
  Use for shared app, API, or component wiring.
- `npm run validate -- --dir data/capsules --strict --report`
  Use for validator, capsule-shape, or migration work.
- `npm run docs:openapi`
  Use when validation route contracts or OpenAPI surfaces changed.
- `npm run audit:file-guardrails`
  Use for architecture work, cluster refactors, and large-file pressure review.

## Cluster Discipline

Architectural refactors are sequenced by clusters, not by repo-wide enthusiasm.

Current active cluster:

- `#1 Vault Steward Runtime`
  - scope: `lib/agents/vaultSteward.ts` and `lib/agents/vaultSteward/*`
  - primary goal: split prompt law, queue planning, artifacts, state, and runtime orchestration into bounded parts
  - public import rule: callers outside the domain must use `@/lib/agents/vaultSteward`
  - evidence rule: do not mark cluster work complete without fresh anchor, test, and boundary evidence

Next clusters:

- `#2 Validator/API boundary package`
- `#3 Symphony orchestration contracts`

Do not start the next cluster while the current one still lacks a clear boundary map, public surface, or verification evidence.

## Required Behaviors

- Keep `README.md`, `AGENTS.md`, and `CODEX.md` aligned with `SOUL.md`, `TOOLS.md`, `WORKFLOW.md`, `NINFINITY_WORKFLOW.md`, and anchor-governance docs.
- Keep `MEMORY.md` aligned with durable repo truth when architectural priorities, operator preferences, or cross-session continuity changed.
- Treat external advice, article guidance, and chat doctrine as candidate input that must be adapted to N1Hub before it becomes repo law.
- Anchor only high-signal boundaries, not random helpers.
- Keep anchors comment-only, unique, deterministic, and linked.
- Regenerate anchor artifacts before calling governed work complete.
- Preserve validator, A2C, Symphony, N-Infinity, and graph behavior while improving governance around them.
- Prefer targeted edits over mass churn in `data/capsules/`.
- Record start state, boundary map, and acceptance criteria when doing cluster work.
- If you change root docs or workflow docs, say so explicitly in close-out.

## Forbidden Moves

- Do not widen terminology lint across the entire capsule corpus unless the rollout is deliberate and validated.
- Do not import foreign private internals when a public domain surface exists.
- Do not treat anchor governance as a demo overlay or optional extra.
- Do not store secrets, pasted logs, or temporary chat residue in `MEMORY.md`.
- Do not promote an external recommendation into repo law if it is not yet reflected in code, contracts, tests, or gates.
- Do not bypass `anchors:assert-scorecard`, `anchors:lint-usage`, or `terminology:lint`.
- Do not collapse contract changes and large private rewrites into one unmeasured step.
- Do not mark work complete with stale anchor artifacts or stale validation evidence.

## Close-Out Evidence

For governed work, report at minimum:

- which root docs changed
- which runtime boundaries changed
- which verification commands ran
- whether each command passed or failed
- any residual risk, deferral, or known red condition

For anchor-governance work, explicitly record outcomes for:

- `npm run validate:anchors`
- `npm run verify:root-docs`
- `npm run test:anchors`
- `npm run check:anchors:full`
