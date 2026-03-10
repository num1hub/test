# TODO-030 N-Infinity Atomic Retain-Dream Sync

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Branch Steward Agent`
- Cluster: `Real/Dream governance`

## Goal

Make the first downstream N-Infinity atomic trio explicit without promoting Dream over the stronger real-side statements of the current `weaver`, `parliament`, and `suggestion-agent` role contracts.

## Why Now

`TODO-028` and `TODO-029` contained the top-level `n-infinity` and `project.n-infinity` hub splits, but the first downstream atomic trio still carried older Dream-side language that partly read like a shadow description of already-live runtime or lane behavior. Real already matches current repository truth: `weaver` is the live bounded resonance-scan lane, `parliament` is the live triad arbitration lane, and `suggestion-agent` is the current advisory recommendation lane. This packet makes those role splits explicit and keeps Dream future-facing.

## Scope

- `data/capsules/capsule.foundation.n-infinity.weaver.v1.json`
- `data/capsules/capsule.foundation.n-infinity.weaver.v1@dream.json`
- `data/capsules/capsule.foundation.n-infinity.parliament.v1.json`
- `data/capsules/capsule.foundation.n-infinity.parliament.v1@dream.json`
- `data/capsules/capsule.foundation.n-infinity.suggestion-agent.v1.json`
- `data/capsules/capsule.foundation.n-infinity.suggestion-agent.v1@dream.json`
- `docs/ninfinity.md`
- `lib/ninfinity/registry.ts`
- `TO-DO/HOT_QUEUE.md`
- `TO-DO/REAL_DREAM_FRONT.md`
- `MEMORY.md`

## Non-Goals

- no runtime daemon, workflow, or registry-code rewrite
- no wider N-Infinity swarm redesign
- no promotion of future Dream swarm doctrine into Real

## Deliverables

- updated real atomic capsules that explicitly own the current role contracts for `weaver`, `parliament`, and `suggestion-agent`
- updated dream atomic capsules that keep only future-only delta for the same trio
- queue, field brief, and durable memory surfaces synced to the new explicit interpretation

## Context Snapshot

- `TODO-028` and `TODO-029` already made the top-level N-Infinity hub pair explicit
- `docs/ninfinity.md` and `lib/ninfinity/registry.ts` confirm `weaver` and `parliament` as current registered runtime lanes
- `suggestion-agent` is a current advisory role contract, but not yet a self-directed daemon with independent mutation authority
- the next honest branch-facing continuation is a bounded atomic cluster, not reopening the completed hub wave

## Dependencies

- hard: [TODO-028 N-Infinity Retain-Dream Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-028-n-infinity-retain-dream-sync.md)
- hard: [TODO-029 N-Infinity Project Retain-Dream Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-029-project-n-infinity-retain-dream-sync.md)

## Source Signals

- [TODO-028 N-Infinity Retain-Dream Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-028-n-infinity-retain-dream-sync.md)
- [TODO-029 N-Infinity Project Retain-Dream Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-029-project-n-infinity-retain-dream-sync.md)
- [Real Dream Front](/home/n1/n1hub.com/TO-DO/REAL_DREAM_FRONT.md)
- `docs/ninfinity.md`
- `lib/ninfinity/registry.ts`

## Entry Checklist

- compare the real and dream pairs for `weaver`, `parliament`, and `suggestion-agent`
- confirm current live role truth from `docs/ninfinity.md`, `lib/ninfinity/registry.ts`, and existing A2C runtime surfaces
- keep the pass inside the atomic trio plus branch execution surfaces

## Implementation Plan

1. Compare the real and dream atomic pairs against live N-Infinity and A2C runtime surfaces.
2. Make the current real-side authority explicit in the three real capsules.
3. Rewrite the three dream capsules so they keep only future topology, governance, and option-engine delta.
4. Sync queue, field brief, and durable memory to the new explicit atomic interpretation.
5. Validate the six capsules and refresh continuity artifacts.

## Mode and Skill

- Primary mode: `TO-DO Executor`

## System Prompt Slice

```text
You are the Branch Steward Agent. Keep the first downstream N-Infinity atomic trio future-facing in Dream, but make Real the explicit canonical source of the current weaver, parliament, and suggestion-agent role contracts.
```

## Operator Command Pack

- `Take TODO-030 and make the first downstream N-Infinity atomic trio explicit without promoting Dream over Real.`
- `Work as Branch Steward Agent and sync weaver, parliament, and suggestion-agent around real-first current role law and dream-only future delta.`

## Acceptance Criteria

- the real `weaver`, `parliament`, and `suggestion-agent` capsules explicitly own their current live role contracts
- the dream trio explicitly keeps future-only delta and stops shadowing current runtime truth
- no runtime daemon code, workflow law, or root-doc law is widened
- queue truth, field brief, and durable memory all reflect the new atomic split cleanly

## Verification

- `npm run validate -- --fix data/capsules/capsule.foundation.n-infinity.weaver.v1.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --fix data/capsules/capsule.foundation.n-infinity.weaver.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --fix data/capsules/capsule.foundation.n-infinity.parliament.v1.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --fix data/capsules/capsule.foundation.n-infinity.parliament.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --fix data/capsules/capsule.foundation.n-infinity.suggestion-agent.v1.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --fix data/capsules/capsule.foundation.n-infinity.suggestion-agent.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- `npm run check:anchors:full`
- `git diff --check`
- `npm run n1:update:once -- --task TODO-001`

## Evidence and Artifacts

- validation report: `reports/validation-2026-03-10T08-27-35-314Z.md`
- N1 continuity reports:
  - `reports/n1/automated-update/n1-iter-2026-03-10T08-27-35Z.md`
  - `reports/n1/repo-sync/n1-sync-2026-03-10T08-27-35Z.md`
  - `reports/n1/orchestration/n1-orch-2026-03-10T08-27-35Z.md`

## Execution Outcome

- Real `weaver` now explicitly owns the current bounded resonance-scan and reviewable merge-report contract.
- Real `parliament` now explicitly owns the current triad arbitration and gate-report contract.
- Real `suggestion-agent` now explicitly owns the current advisory recommendation lane without claiming autonomous mutation authority.
- Dream for the trio now keeps only future topology, deliberation, and option-engine delta.
- Queue, field-brief, and durable-memory surfaces now describe this downstream atomic containment explicitly.

## Risks

- over-promoting Dream would weaken the stronger real-side statement of current atomic role truth
- understating the current Suggestion Agent contract would accidentally imply a live autonomous daemon that the repo does not yet have
- leaving Dream too broad would keep the downstream branch interpretation fuzzy for the next agent

## Stop Conditions

- the work starts mutating runtime daemon code, workflow law, or root-doc law
- the branch split cannot be isolated to the atomic trio and branch execution surfaces

## Queue Update Rule

- if only part of the trio lands, keep the packet `ACTIVE`
- if all three pairs and branch execution surfaces are synced and validated, mark the packet `DONE`

## Handoff Note

This downstream atomic branch sync is contained. Pull `TODO-001` next unless the operator explicitly continues capsule-only branch work deeper into other N-Infinity atomics or moves to the promotion-test frontier.
