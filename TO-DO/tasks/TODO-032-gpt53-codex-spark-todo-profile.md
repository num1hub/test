# TODO-032 GPT-5.3-Codex-Spark TO-DO Profile

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Execution Systems Agent`
- Cluster: `Execution systems and model overlays`

## Goal

Work out the actual TO-DO worklist for `GPT-5.3-Codex-Spark` so the coding overlay has a repo-native pull preference, fit matrix, and anti-drift rules instead of relying on chat memory.

## Why Now

`TODO-031` integrated the model as a coding overlay, but it still did not answer the operational question: which current tasks should this model actually pull, which ones should it wait on, and which ones should it avoid as a first move. Without that layer, the model still has to infer its fit from the entire queue.

## Scope

- `TO-DO/CODEX_SPARK_EXECUTION_PROFILE.md`
- `TO-DO/README.md`
- `TO-DO/AGENT_OPERATING_MODES.md`
- `TO-DO/HOT_QUEUE.md`
- `CONTEXT.md`
- `MEMORY.md`
- `skills/codex-spark-coder/SKILL.md`

## Non-Goals

- no new repo-law mode
- no runtime execution code changes
- no reordering of the global queue for every agent

## Deliverables

- one model-specific TO-DO execution profile
- one fit matrix over the current queue frontier
- one pull-preference order for `GPT-5.3-Codex-Spark`
- one anti-drift rule set describing what this overlay should not pull first

## Context Snapshot

- `TODO-031` already created the model overlay and route note
- current queue truth lives in `TO-DO/HOT_QUEUE.md`
- the remaining missing piece is model-specific task-selection guidance, not another skill or another mode

## Dependencies

- hard: [TODO-031 GPT-5.3-Codex-Spark Coding Lane](/home/n1/n1hub.com/TO-DO/tasks/TODO-031-gpt53-codex-spark-coding-lane.md)

## Source Signals

- explicit operator request to “work out TO-DO” for `GPT-5.3-Codex-Spark`
- `TO-DO/HOT_QUEUE.md`
- `TO-DO/tasks/TODO-001-a2c-query-safety.md`
- `TO-DO/tasks/TODO-016-a2c-user-input-intake-contract.md`
- `TO-DO/tasks/TODO-017-a2c-todo-packet-builder.md`
- `TO-DO/tasks/TODO-019-a2c-user-input-test-net.md`
- `TO-DO/tasks/TODO-011-real-dream-promotion-test-net.md`

## Entry Checklist

- read the current queue frontier first
- compare coding-heavy packets against dependency order and verification shape
- keep the result as a profile for this model, not as a second queue

## Implementation Plan

1. classify current `READY` packets by fit for `GPT-5.3-Codex-Spark`
2. define the model-specific pull preference
3. encode the result into `TO-DO` and skill/context surfaces
4. verify the governed docs and continuity surfaces

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/codex-spark-coder/SKILL.md`

## System Prompt Slice

```text
You are the Execution Systems Agent. Work out the repo-native TO-DO profile for GPT-5.3-Codex-Spark so the model knows which bounded packets to pull first, which ones to wait on, and which ones not to treat as first-fit coding work.
```

## Operator Command Pack

- `Work out the TO-DO for GPT-5.3-Codex-Spark and encode it into the repo.`
- `Take TODO-032 and define the model-specific worklist for Codex Spark without inventing a second queue.`

## Acceptance Criteria

- `GPT-5.3-Codex-Spark` has a repo-native TO-DO execution profile
- the profile names current excellent-fit, mixed-fit, and poor-fit packets
- the profile states a pull preference that respects the active queue and dependency chain
- the result is wired into the existing mode and skill surfaces

## Verification

- `npm run check:anchors:full`
- `git diff --check`
- `npm run n1:update:once -- --task TODO-001`

## Evidence and Artifacts

- model profile file under `TO-DO/`
- updated mode/skill/context references
- N1 continuity reports:
  - `reports/n1/automated-update/n1-iter-2026-03-10T08-44-51Z.md`
  - `reports/n1/repo-sync/n1-sync-2026-03-10T08-44-51Z.md`
  - `reports/n1/orchestration/n1-orch-2026-03-10T08-44-51Z.md`

## Risks

- creating a second queue instead of a profile would fragment task truth
- overfitting the profile to one day’s queue state would make it brittle

## Stop Conditions

- the only way forward is to reorder the main queue globally rather than define a model-specific pull preference
- the profile starts behaving like a new repo-law mode instead of an executor overlay

## Queue Update Rule

- keep this task `ACTIVE` if the profile exists but is not yet wired into the relevant mode or skill surfaces
- mark it `DONE` once the profile, references, and continuity surfaces are aligned and verified

## Handoff Note

This profile should stay subordinate to the real queue. It tells `GPT-5.3-Codex-Spark` how to choose from the current frontier; it does not replace `TO-DO/HOT_QUEUE.md` as the source of global priority truth.
