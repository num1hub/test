# TODO-026 Tracker Retain-Dream Sync

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Branch Steward Agent`
- Cluster: `Real/Dream governance`

## Goal

Make the `tracker` branch split explicit without promoting Dream over the stronger real-side statement of the live accountability contract.

## Why Now

`TODO-008` classified `tracker` as `retain-dream`, but that decision was still implicit. Dream preserved valid predictive execution doctrine, while Real already matched the accountability and orchestration signals visible in Symphony tracker mode and reminder-driven runtime behavior. This packet turns that branch interpretation into explicit capsule law.

## Scope

- `data/capsules/capsule.foundation.tracker.v1.json`
- `data/capsules/capsule.foundation.tracker.v1@dream.json`
- `docs/symphony.md`
- `lib/symphony/tracker.ts`
- `TO-DO/HOT_QUEUE.md`
- `TO-DO/REAL_DREAM_FRONT.md`

## Non-Goals

- no Symphony runtime code changes
- no root-doc doctrine rewrite
- no attempt to promote the full Dream predictive roadmap into Real

## Deliverables

- updated real Tracker capsule with explicit canonical live-accountability rule
- updated dream Tracker capsule that keeps only predictive execution delta
- queue and Real/Dream front surfaces synced to the new explicit branch interpretation

## Context Snapshot

- `TODO-008` classified `capsule.foundation.tracker.v1` as `retain-dream`
- real already aligns with current tracking posture in `docs/symphony.md` and `lib/symphony/tracker.ts`
- dream remains useful as future doctrine for earlier drift detection, overload warning, and smarter intervention

## Dependencies

- hard: [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)

## Source Signals

- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [Real Dream Front](/home/n1/n1hub.com/TO-DO/REAL_DREAM_FRONT.md)
- `docs/symphony.md`
- `lib/symphony/tracker.ts`

## Entry Checklist

- compare the real and dream Tracker hubs before editing
- confirm the live current tracking posture from Symphony surfaces
- keep the work inside the Tracker capsule pair and branch execution surfaces

## Implementation Plan

1. Compare the real and dream Tracker hubs against the live tracking surfaces.
2. Make the current real-side accountability contract explicit in the real capsule.
3. Rewrite Dream so it keeps only predictive execution and intervention delta.
4. Sync the queue and field brief so the branch interpretation is explicit.
5. Validate both capsules and refresh N1 continuity artifacts.

## Mode and Skill

- Primary mode: `TO-DO Executor`

## System Prompt Slice

```text
You are the Branch Steward Agent. Keep Tracker future-facing in Dream, but make Real the explicit canonical source of the current accountability and orchestration contract.
```

## Operator Command Pack

- `Take TODO-026 and make the Tracker branch split explicit without promoting Dream over Real.`
- `Work as Branch Steward Agent and sync the Tracker capsule pair around real-first current accountability truth and dream-only predictive delta.`

## Acceptance Criteria

- the real Tracker capsule explicitly owns the current live accountability contract
- the dream Tracker capsule explicitly keeps predictive execution delta only
- no Symphony runtime code or root-doc law is widened
- queue truth and field brief both reflect the new explicit branch split

## Verification

- `npm run validate -- --fix data/capsules/capsule.foundation.tracker.v1.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --fix data/capsules/capsule.foundation.tracker.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- `git diff --check`
- `npm run n1:update:once -- --task TODO-001`

## Evidence and Artifacts

- validation report: `reports/validation-2026-03-09T20-52-24-428Z.md`
- refresh teamwork, repo-sync, and orchestration artifacts on completion

## Execution Outcome

- Real `tracker` now explicitly owns the current live accountability and orchestration contract.
- Dream `tracker` now keeps future-only predictive execution and intervention delta.
- Queue and field-brief surfaces now describe the Tracker branch split explicitly.

## Risks

- over-promoting Dream would weaken the stronger real-side statement of the current tracking contract
- leaving Dream too broad would keep branch interpretation fuzzy for the next agent

## Stop Conditions

- the work starts mutating Symphony runtime code or root-doc law
- the branch split cannot be isolated to the Tracker capsule pair and branch execution surfaces

## Queue Update Rule

- if only one Tracker branch is updated, keep the packet `ACTIVE`
- if the Tracker pair and branch execution surfaces are synced and validated, mark the packet `DONE`

## Handoff Note

This Tracker branch sync is contained. Pull `TODO-001` next unless the operator explicitly reopens another Real/Dream hub.
