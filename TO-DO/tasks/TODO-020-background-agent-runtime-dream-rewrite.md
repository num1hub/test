# TODO-020 Background Agent Runtime Dream Rewrite

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Governance Sync Agent`
- Cluster: `Real/Dream governance`

## Goal

Rewrite the Dream overlay for `capsule.foundation.background-agent-runtime.v1` so it reflects the current governed runtime and preserves only legitimate future-facing delta.

## Why Now

`TODO-008` classified `background-agent-runtime` as `rewrite`. It is the highest-drift measured hub in the field, and the current Dream overlay is behind the real runtime surfaces that now govern activation readiness, workspace recon, deep intake, and bounded autonomous operation.

## Scope

- `data/capsules/capsule.foundation.background-agent-runtime.v1.json`
- `data/capsules/capsule.foundation.background-agent-runtime.v1@dream.json`
- `docs/a2c.md`
- `docs/agents-operations.md`
- `lib/a2c/recon.ts`
- `scripts/a2c/activate.ts`
- `TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md`

## Non-Goals

- no runtime refactor of `lib/a2c/*` or `scripts/a2c/*`
- no whole-vault background-agent cleanup
- no blind promotion of Dream prose into Real

## Deliverables

- rewritten Dream capsule for `background-agent-runtime`
- explicit separation between real-first canonical runtime law and future-facing Dream ambition
- residual split note if the rewritten hub still needs atomic follow-up capsules later

## Context Snapshot

- `TODO-008` measured this hub at score `239`
- triage result: `rewrite`
- live repo surfaces already encode activation readiness, workspace recon, deep intake investigation, and bounded autonomous operation

## Dependencies

- `hard:` [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- `soft:` [TODO-010 Real-Only Law Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-010-real-only-law-sync.md)

## Source Signals

- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [Real Dream Front](/home/n1/n1hub.com/TO-DO/REAL_DREAM_FRONT.md)

## Entry Checklist

- confirm the current real and dream capsule contents before editing
- read the named runtime surfaces so the rewrite is based on live repo law rather than old capsule prose
- keep the rewrite bounded to this hub family

## Implementation Plan

1. Compare the real and dream hub capsules against the named runtime surfaces.
2. Mark which claims are already real-first canonical and which claims remain future-facing.
3. Rewrite the Dream hub so it no longer duplicates stale runtime law.
4. Validate the result and leave a precise split note if more decomposition is still needed.

## Execution Outcome

- The Dream hub now treats `activation readiness`, `workspace recon`, `deep intake investigation`, `ignition discipline`, current provider bring-up, and current time-window behavior as `real-first canonical` runtime law instead of future-only prose.
- The rewritten Dream branch now preserves only future-facing delta: stronger lane isolation and replay, policy-shaped dispatch, explicit ingress-to-background baton routing, recurring one-pass iteration mesh, and proof-bearing operator controls.
- The recursive link graph now includes the current runtime governance seams that had gone missing from Dream, including `hybrid-llm-access`, `ai-economics-night-batch`, `agent-instruction-surfaces`, `agent-context-engineering`, `agent-harness-protocol`, `agent-subagents`, `agent-evals-and-traces`, `vault-stewardship-swarm`, and the four pre-mutation gate capsules.
- Residual split pressure still belongs in atomic capsules such as `agent-daemon`, `agent-control-plane`, `agent-memory-state`, `agent-subagents`, `agent-evals-and-traces`, and `vault-stewardship-swarm`, but this packet does not split those surfaces further.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/todo-executor/SKILL.md`

## System Prompt Slice

```text
You are the Governance Sync Agent. Rewrite the Dream background-agent-runtime hub around current governed runtime truth, keep Real canonical, and preserve only legitimate future delta.
```

## Operator Command Pack

- `Take TODO-020 and rewrite the Dream background-agent-runtime hub around current repo runtime truth.`
- `Work as Governance Sync Agent and remove stale runtime folklore from the Dream background-agent-runtime capsule.`

## Acceptance Criteria

- the Dream hub no longer trails the live runtime surfaces named in scope
- the rewrite does not collapse Real and Dream into one branch with duplicated prose
- future-facing content remains explicit and branch-safe
- residual decomposition pressure is noted if it still exists

## Verification

- `npm run validate -- --fix data/capsules/capsule.foundation.background-agent-runtime.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`

## Evidence and Artifacts

- rewritten capsule: [capsule.foundation.background-agent-runtime.v1@dream.json](/home/n1/n1hub.com/data/capsules/capsule.foundation.background-agent-runtime.v1@dream.json)
- single-file validation with vault context: `npm run validate -- --fix data/capsules/capsule.foundation.background-agent-runtime.v1@dream.json --ids-file /tmp/n1hub-capsule-ids.json`
- full vault validation report: [validation-2026-03-09T20-20-23-019Z.md](/home/n1/n1hub.com/reports/validation-2026-03-09T20-20-23-019Z.md)
- branch audit dry-run: `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- no `TODO-008` update was needed because the branch interpretation stayed `rewrite -> done`, not `rewrite -> promote`

## Risks

- the rewrite may accidentally invent runtime capability not backed by code or docs
- the rewrite may blur real-first engineering law into speculative Dream prose

## Stop Conditions

- the task starts requiring runtime code changes just to make the Dream capsule true
- the rewrite spills into unrelated hub families

## Queue Update Rule

- if the rewrite is partially drafted but not validated, keep the task `ACTIVE`
- if the rewrite depends on missing runtime policy or code truth, mark the task `BLOCKED`
- if the rewritten Dream capsule is validated and residual risk is explicit, mark the task `DONE`

## Handoff Note

`TODO-020` is closed. Continue Front A with [TODO-021 Vault Stewardship Swarm Dream Rewrite](/home/n1/n1hub.com/TO-DO/tasks/TODO-021-vault-stewardship-swarm-dream-rewrite.md), then [TODO-022 Workspace Selective Promotion](/home/n1/n1hub.com/TO-DO/tasks/TODO-022-workspace-selective-promotion.md).
