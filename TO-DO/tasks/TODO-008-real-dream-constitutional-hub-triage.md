# TODO-008 Real Dream Constitutional Hub Triage

- Priority: `P0`
- Execution Band: `NOW`
- Status: `READY`
- Owner Lane: `Branch Steward Agent`
- Cluster: `Real/Dream governance`

## Goal

Take the highest-drift Real/Dream hubs and force an explicit decision on each one: `promote`, `retain-dream`, or `rewrite`. This task is about branch judgment, not about passive observation.

## Why Now

The strongest divergence is concentrated in constitutional and runtime hubs such as `key-agents`, `vault-stewardship-swarm`, `capsuleos`, `n1hub`, `a2c-link`, `branch-steward-agent`, and `symphony-observability`. Leaving those hubs in indefinite speculative drift weakens both Real and Dream.

## Scope

- `data/capsules/capsule.foundation.key-agents.v1*.json`
- `data/capsules/capsule.foundation.vault-stewardship-swarm.v1*.json`
- `data/capsules/capsule.foundation.capsule-librarian-agent.v1*.json`
- `data/capsules/capsule.foundation.capsuleos.v1*.json`
- `data/capsules/capsule.foundation.n1hub.v1*.json`
- `data/capsules/capsule.foundation.a2c-link.v1*.json`
- `data/capsules/capsule.foundation.n-infinity.weaver.v1*.json`
- `data/capsules/capsule.foundation.branch-steward-agent.v1*.json`
- `data/capsules/capsule.foundation.symphony-observability.v1*.json`
- `data/capsules/capsule.foundation.n1hub-gold-master.v1*.json`
- `docs/real-dream-diff.md`
- `lib/diff/*`

## Non-Goals

- no mass editing outside the named hub set
- no automatic Dream-to-Real merge just because a capsule is ambitious
- no new doctrine written without checking code and docs reality

## Deliverables

- one decision matrix for the named hub set
- evidence-backed status for each hub: `promote`, `retain-dream`, or `rewrite`
- follow-up tasks for every hub that cannot be promoted cleanly
- explicit reasoning that cites current repo surfaces, not only capsule prose

## Context Snapshot

- top drift hubs include `key-agents`, `vault-stewardship-swarm`, `capsuleos`, `n1hub`, `a2c-link`, `branch-steward-agent`, and `symphony-observability`
- these hubs are constitutional or runtime-adjacent, so indefinite Dream drift here weakens branch trust

## Dependencies

- hard: consume the latest verified audit from TODO-007 before classifying hub decisions
- soft: use the current diff and branch runtime surfaces to avoid capsule-only reasoning

## Source Signals

- TO-DO/tasks/TODO-007-real-dream-global-audit.md
- TO-DO/REAL_DREAM_FRONT.md

## Entry Checklist

- read the output of `TODO-007` first; do not triage from stale branch intuition
- inspect the named hub set against current docs, runtime files, and tests before classifying a hub
- confirm that the work stays inside the ten named hub families and does not fan out across the entire vault

## Implementation Plan

1. Read the audit output from `TODO-007`.
2. Review the named hub set against live docs, code, and tests.
3. Force one explicit branch decision per hub: `promote`, `retain-dream`, or `rewrite`.
4. Split unresolved work into bounded follow-up tasks.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/todo-executor/SKILL.md`

## System Prompt Slice

```text
You are the Branch Steward Agent. Triage the highest-drift constitutional hubs against live repository reality and force an explicit branch decision for each one without drifting into mass editing.
```

## Operator Command Pack

- `Take TODO-008 and force branch decisions on the highest-drift constitutional hubs.`
- `Work as Branch Steward Agent: promote, retain, or rewrite each named hub against live repo truth.`

## Acceptance Criteria

- all ten named hubs have an explicit branch decision
- the decision rationale references code, docs, tests, or runtime surfaces where relevant
- no hub is left in an unclassified “maybe later” state
- resulting follow-up work is split into bounded next tasks instead of one giant rewrite

## Verification

- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- `npx vitest run __tests__/lib/diff/*.test.ts __tests__/api/diff.test.ts __tests__/api/diff-apply.test.ts`

## Evidence and Artifacts

- update this task packet with a decision matrix or explicit link to where that matrix now lives
- update `TO-DO/REAL_DREAM_FRONT.md` if the constitutional hotspot picture changes materially
- create bounded follow-up tasks for every hub that lands in `rewrite`
- refresh `TO-DO/HOT_QUEUE.md` if new follow-up work changes the branch wave order

## Risks

- triage may drift into essay-writing instead of decision-making
- Dream may preserve useful future structure that is not ready for promotion yet

## Stop Conditions

- the work starts reviewing capsules outside the named hub set
- a hub cannot be classified without a separate new audit or implementation task

## Queue Update Rule

- if some hubs are classified but the set is incomplete, keep the task `ACTIVE` and record which hubs remain
- if classification depends on missing audit evidence or a new branch policy question, mark the task `BLOCKED`
- if all ten hubs have explicit decisions and follow-up splits, mark this task `DONE` and move the next unresolved branch item to the front

## Handoff Note

Do not review every capsule in the vault. Stay on the named hub set, make a hard decision for each hub, and write follow-up tasks for the unresolved ones.
