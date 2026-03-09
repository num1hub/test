# TODO-009 Vault Steward Dream-Only Operations Review

- Priority: `P0`
- Execution Band: `NOW`
- Status: `READY`
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

Trace these capsules from their live files back to the writer paths in Vault Steward. Decide whether they are durable governance objects or just operational branch exhaust, then write the rule explicitly.
