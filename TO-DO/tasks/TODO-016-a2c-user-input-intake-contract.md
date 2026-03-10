# TODO-016 A2C User Input Intake Contract

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `A2C Intake Agent`
- Cluster: `A2C intake and planning`

## Goal

Define the repo-native A2C contract that receives raw operator input and turns it into structured intake data with stable fields for later TO-DO packet generation, capsule projection, and verification.

## Why Now

Right now a lot of high-value user intent arrives as chat and gets manually translated into planning surfaces. That does not scale. N1Hub needs an explicit Anything-to-Capsules intake shape for operator requests before it can reliably turn natural language into bounded work.

## Scope

- `lib/a2c/*`
- `app/api/a2c/ingest/route.ts`
- `docs/a2c.md`
- `TO-DO/*`
- `data/private/a2c/*`

## Non-Goals

- no full autonomous execution of new tasks in this slice
- no direct mutation of `TO-DO/HOT_QUEUE.md` without a stable intake contract
- no mass write into `data/capsules`

## Deliverables

- one explicit operator-input intake shape for A2C
- stable fields for intent, scope, priority hints, owner lane hints, and acceptance-criteria hints
- repo-native staging location for raw and normalized intake artifacts
- documentation showing how user input enters the pipeline

## Context Snapshot

- the user explicitly wants raw input to become specially dedicated TO-DO for N1Hub
- A2C already owns intake, staging, and runtime namespaces under `data/private/a2c`
- the hot queue already exists, but operator input still reaches it through manual synthesis rather than a declared contract

## Dependencies

- soft: the active P0 branch wave should be materially contained before this becomes the main frontier
- output: this task should emit the normalized intake contract consumed by TODO-017, TODO-018, and TODO-019

## Source Signals

- repeated operator requests to turn raw input into dedicated N1Hub TO-DO
- docs/a2c.md
- TO-DO/TASK_TEMPLATE.md

## Entry Checklist

- inspect the current A2C ingest, recon, and intake-related runtime files
- inspect how current hot tasks are shaped in `TO-DO/tasks/`
- confirm which fields are essential for later packet generation

## Implementation Plan

1. map the current A2C intake and staging surfaces
2. define the raw-to-normalized operator-input contract
3. document where this contract should live and how later stages consume it
4. leave a clear bridge to `TODO-017`

## Contract Shapes

### Raw Artifact

- location: `data/private/a2c/intake/archive_raw/<intake-id>.raw.json`
- fields:
  - `intake_id`
  - `received_at`
  - `source.channel`
  - `source.actor`
  - `source.metadata`
  - `raw_text`
  - `text_sha256`
  - `line_count`
  - `char_count`

### Normalized Artifact

- location: `data/private/a2c/intake/normalized/<intake-id>.normalized.json`
- fields:
  - `intake_id`
  - `received_at`
  - `source`
  - `normalized.objective`
  - `normalized.route_class_hint`
  - `normalized.scope_hints`
  - `normalized.file_hints`
  - `normalized.task_refs`
  - `normalized.priority_hint`
  - `normalized.execution_band_hint`
  - `normalized.owner_lane_hints`
  - `normalized.acceptance_criteria_hints`
  - `normalized.verification_hints`
  - `normalized.stop_condition_hints`

## Current Repo Truth

- `POST /api/a2c/ingest` now accepts an explicit `operatorInput` envelope in addition to the existing capsule-candidate ingest path.
- A2C stages raw operator input and normalized intake artifacts under A2C-owned intake directories instead of mutating `TO-DO/` directly.
- The normalized artifact is now the intended handoff surface for `TODO-017`, `TODO-018`, and `TODO-019`.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/n1/SKILL.md`

## System Prompt Slice

```text
You are the A2C Intake Agent. Convert raw operator intent into a repo-native intake contract that A2C can stage, normalize, and later turn into bounded N1Hub work without losing scope, proof requirements, or planning context.
```

## Operator Command Pack

- `Take TODO-016 and define the A2C intake contract for operator input.`
- `Work as A2C Intake Agent and turn user intent into a stable Anything-to-Capsules staging shape.`

## Acceptance Criteria

- operator input has a declared intake shape instead of ad hoc chat interpretation
- later packet-builder work has stable fields to consume
- the design stays inside A2C-owned namespaces and does not bypass validator or queue law

## Verification

- `npm run typecheck`
- `npm run check:anchors:full`

## Evidence and Artifacts

- update the relevant A2C docs or runtime surfaces
- leave a clear description of raw artifact and normalized artifact shapes
- update the task packet if repo truth changes during the pass

## Risks

- the intake contract can become vague if it tries to solve packet generation too early

## Stop Conditions

- the only way forward is to bypass A2C-owned namespaces
- the contract cannot stay bounded without first solving capsule-native execution in full

## Queue Update Rule

- keep this task `ACTIVE` if the contract is defined but not yet encoded in repo surfaces
- mark it `BLOCKED` if intake routing depends on a larger runtime decision first
- mark it `DONE` only when the intake contract is explicit and handoff-ready for packet generation

## Handoff Note

Contained on 2026-03-10. `TODO-017` should consume `data/private/a2c/intake/normalized/*.normalized.json` and map those stable fields into `TO-DO` packet sections without re-inventing the intake envelope.

## Latest Pass

- Date: `2026-03-10`
- Outcome:
  - added typed operator-input intake and normalized-contract surfaces in `lib/a2c/types.ts`
  - added raw and normalized staging writes in `lib/a2c/ingest.ts`
  - extended `POST /api/a2c/ingest` to accept `operatorInput.text` without disturbing capsule ingest
  - documented the API intake path in `docs/a2c.md`
- Verification:
  - `npm run typecheck` -> passed
  - `npm run check:anchors:full` -> passed
