---
name: codex-spark-coder
description: Use GPT-5.3-Codex-Spark as a code-first overlay on top of the N1Hub TO-DO Executor for bounded implementation work.
---

# GPT-5.3-Codex-Spark Coder

Use this skill when the operator explicitly wants `GPT-5.3-Codex-Spark` to write code or when one bounded packet is clearly implementation-heavy and should bias toward coding rather than broad planning.

This is an overlay skill, not a new repo-law mode. The owning lane remains `TO-DO Executor`.

## Read Order

1. `README.md`
2. `AGENTS.md`
3. `CODEX.md`
4. `CONTEXT.md`
5. `MEMORY.md`
6. `TO-DO/README.md`
7. `TO-DO/AGENT_OPERATING_MODES.md`
8. `TO-DO/CODEX_SPARK_EXECUTION_PROFILE.md`
9. `TO-DO/HOT_QUEUE.md`
10. the target task file in `TO-DO/tasks/`
11. the exact code, tests, scripts, and contracts named by the task packet

## Default Loop

1. Confirm the packet is a real bounded coding task rather than a planning or governance request.
2. Inspect the exact code and tests in scope before editing.
3. Make the smallest high-leverage code change that materially advances the packet.
4. Run the narrowest sufficient verification for that code slice.
5. Update the task packet and queue truth if status, evidence, or handoff changed.

## Coding Posture

- prefer code, tests, scripts, contracts, and types over decorative prose
- keep documentation edits minimal and only when they support the code change or packet truth
- do not rewrite architecture or root-doc doctrine just because a coding lane was requested
- favor bounded implementation slices over sweeping refactors
- treat verification as part of the implementation, not as optional polish

## Task Selection

- use `TO-DO/CODEX_SPARK_EXECUTION_PROFILE.md` to decide whether a packet is an excellent fit, mixed fit, or poor fit for this overlay
- prefer the current coding-heavy pull set from that profile instead of free-picking across the whole queue
- if the profile says a task is mixed-fit or dependency-blocked, do not force it just because the model is available
- treat the profile's `Current Fields of Activity`, `Concrete Work Packages Now`, and `Default First Job` sections as the current operating worklist for this model

## Handoff Rules

- stay in this skill only when the request is already classified as `queue_execution`
- hand back to `skills/todo-executor/SKILL.md` when the model-specific overlay no longer matters
- hand back to `skills/n1/SKILL.md` when the next move is baton routing, multi-surface sync, or mode selection
- hand back to `skills/personal-ai-assistant/SKILL.md` when the task boundary collapses into planning or architecture synthesis

## Rules

- do not invent a new owner lane; this overlay rides on `TO-DO Executor`
- do not widen scope beyond the task packet just because the model is code-strong
- do not claim implementation success without command proof
- do not convert a code-writing request into a repo-law rewrite unless the packet explicitly owns that surface
