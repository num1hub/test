<!-- @anchor arch:repo.entrypoint links=doc:n1hub.readme,arch:governance.anchor-spec,doc:validator.reference,doc:a2c.reference,doc:symphony.reference,doc:projects.reference,doc:branching.real-dream-diff note="Repository entrypoint and top-level runtime map for N1Hub." -->
<!-- @anchor doc:n1hub.readme links=doc:n1hub.agents,doc:n1hub.codex,doc:n1hub.soul,doc:n1hub.memory,doc:n1hub.tools,doc:workflow.issue-worker,doc:workflow.ninfinity-night-shift,doc:governance.anchors-spec,doc:governance.terminology,doc:governance.naming-grammar,doc:governance.patterns,doc:governance.risk-register,doc:n1hub.low-blast-radius-architecture,doc:openclaw.fork-notes,script:extract.anchors,script:validate.anchors,script:verify.root-docs,script:file.guardrails.audit note="Repository overview, instruction stack map, and primary command surface for N1Hub." -->
# N1Hub Vault

N1Hub Vault is a Next.js App Router application for managing CapsuleOS knowledge capsules with validator-governed storage, branch overlays, AI-assisted ingestion, workflow automation, and autonomous maintenance lanes.

## Read Order

Read the repo in this order:

1. `README.md`
   This file explains what the repository is, where the main runtime domains live, and which command surfaces matter.
2. `AGENTS.md`
   Repo law for humans and AI agents: boundaries, prohibitions, verification, and close-out requirements.
3. `CODEX.md`
   Execution protocol: how to implement, verify, and report work without widening blast radius.
4. `SOUL.md`
   Identity and behavioral spine for user-facing intelligence.
5. `MEMORY.md`
   Durable working memory for stable operator preferences, active architectural priorities, and other cross-session continuity.
6. `TOOLS.md`
   Local runtime and environment notes.
7. `WORKFLOW.md`
   Repo-owned Symphony workflow contract.
8. `NINFINITY_WORKFLOW.md`
   Night-shift workflow contract for capsule-oriented automation.
9. `docs/ANCHORS_SPEC.md`
10. `docs/TERMINOLOGY.md`
11. `docs/ANCHOR_NAMING_GRAMMAR.md`
12. `docs/ANCHOR_GOVERNANCE_PATTERNS.md`
13. `docs/ANCHOR_RISK_REGISTER.md`
14. `docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md`

## Root Surface Roles

The main instruction surfaces are complementary, not interchangeable:

- `README.md`
  Repository map, runtime overview, command discovery, and current cluster priorities.
- `AGENTS.md`
  Repo law for humans and AI agents: boundaries, prohibitions, and mandatory evidence.
- `SOUL.md`
  Identity, trust posture, and behavioral spine for the intelligence layer that speaks to operators.
- `MEMORY.md`
  Durable cross-session memory for stable repo truths, operator preferences, and active priorities.
- `CODEX.md`
  Execution charter: how to make changes without widening blast radius.

If these surfaces drift into contradiction, treat that as an operational bug.

## AI-Friendly Operating Law

N1Hub is being shaped around low-blast-radius, AI-friendly engineering. The point is not cosmetic neatness. The point is to keep every change bounded, legible, and recoverable even when the actor has partial context.

The current law is:

- build real runtime capsules instead of relying on soft folder conventions
- give each major domain one public entry surface
- keep contracts file-backed and reviewable
- treat storage as domain-owned namespaces
- forbid casual private cross-domain imports
- keep high-signal code readable enough to fit in working context
- use tests as machine-readable boundary documentation
- refactor in small reversible steps instead of giant rewrites

Architecture doctrine: [`docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md`](docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md)

Golden-path rule: when a safe public command, workflow file, or domain entry surface already exists, use it instead of inventing ad hoc execution paths.

## Runtime Map

The main N1Hub runtime domains and their public surfaces are:

- `validator`
  - code: `lib/validator`
  - routes: `app/api/validate/*`
  - scripts: `scripts/validate-cli.ts`, `scripts/generate-validate-openapi.ts`
  - role: validator-owned capsule law and promotion gate
- `a2c`
  - code: `lib/a2c`
  - scripts: `scripts/a2c/*`
  - role: Anything-to-Capsules runtime, ingest, recon, synthesis, and emission
- `symphony`
  - code: `lib/symphony`
  - scripts: `scripts/symphony.ts`
  - docs: `WORKFLOW.md`
  - role: issue and workflow orchestration runtime
- `agent runtime / vault stewardship`
  - code: `lib/agents/vaultSteward.ts`, `lib/agents/vaultSteward/*`
  - public entry: `@/lib/agents/vaultSteward`
  - scripts: `scripts/vault-steward.ts`
  - role: bounded autonomous vault maintenance and queue discipline
- `graph`
  - code: `lib/graph`
  - role: graph projection and runtime navigation
- `branching / diff`
  - code: `lib/diff`
  - routes: `POST /api/diff`, `POST /api/diff/apply`
  - docs: [`docs/real-dream-diff.md`](docs/real-dream-diff.md)
- `projects`
  - docs: [`docs/projects.md`](docs/projects.md)
  - role: project-oriented projection of capsule graph state

Owned storage is also part of the architecture:

- `data/capsules` belongs to validator and vault discipline
- `data/private/a2c` and `reports/a2c` belong to A2C
- `.symphony` belongs to Symphony runtime
- `data/private/agents` belongs to agent-runtime orchestration
- `data/branches` belongs to branch overlay state

## Current Cluster Priorities

N1Hub is not trying to refactor everything at once. Architectural work is sequenced by clusters.

1. `#1 Vault Steward Runtime`
   - active cluster
   - goal: keep prompt construction, queue planning, schemas, and runtime orchestration from collapsing into one god-file
   - public rule: external callers must use `@/lib/agents/vaultSteward`
2. `#2 Validator/API boundary package`
   - target: `app/api/validate`, `lib/validator`, `scripts/validate-cli.ts`, `scripts/generate-validate-openapi.ts`
   - goal: keep validator-owned contracts explicit and stable
3. `#3 Symphony orchestration contracts`
   - target: `lib/symphony`, `WORKFLOW.md`, `scripts/symphony.ts`
   - goal: separate workflow law, prompt rendering, tracker logic, and runtime execution

Cluster rule: one cluster at a time, verified end-to-end, then the next.

## Living Governance Surfaces

N1Hub treats its root instruction surfaces as living, but not free-form:

- `README.md` should track actual runtime domains, public entrypoints, command surfaces, and current cluster status.
- `AGENTS.md` should track active repo law and only change when that law is real, explicit, and enforceable.
- `SOUL.md` should describe operator-facing identity and trust posture, not hide execution rules that belong elsewhere.
- `MEMORY.md` should carry durable continuity, not transient conversation residue or secret material.
- `CODEX.md` should describe the execution protocol that is actually expected in the repo.

External articles, chats, and best-practice lists are inputs, not law. Adapt them to N1Hub reality before promoting them into these files.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Core Verification

Baseline runtime verification:

```bash
npm test -- --run
npm run typecheck
npm run validate -- --dir data/capsules --strict --report
```

Architecture and file-size audit:

```bash
npm run audit:file-guardrails
npm run check:file-guardrails:hard
```

## Anchor Governance

N1Hub carries repo-native anchor governance over root docs, governance docs, app root, validator boundaries, A2C runtime, Symphony runtime, graph runtime, and governance scripts.

Primary commands:

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

Generated anchor artifacts:

- `docs/anchors.index.json`
- `docs/ANCHOR_MAP.md`
- `docs/ANCHOR_GRAPH.mermaid`
- `.anchors-coverage.json`
- `.anchors-intelligence.json`
- `.anchors-scorecard.json`
- `.anchors-history.jsonl`

Governance references:

- [`docs/ANCHORS_SPEC.md`](docs/ANCHORS_SPEC.md)
- [`docs/TERMINOLOGY.md`](docs/TERMINOLOGY.md)
- [`docs/ANCHOR_NAMING_GRAMMAR.md`](docs/ANCHOR_NAMING_GRAMMAR.md)
- [`docs/ANCHOR_GOVERNANCE_PATTERNS.md`](docs/ANCHOR_GOVERNANCE_PATTERNS.md)
- [`docs/ANCHOR_RISK_REGISTER.md`](docs/ANCHOR_RISK_REGISTER.md)

## Capsule Validation

The Capsule Validator is integrated into backend routes, editor flows, imports, A2C ingest, CLI, audits, and CI.

- reference: [`docs/validator.md`](docs/validator.md)
- OpenAPI: [`docs/openapi/validate.openapi.json`](docs/openapi/validate.openapi.json)

CLI quick start:

```bash
npm run validate -- --dir data/capsules --strict --report
npm run validate -- data/capsules/capsule.foundation.capsuleos.v1.json --fix
```

API surfaces:

- `POST /api/validate`
- `POST /api/validate/batch`
- `POST /api/validate/fix`
- `GET /api/validate/stats`
- `GET /api/validate/gates`

Use `Authorization: Bearer <token>` headers matching current app auth.

## A2C Runtime

The canonical Anything-to-Capsules runtime is the TypeScript stack under `lib/a2c`, exposed through `scripts/a2c/*`.

The runtime works against the native N1Hub layout instead of reconstructing a separate CapsuleOS root:

- vault capsules: `data/capsules`
- A2C index: `data/private/a2c/index.json`
- A2C tasks and queue state: `data/private/a2c`
- A2C reports and daemon state: `reports/a2c`

Quick start:

```bash
npm run a2c:activate
npm run a2c:recon
npm run a2c:index
npm run a2c:status
npm run a2c:watch:once
```

Operational reference: [`docs/a2c.md`](docs/a2c.md)

## Symphony and N-Infinity

Symphony is the repo-owned orchestration layer.

- workflow contract: `WORKFLOW.md`
- operational reference: [`docs/symphony.md`](docs/symphony.md)
- main command:

```bash
npm run symphony -- ./WORKFLOW.md
```

Optional dashboard:

```bash
npm run symphony -- ./WORKFLOW.md --port 4310
```

N-Infinity is the night-shift automation entrypoint backed by Symphony:

```bash
npm run ninfinity
```

It uses `NINFINITY_WORKFLOW.md`, local `capsule_graph` tracker mode, and cooldown-aware nightly execution.

Operational reference: [`docs/ninfinity.md`](docs/ninfinity.md)

## Vault Steward

Vault Steward is the first direct-provider autonomous agent that can work from AI Wallet providers without requiring local Codex login.

It:

- reads the current vault
- proposes bounded maintenance jobs
- persists queue and runtime state under `data/private/agents`
- updates Dream-side operational capsules with latest run state

Manual one-shot run:

```bash
npm run vault-steward -- --once
```

## Universal Branching

N1Hub supports sparse overlay branches on top of `real`:

- real capsules: `data/capsules/<id>.json`
- non-real overlays: `data/capsules/<id>@<branch>.json`
- branch tombstones: `data/capsules/<id>@<branch>.tombstone.json`
- branch manifests: `data/branches/<branch>.manifest.json`
- Dream keeps `.dream.json` read compatibility until migration

Migration:

```bash
npm run migrate:branches -- --dry-run
npm run migrate:branches
```

Details: [`docs/real-dream-diff.md`](docs/real-dream-diff.md)

## Projects

The Projects tab is the project-oriented projection of the capsule graph.

- project capsules are explicit: `metadata.type: "project"`, `subtype: "hub"`
- hierarchy uses `part_of` links
- cycle prevention is enforced in UI and API
- create, edit, link, and re-parent flows reuse the same capsule APIs and validator pipeline

Guide: [`docs/projects.md`](docs/projects.md)

## OpenClaw-Inspired Workspace

N1Hub includes a selective fork of the most useful OpenClaw workspace patterns:

- [`AGENTS.md`](AGENTS.md) for repo law
- [`CODEX.md`](CODEX.md) for execution protocol
- [`SOUL.md`](SOUL.md) for assistant identity and boundaries
- [`MEMORY.md`](MEMORY.md) for durable working memory
- [`TOOLS.md`](TOOLS.md) for local runtime and API notes
- `skills/<name>/SKILL.md` for focused workspace-local agent skills
- [`docs/openclaw-fork.md`](docs/openclaw-fork.md) for mapping notes

This layer is additive. N1Hub keeps CapsuleOS, AI Wallet, DeepMine, A2C, Symphony, and N-Infinity as the real architecture while using workspace files to make local agent behavior more stable and inspectable.
