# TODO-031 GPT-5.3-Codex-Spark Coding Lane

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Execution Systems Agent`
- Cluster: `Execution systems and model overlays`

## Goal

Integrate a repo-native `GPT-5.3-Codex-Spark` coding lane so N1Hub can hand bounded code-writing work to a model-specific executor overlay without inventing a separate repo-law mode.

## Why Now

The operator explicitly wants a coding-oriented lane for `GPT-5.3-Codex-Spark`. N1Hub already has stable assistant, executor, and orchestrator modes, but this model-specific posture was still trapped in chat instead of living in `TO-DO`, skills, and context surfaces. The right move is to add a code-first overlay on top of `TO-DO Executor`, not to fork the whole mode system.

## Scope

- `TO-DO/AGENT_OPERATING_MODES.md`
- `CONTEXT.md`
- `TO-DO/HOT_QUEUE.md`
- `MEMORY.md`
- `skills/codex-spark-coder/SKILL.md`
- `skills/n1/SKILL.md`
- `skills/todo-executor/SKILL.md`

## Non-Goals

- no runtime orchestration code change
- no new repo-law mode beyond the existing `TO-DO Executor`
- no forced model lock-in for every implementation task

## Deliverables

- one dedicated `GPT-5.3-Codex-Spark` coding overlay skill
- one explicit mode-card slice for model-specific code-writing behavior
- one queue-tracked task packet describing this integration
- one routing note showing how `N1` should keep the same queue lane while applying the model overlay

## Context Snapshot

- `TODO-018` already made route-to-skill and handoff-target law explicit across `CONTEXT.md`, `MEMORY.md`, and workspace skills
- `TO-DO Executor` is already the correct repo-law lane for bounded implementation work
- the missing piece was a repo-native coding overlay for a named model, not a brand-new execution mode

## Dependencies

- hard: [TODO-018 N1 User Input Routing Lane](/home/n1/n1hub.com/TO-DO/tasks/TODO-018-n1-user-input-routing-lane.md)

## Source Signals

- explicit operator request for `GPT-5.3-Codex-Spark` as a code-writing model
- `CONTEXT.md`
- `TO-DO/AGENT_OPERATING_MODES.md`
- `skills/todo-executor/SKILL.md`

## Entry Checklist

- confirm the current route class for bounded coding requests
- confirm the existing `TO-DO Executor` skill and `N1` routing law before adding a model-specific overlay

## Implementation Plan

1. Define the model-specific coding overlay as a workspace skill.
2. Attach that overlay to `queue_execution` without creating a new repo-law mode.
3. Sync the mode-card, N1 routing, queue, and durable memory surfaces.
4. Run governance proof for the changed documentation and skill surfaces.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/codex-spark-coder/SKILL.md`

## System Prompt Slice

```text
You are running the GPT-5.3-Codex-Spark coding overlay inside N1Hub.
Stay inside the active TO-DO packet, prefer code, tests, scripts, and contracts over decorative prose, and make the smallest high-leverage implementation step that materially advances the task.
Do not turn a coding lane into a planning essay, a root-doc rewrite, or speculative architecture theater.
If the work stops being a bounded coding task, hand the baton back to N1 or the base TO-DO Executor instead of guessing.
```

## Operator Command Pack

- `Use GPT-5.3-Codex-Spark coding lane and execute the selected TODO packet.`
- `Work as Codex Spark Coder: write the code, run the narrow gates, and update the task packet honestly.`

## Acceptance Criteria

- `GPT-5.3-Codex-Spark` has a repo-native coding overlay skill
- `N1` and `TO-DO Executor` both explain how to use that overlay without inventing a new lane
- the hot queue records the integration as real task truth instead of leaving it as chat residue

## Verification

- `npm run check:anchors:full`
- `git diff --check`
- `npm run n1:update:once -- --task TODO-001`

## Evidence and Artifacts

- updated mode-card and routing surfaces
- one workspace skill under `skills/codex-spark-coder/`
- queue and durable-memory surfaces aligned with the new model overlay
- N1 continuity reports:
  - `reports/n1/automated-update/n1-iter-2026-03-10T08-35-43Z.md`
  - `reports/n1/repo-sync/n1-sync-2026-03-10T08-35-43Z.md`
  - `reports/n1/orchestration/n1-orch-2026-03-10T08-35-43Z.md`

## Risks

- creating a fake new mode would fragment the existing assistant/executor/orchestrator law
- leaving the model posture only in chat would make the next cold-start agent rediscover it from scratch

## Stop Conditions

- the only path forward would require runtime code changes rather than queue/context/skill integration
- the model overlay starts conflicting with the existing `TO-DO Executor` boundary

## Queue Update Rule

- keep this task `ACTIVE` if the overlay skill exists but routing or queue truth is still stale
- mark it `DONE` once the skill, mode-card, routing note, and queue surfaces are all aligned and verified

## Handoff Note

This coding-lane integration is contained. The next agent should use `skills/codex-spark-coder/SKILL.md` only as an overlay on top of `TO-DO Executor` for bounded implementation packets, not as a replacement for N1 routing or broader planning modes.
