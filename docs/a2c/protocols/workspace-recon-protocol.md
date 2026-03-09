# Workspace Recon Protocol (Anything-to-Capsules)

## Purpose

Force deep environmental understanding before mutation so the agent acts on the real project contract, not assumptions.

## Trigger

Run recon when at least one condition is true:

1. first run in a workspace,
2. user asks for deep analysis/research,
3. mutation scope is non-trivial (many files, merge/conflict flow, schema-sensitive update),
4. the repository surface looks incomplete, inconsistent, or partially migrated.

## Core Rule

`Probe -> Classify -> Build SSOT Ladder -> Plan -> Execute`

Do not mutate before profile classification.
Do not run recon as a mutation bypass; activation entry gate should already be `READY`.

## Recon Procedure

### Step 1: Inventory Surface

- scan top-level directories and files,
- detect large non-target zones (`node_modules`, caches, artifacts),
- classify what is mutable for current request.

### Step 2: Detect Operating Profile

Classify one profile:

1. `n1hub_repo`:
   - repository contains `data/capsules`,
   - governance surfaces such as `README.md`, `docs/a2c.md`, and active A2C scripts exist,
   - TypeScript/runtime structure is present and mutation can be governed.
2. `unknown`:
   - repository contract cannot be resolved deterministically.

### Step 3: Build SSOT Ladder

#### N1Hub Repo

1. `README.md`
2. `docs/a2c.md` + active protocol docs under `docs/a2c/protocols`
3. active TypeScript runtime under `lib/a2c` and `scripts/a2c`
4. repo-native vault in `data/capsules`
5. repo-native runtime artifacts in `reports/a2c` and `data/private/a2c`

### Step 4: Governance Capability Detection

When `package.json` exists, verify command availability:

- `extract:anchors`
- `validate:anchors`
- `verify:root-docs`
- `test:anchors`
- `typecheck`
- `check:anchors:full`
- `anchors:assert-scorecard`
- `anchors:lint-usage`
- `terminology:lint`
- `anchors:snapshot`

### Step 5: Recon Report

Emit machine-readable recon artifact including:

- workspace profile,
- SSOT ladder,
- repo-native vault state (capsule count/index presence/pipeline state),
- governance command readiness,
- TypeScript cluster triad intelligence (`docs/src/tests` coverage, gap map, invariant signals),
- recommended deterministic next actions.

### Step 6: TypeScript Triad Intelligence (When Present)

If workspace includes:

- `docs/typescript-clusters`
- `src/core/typescript`
- `tests/typescript-clusters`

then extract:

1. cluster triad coverage (`contract -> engine -> tests`),
2. missing triad artifacts by cluster,
3. exported API signatures from source files,
4. test invariant signals from test titles,
5. capability families and threshold-hint density.

Use these signals as additional pre-mutation quality gates.
Use `references/typescript-cluster-context-atlas.md` as a static enrichment
layer only; do not require runtime reads from external legacy corpus paths.

## Action Policy

### If profile is `n1hub_repo`

- run audit/rebuild scoped to the requested repo-native KB path only,
- if request modifies governance-surface files, include governance gates in completion criteria.

### If profile is `unknown`

- return `INSUFFICIENT_CONTEXT` or run conservative dry-run plan only.

## Output Discipline

Report must include:

1. profile classification,
2. confidence,
3. explicit blockers,
4. next deterministic action.
