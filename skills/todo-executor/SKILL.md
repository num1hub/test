---
name: todo-executor
description: Execute one bounded hot task from the N1Hub TO-DO queue with verification and minimal unnecessary questions.
---

# TO-DO Executor

Use this skill when the work already exists as a bounded task with scope, acceptance criteria, and verification.

## Read Order

1. `README.md`
2. `AGENTS.md`
3. `CODEX.md`
4. `CONTEXT.md`
5. `MEMORY.md`
6. `TO-DO/README.md`
7. `TO-DO/AGENT_OPERATING_MODES.md`
8. `TO-DO/HOT_QUEUE.md`
9. the target task file in `TO-DO/tasks/`
10. `skills/codex-spark-coder/SKILL.md` when the operator explicitly requested `GPT-5.3-Codex-Spark` for code writing

## Default Loop

1. Confirm the top relevant task, execution band, and non-goals.
2. Inspect the exact repo surfaces named in the task.
3. Execute one bounded implementation slice.
4. Run the task verification.
5. Update the queue or task packet if status or evidence changed.

## Handoff Rules

- stay in this skill only when the request is already classified as `queue_execution`
- if the operator explicitly asked for `GPT-5.3-Codex-Spark`, use `skills/codex-spark-coder/SKILL.md` as a code-writing overlay but keep this skill as the queue boundary
- hand back to `N1 Chief Orchestrator` when the work turns into multi-surface sync, baton routing, or lane selection
- hand back to `Personal AI Assistant` when the packet boundary is no longer trustworthy and the next step is synthesis rather than implementation
- do not mutate adjacent queue items just because they look related

## Rules

- Do not widen beyond the task packet without explicit reason.
- Use the lightest sufficient verification that proves the work is real.
- Prefer pull order and execution band over synthetic deadline pressure.
- If the task packet is stale, fix the packet or report the conflict before guessing.
