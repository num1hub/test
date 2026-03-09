# TODO-009 Vault Steward Dream-Only Operations Review

- Priority: `P0`
- Execution Band: `NOW`
- Status: `DONE`
- Owner Lane: `Vault Steward Agent`
- Cluster: `Vault Steward / Real-Dream operations`

## Goal

Resolve the lifecycle of the only three dream-only capsule IDs in the live vault so Vault Steward operational state stops being implicit branch residue.

## Why Now

The current dream-only IDs are:

- `capsule.operations.vault-steward.latest.v1`
- `capsule.operations.vault-steward.plan.v1`
- `capsule.operations.vault-steward.queue.v1`

That makes Vault Steward the only live Dream-only lane. If these capsules are intentional operational state, they need explicit law. If they are accidental residue, they need cleanup.

## Scope

- `data/capsules/capsule.operations.vault-steward.latest.v1@dream.json`
- `data/capsules/capsule.operations.vault-steward.plan.v1@dream.json`
- `data/capsules/capsule.operations.vault-steward.queue.v1@dream.json`
- `lib/agents/vaultSteward.ts`
- `lib/agents/vaultSteward/*`
- `__tests__/lib/vaultSteward.test.ts`
- `docs/real-dream-diff.md`

## Non-Goals

- no broad refactor of the whole Vault Steward runtime
- no unrelated queue-planning redesign
- no mass branch cleanup beyond the three named capsules

## Deliverables

- explicit lifecycle decision for each dream-only capsule
- documentation of whether these capsules are ephemeral operational state, promotable state, or retireable state
- follow-up tests or task splits for whichever lifecycle is chosen
- queue or branch policy notes if retention rules need to be encoded

## Context Snapshot

- the current dream-only IDs are `latest`, `plan`, and `queue` for Vault Steward
- they are the only dream-only outliers in the live vault
- writer paths already exist in `lib/agents/vaultSteward.ts`

## Dependencies

- hard: confirm through the latest TODO-007 audit that these three IDs are still the only dream-only outliers
- soft: read the current Vault Steward runtime artifacts before deciding retention law

## Source Signals

- TO-DO/tasks/TODO-007-real-dream-global-audit.md
- data/private/agents/vault-steward.latest.json
- data/private/agents/vault-steward.runtime.json

## Entry Checklist

- confirm that the three named capsules are still the only dream-only outliers before classifying lifecycle
- trace the current write paths in `lib/agents/vaultSteward.ts` and adjacent helpers before drawing policy conclusions
- check the existing Vault Steward tests so lifecycle law does not drift away from runtime behavior

## Implementation Plan

1. Trace the write paths for the three dream-only capsules.
2. Classify each one as ephemeral operational state, promotable governance state, or retireable residue.
3. Write explicit lifecycle law and split any needed code follow-up into bounded tasks.

## Lifecycle Classification

Writer path:

- `lib/agents/vaultSteward.ts`
  `writeDreamOperationalCapsules()` writes all three capsules with `writeOverlayCapsule(..., 'dream')`
- `lib/agents/vaultSteward/maintenance-artifacts.ts`
  defines the concrete builders:
  `buildLatestRunCapsule()`
  `buildQueueCapsule()`
  `buildPlanCapsule()`
- `lib/agents/vaultSteward/runtime-store.ts`
  persists the machine JSON mirrors under `data/private/agents/*`, which the Dream overlays summarize for graph visibility

Lifecycle decisions:

- `capsule.operations.vault-steward.latest.v1` -> `ephemeral operational state`
  This capsule is rebuilt every run from the current `VaultStewardRun` via `buildLatestRunCapsule()` and mirrors the latest run summary, lanes, and graph snapshot. It should stay Dream-only, be overwritten on every new run, and never be promoted to Real.
- `capsule.operations.vault-steward.queue.v1` -> `ephemeral operational state`
  This capsule is rebuilt from the live queue via `buildQueueCapsule()` and exists to expose queued and completed Dream-side maintenance jobs inside the capsule graph. It is operational telemetry, not branch doctrine, so it should stay Dream-only and overwrite in place as queue state changes.
- `capsule.operations.vault-steward.plan.v1` -> `ephemeral operational state`
  This capsule is rebuilt from the current run plus queue via `buildPlanCapsule()` and acts as an operator-facing planning snapshot for the current maintenance cycle. It is not promotable governance law; it should remain Dream-only and rotate with each new planning cycle.

Retention law:

- keep these three capsules Dream-only as long as `writeDreamOperationalCapsules()` remains the publishing path
- treat them as overwrite-in-place operational mirrors, not durable constitutional capsules
- retire them together only if Vault Steward stops publishing capsule-visible operational state and replaces this surface with another explicit operator-facing artifact

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/todo-executor/SKILL.md`

## System Prompt Slice

```text
You are the Vault Steward Agent. Trace the three dream-only Vault Steward capsules back to their writer paths, decide their lifecycle class, and make their existence explicit instead of leaving them as unexplained branch residue.
```

## Operator Command Pack

- `Take TODO-009 and resolve the dream-only Vault Steward capsule lifecycle.`
- `Work as Vault Steward Agent and classify latest, plan, and queue as ephemeral, promotable, or retireable.`

## Acceptance Criteria

- all three dream-only IDs are explained by explicit policy
- generation path and retention path are identified in code
- the branch model does not leave these files as unexplained outliers
- next-step implementation work is split into bounded follow-up tasks if code changes are required

## Verification

- `npx vitest run __tests__/lib/vaultSteward.test.ts`
- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`

## Evidence and Artifacts

- update this task packet with the exact writer paths and lifecycle class for `latest`, `plan`, and `queue`
- update `TO-DO/REAL_DREAM_FRONT.md` if the dream-only outlier interpretation changes
- add bounded follow-up tasks if lifecycle law requires runtime or capsule changes
- refresh teamwork artifacts if the current host lane supports them

## Risks

- operational artifacts may be doing useful work while still lacking doctrine
- cleanup decisions may accidentally remove state that the queue runtime still expects

## Stop Conditions

- the three capsules cannot be explained without a deeper Vault Steward runtime refactor

## Queue Update Rule

- if writer paths are traced but lifecycle law is not settled, keep the task `ACTIVE`
- if the task discovers a deeper runtime dependency that needs a separate refactor, mark it `BLOCKED` and open the follow-up packet
- if all three capsules have explicit lifecycle law and bounded follow-up, mark the task `DONE`

## Handoff Note

The lifecycle decision is now explicit: `latest`, `queue`, and `plan` are intentional Dream-only operational mirrors published by `writeDreamOperationalCapsules()`. Do not revisit their branch status unless the writer path or retention model changes.
