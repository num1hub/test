# TODO-023 Personal AI Assistant Retain-Dream Sync

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Branch Steward Agent`
- Cluster: `Real/Dream governance`

## Goal

Make the `personal-ai-assistant` branch split explicit without promoting Dream over the stronger real-side assistant carrier contract.

## Why Now

`TODO-008` classified `personal-ai-assistant` as `retain-dream`, but that decision was still implicit. The Dream overlay mixed valid future assistant doctrine with language that could still be misread as current runtime truth. This packet turns the branch decision into explicit capsule law.

## Scope

- `data/capsules/capsule.foundation.personal-ai-assistant.v1.json`
- `data/capsules/capsule.foundation.personal-ai-assistant.v1@dream.json`
- `skills/personal-ai-assistant/SKILL.md`
- `skills/n1/SKILL.md`
- `TO-DO/HOT_QUEUE.md`
- `TO-DO/REAL_DREAM_FRONT.md`

## Non-Goals

- no assistant runtime code changes
- no root-doc doctrine rewrite
- no attempt to promote the full Dream assistant roadmap into Real

## Deliverables

- updated real assistant capsule with explicit canonical current-carrier rule
- updated dream assistant capsule that keeps only future-facing assistant delta
- queue and Real/Dream front surfaces synced to the new explicit branch interpretation

## Context Snapshot

- `TODO-008` classified `capsule.foundation.personal-ai-assistant.v1` as `retain-dream`
- real is the current carrier truth for `N1`, bounded routing, approval discipline, and live assistant posture
- dream remains valuable as future doctrine for richer multimodal, orchestration, and memory-backed assistant behavior

## Dependencies

- hard: [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)

## Source Signals

- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [Real Dream Front](/home/n1/n1hub.com/TO-DO/REAL_DREAM_FRONT.md)
- `skills/personal-ai-assistant/SKILL.md`
- `skills/n1/SKILL.md`

## Entry Checklist

- compare the real and dream personal assistant hubs before editing
- confirm the live assistant carrier truth from the N1 and personal-assistant skills
- keep the work inside the assistant capsule pair and branch execution surfaces

## Implementation Plan

1. Compare the real and dream assistant hubs against the live N1 carrier surfaces.
2. Make the current real-side assistant contract explicit in the real capsule.
3. Rewrite Dream so it keeps only future-facing assistant delta.
4. Sync the queue and field brief so the branch interpretation is explicit.
5. Validate both capsules and refresh N1 continuity artifacts.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skills: `skills/personal-ai-assistant/SKILL.md`, `skills/n1/SKILL.md`

## System Prompt Slice

```text
You are the Branch Steward Agent. Keep Personal AI Assistant future-facing in Dream, but make Real the explicit canonical statement of the current N1 carrier contract.
```

## Operator Command Pack

- `Take TODO-023 and make the Personal AI Assistant branch split explicit without promoting Dream over Real.`
- `Work as Branch Steward Agent and sync the assistant capsule pair around real-first current truth and dream-only future delta.`

## Acceptance Criteria

- the real assistant capsule explicitly owns the current N1 carrier contract
- the dream assistant capsule explicitly keeps future assistant delta only
- no runtime code or root-doc doctrine is widened
- queue truth and field brief both reflect the new explicit branch split

## Verification

- `npm run validate -- --fix data/capsules/capsule.foundation.personal-ai-assistant.v1.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --fix data/capsules/capsule.foundation.personal-ai-assistant.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- `git diff --check`
- `npm run n1:update:once -- --task TODO-001`

## Evidence and Artifacts

- validation report: `reports/validation-2026-03-09T20-45-12-592Z.md`
- refresh teamwork, repo-sync, and orchestration artifacts on completion

## Execution Outcome

- Real `personal-ai-assistant` now explicitly owns the current `N1` carrier contract, bounded routing posture, and human-governed escalation law.
- Dream `personal-ai-assistant` now keeps future-only assistant delta instead of shadowing current runtime truth.
- Queue and field-brief surfaces now describe the assistant branch split explicitly.

## Risks

- over-promoting Dream would weaken the stronger real-side statement of current assistant behavior
- leaving Dream too broad would keep branch interpretation fuzzy for the next agent

## Stop Conditions

- the work starts mutating assistant runtime code or root-doc law
- the branch split cannot be isolated to the assistant capsule pair and branch execution surfaces

## Queue Update Rule

- if only one assistant branch is updated, keep the packet `ACTIVE`
- if the assistant pair and branch execution surfaces are synced and validated, mark the packet `DONE`

## Handoff Note

This assistant branch sync is contained. Pull `TODO-001` next unless the operator explicitly reopens another Real/Dream hub.
