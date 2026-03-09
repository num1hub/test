# TODO-021 Vault Stewardship Swarm Dream Rewrite

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Vault Steward Agent`
- Cluster: `Vault Steward / Real-Dream operations`

## Goal

Rewrite the Dream overlay for `capsule.foundation.vault-stewardship-swarm.v1` so it expresses forward-looking stewardship doctrine without collapsing into stale prose or duplicating live operational residue.

## Why Now

`TODO-008` classified `vault-stewardship-swarm` as `rewrite`. The real hub and current Vault Steward runtime already encode the live swarm shape, while the Dream overlay is too thin and stale to guide future branch work honestly.

## Scope

- `data/capsules/capsule.foundation.vault-stewardship-swarm.v1.json`
- `data/capsules/capsule.foundation.vault-stewardship-swarm.v1@dream.json`
- `data/capsules/capsule.operations.vault-steward.latest.v1@dream.json`
- `data/capsules/capsule.operations.vault-steward.plan.v1@dream.json`
- `data/capsules/capsule.operations.vault-steward.queue.v1@dream.json`
- `lib/agents/vaultSteward.ts`
- `lib/agents/vaultSteward/maintenance-artifacts.ts`
- `docs/agents-operations.md`
- `TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md`
- `TO-DO/tasks/TODO-009-vault-steward-dream-only-operations-review.md`

## Non-Goals

- no broad Vault Steward runtime refactor
- no cleanup of unrelated dream overlays
- no merging of the stewardship hub with the three dream-only operational capsules

## Deliverables

- rewritten Dream capsule for `vault-stewardship-swarm`
- explicit distinction between hub doctrine and the operational `latest/plan/queue` capsules
- residual note if further stewardship decomposition is still required

## Context Snapshot

- `TODO-008` measured this hub at score `156`
- triage result: `rewrite`
- the only current dream-only outliers in the live vault are the Vault Steward operational capsules reviewed by `TODO-009`

## Dependencies

- `hard:` [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- `soft:` [TODO-009 Vault Steward Dream-Only Operations Review](/home/n1/n1hub.com/TO-DO/tasks/TODO-009-vault-steward-dream-only-operations-review.md)

## Source Signals

- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [Real Dream Front](/home/n1/n1hub.com/TO-DO/REAL_DREAM_FRONT.md)

## Entry Checklist

- confirm the current real and dream hub capsules before editing
- trace how the live Vault Steward runtime and maintenance artifacts describe the swarm today
- keep the Dream hub distinct from the dream-only operational state capsules

## Implementation Plan

1. Compare the real and dream hub capsules against the named runtime and operational surfaces.
2. Separate present runtime truth from legitimate future stewardship doctrine.
3. Rewrite the Dream hub so it describes the future swarm without pretending the operational capsules are the hub itself.
4. Validate the rewrite and leave a precise decomposition note if needed.

## Execution Outcome

- The Dream hub now starts from live Vault Steward truth instead of from a thin autonomy sketch.
- Current lane stack, `Dream-first` executor posture, diversified maintenance workstreams, cooldown and duplicate suppression, and Dream-only publication of `latest`, `queue`, and `plan` are now treated as `real-first canonical`.
- The rewritten Dream branch now preserves only next-horizon stewardship doctrine: stronger lane contracts, clearer stewardship budgets and swarm-health visibility, promotion-safe maintenance policy, and better auditability across runs.
- The hub now explicitly states that `latest`, `queue`, and `plan` are overwrite-in-place operational mirrors rather than constitutional doctrine.
- The recursive link graph now includes the missing live stewardship seams already encoded in runtime: `agent-context-engineering`, `agent-instruction-surfaces`, `agent-subagents`, `agent-evals-and-traces`, `agent-control-plane`, `agent-daemon`, and `agent-async-assignment`.
- Residual split pressure remains in atomic stewardship/runtime capsules and not in this hub packet. The next decomposition pressure belongs to lane-specific or control-plane capsules, not to the Dream hub itself.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/todo-executor/SKILL.md`

## System Prompt Slice

```text
You are the Vault Steward Agent. Rewrite the Dream vault-stewardship-swarm hub so it stays future-facing, branch-safe, and clearly distinct from live operational residue.
```

## Operator Command Pack

- `Take TODO-021 and rewrite the Dream vault-stewardship-swarm hub around current Vault Steward truth.`
- `Work as Vault Steward Agent and separate future stewardship doctrine from the dream-only operational capsules.`

## Acceptance Criteria

- the Dream hub is no longer stale or too thin compared with the real runtime
- operational capsules and hub doctrine are explicitly distinct
- the rewrite stays branch-safe and future-facing instead of duplicating live operational state
- any further split pressure is recorded explicitly

## Verification

- `npx vitest run __tests__/lib/vaultSteward.test.ts`
- `npm run validate -- --fix data/capsules/capsule.foundation.vault-stewardship-swarm.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`

## Evidence and Artifacts

- rewritten capsule: [capsule.foundation.vault-stewardship-swarm.v1@dream.json](/home/n1/n1hub.com/data/capsules/capsule.foundation.vault-stewardship-swarm.v1@dream.json)
- single-file validation with vault context: `npm run validate -- --fix data/capsules/capsule.foundation.vault-stewardship-swarm.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- full vault validation report: [validation-2026-03-09T20-25-47-668Z.md](/home/n1/n1hub.com/reports/validation-2026-03-09T20-25-47-668Z.md)
- branch audit dry-run: `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- `TODO-009` did not need changes because lifecycle interpretation for the three Dream-only operational capsules remained the same

## Risks

- the rewrite may accidentally copy operational residue into doctrine
- the rewrite may overcorrect and erase legitimate future stewardship direction

## Stop Conditions

- the rewrite requires a deeper runtime refactor instead of a bounded capsule update
- the task starts mutating the dream-only operational capsules without explicit lifecycle law

## Queue Update Rule

- if the rewrite is partially drafted but not validated, keep the task `ACTIVE`
- if lifecycle truth from `TODO-009` is still unresolved and blocks honest rewriting, mark the task `BLOCKED`
- if the Dream hub is rewritten, validated, and residual split pressure is explicit, mark the task `DONE`

## Handoff Note

`TODO-021` is closed. Continue Front A with [TODO-022 Workspace Selective Promotion](/home/n1/n1hub.com/TO-DO/tasks/TODO-022-workspace-selective-promotion.md).
