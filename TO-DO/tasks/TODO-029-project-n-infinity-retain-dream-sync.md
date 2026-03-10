# TODO-029 N-Infinity Project Retain-Dream Sync

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Branch Steward Agent`
- Cluster: `Real/Dream governance`

## Goal

Make the `project.n-infinity` branch split explicit without promoting Dream over the stronger real-side statement of the current N-Infinity implementation program.

## Why Now

`TODO-008` classified `project.n-infinity` as `retain-dream`, but that decision was still implicit. Real already matches the live repository truth: N-Infinity Project is the bounded implementation program that governs role design, capsule-job orchestration, daemon bring-up, assignment control, and night-shift deployment posture. Dream still adds value as future control-plane and swarm-governance doctrine for richer budgets, clearer assignment maps, and more mature autonomy shaping. This packet turns that interpretation into explicit capsule law.

## Scope

- `data/capsules/capsule.project.n-infinity.v1.json`
- `data/capsules/capsule.project.n-infinity.v1@dream.json`
- `docs/projects.md`
- `docs/agents-operations.md`
- `TO-DO/HOT_QUEUE.md`
- `TO-DO/REAL_DREAM_FRONT.md`

## Non-Goals

- no runtime daemon code changes
- no root-doc doctrine rewrite
- no attempt to promote the full Dream control-plane roadmap into Real

## Deliverables

- updated real N-Infinity Project capsule with explicit canonical current-program rule
- updated dream N-Infinity Project capsule that keeps only future control-plane and swarm-governance delta
- queue and Real/Dream front surfaces synced to the new explicit branch interpretation

## Context Snapshot

- `TODO-008` classified `capsule.project.n-infinity.v1` as `retain-dream`
- real already aligns with the current project-level implementation posture visible in `docs/projects.md` and `docs/agents-operations.md`
- dream remains useful as future doctrine for tighter control-plane visibility, budget-aware routing, and calmer autonomy expansion

## Dependencies

- hard: [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)

## Source Signals

- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [Real Dream Front](/home/n1/n1hub.com/TO-DO/REAL_DREAM_FRONT.md)
- `docs/projects.md`
- `docs/agents-operations.md`

## Entry Checklist

- compare the real and dream N-Infinity Project hubs before editing
- confirm the live current implementation-program contract from project and operations surfaces
- keep the work inside the project capsule pair and branch execution surfaces

## Implementation Plan

1. Compare the real and dream N-Infinity Project hubs against the live project and agent-ops contract.
2. Make the current real-side implementation-program authority explicit in the real capsule.
3. Rewrite Dream so it keeps only future control-plane, budget, and swarm-governance delta.
4. Sync the queue and field brief so the branch interpretation is explicit.
5. Validate both capsules and refresh N1 continuity artifacts.

## Mode and Skill

- Primary mode: `TO-DO Executor`

## System Prompt Slice

```text
You are the Branch Steward Agent. Keep N-Infinity Project future-facing in Dream, but make Real the explicit canonical source of the current implementation program and bounded deployment posture.
```

## Operator Command Pack

- `Take TODO-029 and make the N-Infinity Project branch split explicit without promoting Dream over Real.`
- `Work as Branch Steward Agent and sync the N-Infinity Project capsule pair around real-first current implementation law and dream-only future control-plane delta.`

## Acceptance Criteria

- the real N-Infinity Project capsule explicitly owns the current implementation-program contract
- the dream N-Infinity Project capsule explicitly keeps future control-plane and swarm-governance delta only
- no runtime daemon code or root-doc law is widened
- queue truth and field brief both reflect the new explicit branch split

## Verification

- `npm run validate -- --fix data/capsules/capsule.project.n-infinity.v1.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --fix data/capsules/capsule.project.n-infinity.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- `npm run check:anchors:full`
- `git diff --check`
- `npm run n1:update:once -- --task TODO-001`

## Evidence and Artifacts

- validation report: `reports/validation-2026-03-09T21-31-37-502Z.md`
- N1 continuity reports:
  - `reports/n1/automated-update/n1-iter-2026-03-09T21-32-35Z.md`
  - `reports/n1/repo-sync/n1-sync-2026-03-09T21-32-35Z.md`
  - `reports/n1/orchestration/n1-orch-2026-03-09T21-32-35Z.md`

## Execution Outcome

- Real `project.n-infinity` now explicitly owns the current implementation-program and bounded deployment contract.
- Dream `project.n-infinity` now keeps future-only control-plane, budget, and swarm-governance delta.
- Queue and field-brief surfaces now describe the N-Infinity Project branch split explicitly.

## Risks

- over-promoting Dream would weaken the stronger real-side statement of the current implementation program
- leaving Dream too broad would keep branch interpretation fuzzy for the next agent

## Stop Conditions

- the work starts mutating runtime daemon code or root-doc law
- the branch split cannot be isolated to the N-Infinity Project capsule pair and branch execution surfaces

## Queue Update Rule

- if only one N-Infinity Project branch is updated, keep the packet `ACTIVE`
- if the project pair and branch execution surfaces are synced and validated, mark the packet `DONE`

## Handoff Note

This N-Infinity Project branch sync is contained. Pull `TODO-001` next unless the operator explicitly reopens another Real/Dream hub or moves to the promotion-test frontier.
