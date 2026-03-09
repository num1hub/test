# TODO-022 Workspace Selective Promotion

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `READY`
- Owner Lane: `Branch Steward Agent`
- Cluster: `Real/Dream governance`

## Goal

Selectively promote the Dream-side boundary doctrine from `capsule.foundation.workspace.v1` into Real without discarding the stronger real-side runtime inventory.

## Why Now

`TODO-008` classified `workspace` as `promote`, but only selectively. Dream carries the sharper boundary law for Workspace as a lens over Planner, Tracker, Dashboard, and Assistant, while Real still carries the stronger runtime inventory. Promotion therefore needs a bounded packet instead of a blind overwrite.

## Scope

- `data/capsules/capsule.foundation.workspace.v1.json`
- `data/capsules/capsule.foundation.workspace.v1@dream.json`
- `README.md`
- `AGENTS.md`
- `docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md`
- `TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md`

## Non-Goals

- no whole-dream overwrite of the real workspace capsule
- no workspace app refactor
- no promotion of unrelated hub doctrine

## Deliverables

- updated real workspace capsule with selectively promoted boundary doctrine
- preserved real-side runtime inventory where Dream is weaker
- explicit note of what remained Dream-only after promotion

## Context Snapshot

- `TODO-008` measured this hub at score `173`
- triage result: `promote`
- promotion must be selective because Dream and Real each carry different strengths

## Dependencies

- `hard:` [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)

## Source Signals

- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [Real Dream Front](/home/n1/n1hub.com/TO-DO/REAL_DREAM_FRONT.md)

## Entry Checklist

- compare the real and dream workspace hubs before editing
- read the named architecture surfaces so the promoted doctrine matches current repo law
- preserve the current real-side runtime inventory explicitly

## Implementation Plan

1. Compare real and dream workspace hubs against the named repo-law surfaces.
2. Extract the Dream-side boundary doctrine that should become canonical in Real.
3. Apply only that doctrine into the real capsule while preserving the stronger real-side inventory.
4. Validate the result and record what stayed Dream-only.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/todo-executor/SKILL.md`

## System Prompt Slice

```text
You are the Branch Steward Agent. Promote only the Dream-side workspace boundary doctrine that now belongs in Real, while preserving the stronger real runtime inventory.
```

## Operator Command Pack

- `Take TODO-022 and selectively promote the Dream workspace doctrine into Real.`
- `Work as Branch Steward Agent and update the real workspace hub without doing a full Dream overwrite.`

## Acceptance Criteria

- the real workspace capsule gains the sharper boundary doctrine from Dream
- the real workspace capsule keeps the stronger runtime inventory it already has
- the promotion does not widen into unrelated workspace or UI changes
- remaining Dream-only doctrine, if any, is explicit

## Verification

- `npm run validate -- data/capsules/capsule.foundation.workspace.v1.json`
- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`

## Evidence and Artifacts

- update this packet with the exact promoted doctrine and the exact retained real-side inventory
- update [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md) only if the promotion changes the branch interpretation materially
- refresh teamwork artifacts if the active host lane supports them

## Risks

- a full overwrite would erase stronger real-side runtime inventory
- a too-timid promotion would leave the real workspace hub with stale ownership doctrine

## Stop Conditions

- the task starts mutating workspace runtime code or app routes
- the promotion cannot be isolated to the workspace hub capsule

## Queue Update Rule

- if doctrine selection is in progress but the real capsule is not yet validated, keep the task `ACTIVE`
- if the promotion requires a broader constitutional decision beyond the workspace hub, mark the task `BLOCKED`
- if the real capsule is updated, validated, and the remaining Dream-only delta is explicit, mark the task `DONE`

## Handoff Note

Open the real and dream `workspace` hubs first, then read `README.md`, `AGENTS.md`, and `docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md`. The key constraint is simple: pull over boundary doctrine, not a whole replacement text.
