# TODO-033 GPT-5.3-Codex-Spark Work Domains

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Execution Systems Agent`
- Cluster: `Execution systems and model overlays`

## Goal

Turn the `GPT-5.3-Codex-Spark` profile into a concrete work-domain map so the model has explicit fields of activity, current work packages, and a first-job ladder inside N1Hub.

## Why Now

`TODO-032` gave the model a fit matrix and pull preference, but the operator explicitly wants the model to have concrete work and fields of activity. That means the profile must name its current domains, current packets, and default first job in repo-native language.

## Scope

- `TO-DO/CODEX_SPARK_EXECUTION_PROFILE.md`
- `skills/codex-spark-coder/SKILL.md`
- `TO-DO/HOT_QUEUE.md`
- `MEMORY.md`

## Non-Goals

- no global queue reorder
- no new repo-law mode
- no runtime code change

## Deliverables

- explicit fields of activity for `GPT-5.3-Codex-Spark`
- explicit current concrete work packages tied to real `TODO-*` packets
- explicit default first-job ladder for unnamed coding requests

## Context Snapshot

- `TODO-031` integrated the coding overlay
- `TODO-032` added fit guidance
- the missing layer was concrete work assignment language inside the profile itself

## Dependencies

- hard: [TODO-032 GPT-5.3-Codex-Spark TO-DO Profile](/home/n1/n1hub.com/TO-DO/tasks/TODO-032-gpt53-codex-spark-todo-profile.md)

## Source Signals

- repeated operator request to make the model's work concrete
- `TO-DO/CODEX_SPARK_EXECUTION_PROFILE.md`
- active coding-heavy packets in `TO-DO/HOT_QUEUE.md`

## Entry Checklist

- compare excellent-fit packets against current dependencies
- keep the result subordinate to the real queue, not a replacement for it

## Implementation Plan

1. add fields of activity to the model profile
2. add the current concrete work-package map
3. add a default first-job ladder
4. sync the skill, queue, and memory surfaces

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/codex-spark-coder/SKILL.md`

## System Prompt Slice

```text
You are the Execution Systems Agent. Turn the GPT-5.3-Codex-Spark profile from abstract fit guidance into a concrete work-domain map with explicit current packets and a default first-job ladder.
```

## Operator Command Pack

- `Give GPT-5.3-Codex-Spark concrete work and fields of activity inside TO-DO.`
- `Take TODO-033 and make the Codex Spark work domains explicit.`

## Acceptance Criteria

- the profile names concrete fields of activity
- the profile names current concrete work packages
- the profile names a default first-job ladder for unnamed coding requests
- the result stays subordinate to `TO-DO/HOT_QUEUE.md`

## Verification

- `npm run check:anchors:full`
- `git diff --check`
- `npm run n1:update:once -- --task TODO-001`

## Evidence and Artifacts

- updated profile and skill surfaces
- N1 continuity reports:
  - `reports/n1/automated-update/n1-iter-2026-03-10T08-49-02Z.md`
  - `reports/n1/repo-sync/n1-sync-2026-03-10T08-49-02Z.md`
  - `reports/n1/orchestration/n1-orch-2026-03-10T08-49-02Z.md`

## Risks

- over-specifying the model as if it owned the queue
- making the work domains stale if they drift too far from active task truth

## Stop Conditions

- the only way to proceed is to replace the queue rather than subordinate the profile to it

## Queue Update Rule

- keep this task `ACTIVE` if the profile was updated but the skill or queue references are stale
- mark it `DONE` once fields, packages, ladder, and references are aligned and verified

## Handoff Note

This is still a model-specific profile, not a second planner. The queue remains global truth; the profile just makes the current coding work for `GPT-5.3-Codex-Spark` explicit.
