# TODO-025 N1Hub Runtime Retain-Dream Sync

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Branch Steward Agent`
- Cluster: `Real/Dream governance`

## Goal

Make the `n1hub` branch split explicit without promoting Dream over the stronger real-side statement of the live N1Hub runtime contract.

## Why Now

`TODO-008` classified `n1hub` as `retain-dream`, but that decision was still implicit. Dream preserved valid habitat doctrine, while Real already matched the live runtime posture described by project and agent-operations surfaces. This packet turns that branch interpretation into explicit capsule law.

## Scope

- `data/capsules/capsule.foundation.n1hub.v1.json`
- `data/capsules/capsule.foundation.n1hub.v1@dream.json`
- `docs/projects.md`
- `docs/agents-operations.md`
- `TO-DO/HOT_QUEUE.md`
- `TO-DO/REAL_DREAM_FRONT.md`

## Non-Goals

- no web-app runtime code changes
- no root-doc doctrine rewrite
- no attempt to promote the full Dream habitat vision into Real

## Deliverables

- updated real N1Hub capsule with explicit canonical live-runtime rule
- updated dream N1Hub capsule that keeps only future habitat delta
- queue and Real/Dream front surfaces synced to the new explicit branch interpretation

## Context Snapshot

- `TODO-008` classified `capsule.foundation.n1hub.v1` as `retain-dream`
- real already aligns with current project and agent-runtime posture in `docs/projects.md` and `docs/agents-operations.md`
- dream remains useful as future doctrine for the calmer, deeper sovereign habitat vision

## Dependencies

- hard: [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)

## Source Signals

- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [Real Dream Front](/home/n1/n1hub.com/TO-DO/REAL_DREAM_FRONT.md)
- `docs/projects.md`
- `docs/agents-operations.md`

## Entry Checklist

- compare the real and dream N1Hub hubs before editing
- confirm the live current runtime posture from project and agent-operations surfaces
- keep the work inside the N1Hub capsule pair and branch execution surfaces

## Implementation Plan

1. Compare the real and dream N1Hub hubs against the live runtime surfaces.
2. Make the current real-side runtime contract explicit in the real capsule.
3. Rewrite Dream so it keeps only future habitat and integration delta.
4. Sync the queue and field brief so the branch interpretation is explicit.
5. Validate both capsules and refresh N1 continuity artifacts.

## Mode and Skill

- Primary mode: `TO-DO Executor`

## System Prompt Slice

```text
You are the Branch Steward Agent. Keep N1Hub Runtime future-facing in Dream, but make Real the explicit canonical source of the current runtime contract.
```

## Operator Command Pack

- `Take TODO-025 and make the N1Hub Runtime branch split explicit without promoting Dream over Real.`
- `Work as Branch Steward Agent and sync the N1Hub capsule pair around real-first current runtime truth and dream-only future habitat delta.`

## Acceptance Criteria

- the real N1Hub capsule explicitly owns the current live runtime contract
- the dream N1Hub capsule explicitly keeps future habitat delta only
- no runtime code or root-doc law is widened
- queue truth and field brief both reflect the new explicit branch split

## Verification

- `npm run validate -- --fix data/capsules/capsule.foundation.n1hub.v1.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --fix data/capsules/capsule.foundation.n1hub.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- `git diff --check`
- `npm run n1:update:once -- --task TODO-001`

## Evidence and Artifacts

- validation report: `reports/validation-2026-03-09T20-50-04-200Z.md`
- refresh teamwork, repo-sync, and orchestration artifacts on completion

## Execution Outcome

- Real `n1hub` now explicitly owns the current live runtime contract and operating posture.
- Dream `n1hub` now keeps future-only habitat and integration delta.
- Queue and field-brief surfaces now describe the N1Hub branch split explicitly.

## Risks

- over-promoting Dream would weaken the stronger real-side statement of the current runtime contract
- leaving Dream too broad would keep branch interpretation fuzzy for the next agent

## Stop Conditions

- the work starts mutating runtime code or root-doc law
- the branch split cannot be isolated to the N1Hub capsule pair and branch execution surfaces

## Queue Update Rule

- if only one N1Hub branch is updated, keep the packet `ACTIVE`
- if the N1Hub pair and branch execution surfaces are synced and validated, mark the packet `DONE`

## Handoff Note

This N1Hub branch sync is contained. Pull `TODO-001` next unless the operator explicitly reopens another Real/Dream hub.
