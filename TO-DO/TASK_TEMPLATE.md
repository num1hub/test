<!-- @anchor doc:todo.task-template links=doc:todo.index,doc:todo.decomposition-law,doc:todo.hot-queue,doc:todo.execution-protocol,doc:n1hub.codex,doc:n1hub.agents note="Template for new hot execution tasks inside the N1Hub TO-DO buffer." -->
# N1Hub Hot Task Template

Use this template for every new task file in `TO-DO/tasks/`.

```md
# TODO-XXX Task Title

- Priority: `P0 | P1 | P2`
- Execution Band: `NOW | NEXT | LATER`
- Status: `READY | ACTIVE | BLOCKED | DONE`
- Owner Lane: `Agent lane name`
- Cluster: `cluster name or none`

## Goal

State the exact outcome in one or two sentences.

## Why Now

Explain why this task is hot and what risk it reduces.

## Scope

- `path/or/domain`
- `path/or/domain`

## Non-Goals

- what this task must not expand into

## Deliverables

- code/docs/tests/contracts that must exist after the task

## Context Snapshot

- current repo truth that makes this task necessary
- any known counts, outliers, or active cluster facts

## Dependencies

- `hard:` exact task or artifact that must land first
- `soft:` exact task or artifact that should be consulted first

## Source Signals

- audit, report, article pattern, or runtime signal that led to this task

## Entry Checklist

- thing that must be read or confirmed before coding
- second preflight check if needed

## Implementation Plan

1. bounded step
2. bounded step
3. bounded step

## Mode and Skill

- Primary mode: `Personal AI Assistant | TO-DO Executor | Swarm Conductor | domain lane`
- Optional skill: `skills/<name>/SKILL.md`

## System Prompt Slice

```text
Short role-specific instruction packet for the agent who should execute this task.
```

## Operator Command Pack

- `One natural-language command that should trigger this task cleanly.`
- `Second command variant if useful.`

## Acceptance Criteria

- observable condition
- observable condition

## Verification

- command
- command

## Evidence and Artifacts

- task file sections that must be updated before close-out
- docs, reports, teamwork artifacts, or queue surfaces that should reflect the result

## Risks

- main risk

## Stop Conditions

- condition that should make the agent pause and report instead of guessing

## Queue Update Rule

- what should happen to task status if the pass is partial
- what should happen if the task blocks
- what should happen if the task is complete

## Handoff Note

One paragraph telling the next agent where to continue.
```

## Rule

Do not fill every optional section with fluff.

- `Dependencies` should exist only when another task or artifact materially changes execution order.
- `Source Signals` should exist only when the task is grounded in a prior audit, report, runtime signal, or external pattern that the next agent should know.
- if those sections are absent, that should mean “not needed,” not “forgotten.”
