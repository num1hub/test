# TODO-027 CapsuleOS Retain-Dream Sync

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Branch Steward Agent`
- Cluster: `Real/Dream governance`

## Goal

Make the `capsuleos` branch split explicit without promoting Dream over the stronger real-side statement of the live CapsuleOS contract.

## Why Now

`TODO-008` classified `capsuleos` as `retain-dream`, but that decision was still implicit. Real already matches the current repository law: CapsuleOS is the live 5-element, 16-gate, lifecycle, and validator-governed memory authority. Dream still adds value as future doctrine for richer control surfaces, clearer decomposition, and stronger branch-aware memory operations. This packet turns that interpretation into explicit capsule law.

## Scope

- `data/capsules/capsule.foundation.capsuleos.v1.json`
- `data/capsules/capsule.foundation.capsuleos.v1@dream.json`
- `docs/validator.md`
- `TO-DO/HOT_QUEUE.md`
- `TO-DO/REAL_DREAM_FRONT.md`

## Non-Goals

- no validator runtime code changes
- no root-doc doctrine rewrite
- no attempt to promote the full Dream CapsuleOS roadmap into Real

## Deliverables

- updated real CapsuleOS capsule with explicit canonical live-contract rule
- updated dream CapsuleOS capsule that keeps only future operating-system delta
- queue and Real/Dream front surfaces synced to the new explicit branch interpretation

## Context Snapshot

- `TODO-008` classified `capsule.foundation.capsuleos.v1` as `retain-dream`
- real already aligns with the live CapsuleOS contract in `docs/validator.md`
- dream remains useful as future doctrine for stronger branch-aware routing, clearer control surfaces, and doctrinal decomposition

## Dependencies

- hard: [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)

## Source Signals

- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [Real Dream Front](/home/n1/n1hub.com/TO-DO/REAL_DREAM_FRONT.md)
- `docs/validator.md`

## Entry Checklist

- compare the real and dream CapsuleOS hubs before editing
- confirm the live current CapsuleOS contract from validator-facing governance surfaces
- keep the work inside the CapsuleOS capsule pair and branch execution surfaces

## Implementation Plan

1. Compare the real and dream CapsuleOS hubs against the live validator-facing contract.
2. Make the current real-side CapsuleOS authority explicit in the real capsule.
3. Rewrite Dream so it keeps only future operating-system and decomposition delta.
4. Sync the queue and field brief so the branch interpretation is explicit.
5. Validate both capsules and refresh N1 continuity artifacts.

## Mode and Skill

- Primary mode: `TO-DO Executor`

## System Prompt Slice

```text
You are the Branch Steward Agent. Keep CapsuleOS future-facing in Dream, but make Real the explicit canonical source of the current CapsuleOS operating contract.
```

## Operator Command Pack

- `Take TODO-027 and make the CapsuleOS branch split explicit without promoting Dream over Real.`
- `Work as Branch Steward Agent and sync the CapsuleOS capsule pair around real-first current operating law and dream-only future delta.`

## Acceptance Criteria

- the real CapsuleOS capsule explicitly owns the current live operating contract
- the dream CapsuleOS capsule explicitly keeps future operating-system delta only
- no validator runtime code or root-doc law is widened
- queue truth and field brief both reflect the new explicit branch split

## Verification

- `npm run validate -- --fix data/capsules/capsule.foundation.capsuleos.v1.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --fix data/capsules/capsule.foundation.capsuleos.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- `git diff --check`
- `npm run n1:update:once -- --task TODO-001`

## Evidence and Artifacts

- validation report: `reports/validation-2026-03-09T20-58-15-308Z.md`
- N1 continuity reports:
  - `reports/n1/automated-update/n1-iter-2026-03-09T20-58-21Z.md`
  - `reports/n1/repo-sync/n1-sync-2026-03-09T20-58-21Z.md`
  - `reports/n1/orchestration/n1-orch-2026-03-09T20-58-21Z.md`

## Execution Outcome

- Real `capsuleos` now explicitly owns the current live operating contract.
- Dream `capsuleos` now keeps future-only control-surface and decomposition delta.
- Queue and field-brief surfaces now describe the CapsuleOS branch split explicitly.

## Risks

- over-promoting Dream would weaken the stronger real-side statement of the current CapsuleOS contract
- leaving Dream too broad would keep branch interpretation fuzzy for the next agent

## Stop Conditions

- the work starts mutating validator runtime code or root-doc law
- the branch split cannot be isolated to the CapsuleOS capsule pair and branch execution surfaces

## Queue Update Rule

- if only one CapsuleOS branch is updated, keep the packet `ACTIVE`
- if the CapsuleOS pair and branch execution surfaces are synced and validated, mark the packet `DONE`

## Handoff Note

This CapsuleOS branch sync is contained. Pull `TODO-001` next unless the operator explicitly reopens another Real/Dream hub.
