# TODO-028 N-Infinity Retain-Dream Sync

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Branch Steward Agent`
- Cluster: `Real/Dream governance`

## Goal

Make the `n-infinity` branch split explicit without promoting Dream over the stronger real-side statement of the live N-Infinity runtime contract.

## Why Now

`TODO-008` classified `n-infinity` as `retain-dream`, but that decision was still implicit. Real already matches the current repository truth: N-Infinity is a bounded capsule-graph night-shift lane governed by workflow windows, cooldown policy, validator law, and reviewable runs. Dream still adds value as future iteration-fabric doctrine for richer cross-lane compounding, stronger control-plane visibility, and more mature continuous-service behavior. This packet turns that interpretation into explicit capsule law.

## Scope

- `data/capsules/capsule.foundation.n-infinity.v1.json`
- `data/capsules/capsule.foundation.n-infinity.v1@dream.json`
- `NINFINITY_WORKFLOW.md`
- `docs/agents-operations.md`
- `TO-DO/HOT_QUEUE.md`
- `TO-DO/REAL_DREAM_FRONT.md`

## Non-Goals

- no workflow runtime code changes
- no root-doc doctrine rewrite
- no attempt to promote the full Dream swarm roadmap into Real

## Deliverables

- updated real N-Infinity capsule with explicit canonical live runtime rule
- updated dream N-Infinity capsule that keeps only future iteration-fabric delta
- queue and Real/Dream front surfaces synced to the new explicit branch interpretation

## Context Snapshot

- `TODO-008` classified `capsule.foundation.n-infinity.v1` as `retain-dream`
- real already aligns with the current N-Infinity night-shift contract in `NINFINITY_WORKFLOW.md` and `docs/agents-operations.md`
- dream remains useful as future doctrine for richer swarm compounding, visibility, and 24/7 readiness once stronger evidence law exists

## Dependencies

- hard: [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)

## Source Signals

- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [Real Dream Front](/home/n1/n1hub.com/TO-DO/REAL_DREAM_FRONT.md)
- `NINFINITY_WORKFLOW.md`
- `docs/agents-operations.md`

## Entry Checklist

- compare the real and dream N-Infinity hubs before editing
- confirm the live current N-Infinity contract from workflow and operations surfaces
- keep the work inside the N-Infinity capsule pair and branch execution surfaces

## Implementation Plan

1. Compare the real and dream N-Infinity hubs against the live workflow and agent-ops contract.
2. Make the current real-side N-Infinity authority explicit in the real capsule.
3. Rewrite Dream so it keeps only future iteration-fabric and continuous-service delta.
4. Sync the queue and field brief so the branch interpretation is explicit.
5. Validate both capsules and refresh N1 continuity artifacts.

## Mode and Skill

- Primary mode: `TO-DO Executor`

## System Prompt Slice

```text
You are the Branch Steward Agent. Keep N-Infinity future-facing in Dream, but make Real the explicit canonical source of the current bounded night-shift swarm contract.
```

## Operator Command Pack

- `Take TODO-028 and make the N-Infinity branch split explicit without promoting Dream over Real.`
- `Work as Branch Steward Agent and sync the N-Infinity capsule pair around real-first current swarm law and dream-only future iteration-fabric delta.`

## Acceptance Criteria

- the real N-Infinity capsule explicitly owns the current live bounded swarm contract
- the dream N-Infinity capsule explicitly keeps future iteration-fabric delta only
- no workflow runtime code or root-doc law is widened
- queue truth and field brief both reflect the new explicit branch split

## Verification

- `npm run validate -- --fix data/capsules/capsule.foundation.n-infinity.v1.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --fix data/capsules/capsule.foundation.n-infinity.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
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

- Real `n-infinity` now explicitly owns the current live bounded night-shift swarm contract.
- Dream `n-infinity` now keeps future-only iteration-fabric and continuous-service delta.
- Queue and field-brief surfaces now describe the N-Infinity branch split explicitly.

## Risks

- over-promoting Dream would weaken the stronger real-side statement of the current N-Infinity runtime contract
- leaving Dream too broad would keep branch interpretation fuzzy for the next agent

## Stop Conditions

- the work starts mutating workflow runtime code or root-doc law
- the branch split cannot be isolated to the N-Infinity capsule pair and branch execution surfaces

## Queue Update Rule

- if only one N-Infinity branch is updated, keep the packet `ACTIVE`
- if the N-Infinity pair and branch execution surfaces are synced and validated, mark the packet `DONE`

## Handoff Note

This N-Infinity branch sync is contained. Pull `TODO-001` next unless the operator explicitly reopens another Real/Dream hub or moves to the promotion-test frontier.
