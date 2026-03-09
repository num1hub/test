# Autonomous Agent Protocol (Execution Runbook)

## Objective

Execute `Anything -> Capsules -> Graph` end-to-end with minimal user intervention and maximum deterministic reliability.

## Preflight

1. Resolve `workspace_root` and `kb_root`.
2. Run the TypeScript activation entry gate (`scripts/a2c/activate.ts`) and confirm `READY`.
3. Run the TypeScript workspace recon module (`scripts/a2c/recon.ts`) for deep/non-trivial scopes.
4. Ensure required repo-native directories exist:
   - `data/capsules`
   - `data/private/a2c`
   - `reports/a2c`
5. Confirm input path exists and is readable.
6. Confirm module scripts are available.

## Operational Modes

1. `integrate-full` (default):
   - ingest + audit + rebuild.
2. `audit-only`:
   - audit only, no ingestion mutation.
3. `index-only`:
   - rebuild index only.
4. `ingest-only`:
   - ingest only (skip audit/index only if user explicitly requests).
5. `activate-only`:
   - run activation gate only, return readiness report.
6. `prompt-redesign-only`:
   - run prompt redesign protocol and return upgraded prompt package.
7. `code-audit-distill`:
   - run code-artifact audit protocol, then distill outcomes into capsules.
8. `capsuleos-focus-campaign`:
   - run CapsuleOS relevance-first migration with wave planning and continuity artifacts.
9. `autonomous-handoff`:
   - run one-command orchestrator where user provides input and agent executes full chain.

## Canonical Flow (integrate-full)

### Step A-1: Workspace Recon

Before planning mutation:

- classify workspace profile (`n1hub_repo` or `unknown`),
- derive SSOT ladder,
- detect governance command availability,
- write recon report to logs.

### Step A-0: Activation Entry

Before recon and mutation:

- run activation bootstrap,
- require activation state `READY`,
- stop if blocked and return blockers.

### Step A0: Deep Investigation

Before any mutation:

- run deep investigation protocol,
- run `scripts/a2c/investigate.ts` to emit a deterministic recon + retrieval + mode recommendation packet,
- include contradiction checks both against vault and within intake batch,
- derive key insights and risk map,
- choose execution path (conservative/integration/synthesis).

### Step A: Ingest

Run ingestion with deterministic flags suitable to intent:

- default dialect: `repo_native`,
- default integration mode: `--on-duplicate update` for refresh flows, `skip` for append flows,
- enable decomposition for large markdown-like inputs.
- keep queue mode enabled for staged ingestion (`quarantine -> workspace -> integrate -> cleanup`).
- invoke selective synthesis only for trigger-positive overlap/conflict clusters.
- in CapsuleOS focus campaign, classify sources (`core/adjacent/external`) and prioritize `core`.
- persist campaign continuity state after each run:
  - `data/private/a2c/tasks/ROADMAP.md`
  - `data/private/a2c/tasks/CAMPAIGN_STATE_<campaign_id>.json`
- for wave campaigns, prefer `--wave-index auto` to advance deterministically.
- monitor systemic risk ratios (`audit_error_ratio`, `ingest_failure_ratio`, `conflict_ratio`) and halt campaign when threshold is exceeded.

### Step B: Audit

Run vault audit and classify findings:

- `ERROR`/`FATAL`: blocker,
- `WARN`: non-blocking but must be reported.

### Step C: Rebuild

Run index rebuild and capture deterministic node/edge counts.

### Step D: Report

Return:

1. execution summary,
2. module status (`ACTIVATE`, `RECON`, `INGEST`, `AUDIT`, `INDEX`),
3. report file paths,
4. confidence/human review signal.
5. source relevance totals (`core`, `adjacent`, `external`) in focus campaigns.

## Decision Defaults

### Duplicate strategy

- exact duplicate -> skip/update by mode,
- same-source changed signature -> update,
- near duplicate -> preserve both and link,
- contradiction -> preserve both and link as `contradicts`.

### Synthesis strategy

- trigger-positive clusters -> apply selective synthesis protocol,
- trigger-negative clusters -> bypass synthesis and continue normal integration,
- unresolved synthesis conflict -> preserve parallel capsules + human review.

### Linking strategy

- use user-provided links if present,
- augment with deterministic suggestions when enabled,
- never emit untyped links.

## Hard Stops

Stop and return explicit blocker when:

1. input path missing,
2. cannot read/write within `kb_root`,
3. module script missing,
4. dialect constraints cannot be satisfied.

## Minimal Command Set

```bash
tsx scripts/a2c/activate.ts --workspace-root "<WORKSPACE_ROOT>" --kb-root "<KB_ROOT>" --require-ready
tsx scripts/a2c/recon.ts --workspace-root "<WORKSPACE_ROOT>" --kb-root "<KB_ROOT>"
tsx scripts/a2c/investigate.ts --workspace-root "<WORKSPACE_ROOT>" --kb-root "<KB_ROOT>" --input "<INPUT>" --dry-run
tsx scripts/a2c/ingest.ts --input "<INPUT>" --dry-run
tsx scripts/a2c/audit.ts --expected-dialect repo_native
tsx scripts/a2c/index.ts --kb-root "<KB_ROOT>"
```

One-command autonomous alternative:

```bash
tsx scripts/a2c/autonomous.ts --input "<INPUT_PATH>" --dry-run
```
