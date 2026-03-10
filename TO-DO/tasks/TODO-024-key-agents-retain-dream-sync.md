# TODO-024 Key Agents Retain-Dream Sync

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Branch Steward Agent`
- Cluster: `Real/Dream governance`

## Goal

Make the `key-agents` branch split explicit without promoting Dream over the stronger real-side map of the live agent topology.

## Why Now

`TODO-008` classified `key-agents` as `retain-dream`, but that decision was still implicit. The Dream overlay preserved valid future swarm-coordination doctrine, while Real already matched the lane map visible in queue law and N1 orchestration. This packet turns that branch interpretation into explicit capsule law.

## Scope

- `data/capsules/capsule.foundation.key-agents.v1.json`
- `data/capsules/capsule.foundation.key-agents.v1@dream.json`
- `TO-DO/LANE_OWNERSHIP_MAP.md`
- `lib/agents/n1/orchestration.ts`
- `TO-DO/HOT_QUEUE.md`
- `TO-DO/REAL_DREAM_FRONT.md`

## Non-Goals

- no runtime orchestration code changes
- no root-doc doctrine rewrite
- no attempt to promote the full Dream topology roadmap into Real

## Deliverables

- updated real Key Agents capsule with explicit canonical live-topology rule
- updated dream Key Agents capsule that keeps only future coordination delta
- queue and Real/Dream front surfaces synced to the new explicit branch interpretation

## Context Snapshot

- `TODO-008` classified `capsule.foundation.key-agents.v1` as `retain-dream`
- real already aligns with the visible current lane topology in `TO-DO/LANE_OWNERSHIP_MAP.md` and `lib/agents/n1/orchestration.ts`
- dream remains useful as future doctrine for richer coordination, planning swarm clarity, and stronger operator visibility

## Dependencies

- hard: [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)

## Source Signals

- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [Real Dream Front](/home/n1/n1hub.com/TO-DO/REAL_DREAM_FRONT.md)
- `TO-DO/LANE_OWNERSHIP_MAP.md`
- `lib/agents/n1/orchestration.ts`

## Entry Checklist

- compare the real and dream Key Agents hubs before editing
- confirm the live current lane topology from queue-lane and orchestration surfaces
- keep the work inside the Key Agents capsule pair and branch execution surfaces

## Implementation Plan

1. Compare the real and dream Key Agents hubs against the live lane-topology surfaces.
2. Make the current real-side role map explicit in the real capsule.
3. Rewrite Dream so it keeps only future coordination and topology delta.
4. Sync the queue and field brief so the branch interpretation is explicit.
5. Validate both capsules and refresh N1 continuity artifacts.

## Mode and Skill

- Primary mode: `TO-DO Executor`

## System Prompt Slice

```text
You are the Branch Steward Agent. Keep Key Agents future-facing in Dream, but make Real the explicit canonical source of the live agent lane topology.
```

## Operator Command Pack

- `Take TODO-024 and make the Key Agents branch split explicit without promoting Dream over Real.`
- `Work as Branch Steward Agent and sync the Key Agents capsule pair around real-first current topology and dream-only future coordination delta.`

## Acceptance Criteria

- the real Key Agents capsule explicitly owns the current live role topology
- the dream Key Agents capsule explicitly keeps future coordination delta only
- no runtime orchestration code or root-doc law is widened
- queue truth and field brief both reflect the new explicit branch split

## Verification

- `npm run validate -- --fix data/capsules/capsule.foundation.key-agents.v1.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --fix data/capsules/capsule.foundation.key-agents.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- `git diff --check`
- `npm run n1:update:once -- --task TODO-001`

## Evidence and Artifacts

- validation report: `reports/validation-2026-03-09T20-47-41-663Z.md`
- refresh teamwork, repo-sync, and orchestration artifacts on completion

## Execution Outcome

- Real `key-agents` now explicitly owns the current live agent lane topology and role-map law.
- Dream `key-agents` now keeps future-only swarm-coordination and topology delta.
- Queue and field-brief surfaces now describe the Key Agents branch split explicitly.

## Risks

- over-promoting Dream would weaken the stronger real-side statement of the live lane map
- leaving Dream too broad would keep branch interpretation fuzzy for the next agent

## Stop Conditions

- the work starts mutating orchestration runtime code or root-doc law
- the branch split cannot be isolated to the Key Agents capsule pair and branch execution surfaces

## Queue Update Rule

- if only one Key Agents branch is updated, keep the packet `ACTIVE`
- if the Key Agents pair and branch execution surfaces are synced and validated, mark the packet `DONE`

## Handoff Note

This Key Agents branch sync is contained. Pull `TODO-001` next unless the operator explicitly reopens another Real/Dream hub.
