# TODO-014 N1 Scheduled Iteration Loop

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Autonomy Systems Agent`
- Cluster: `N1 runtime`

## Goal

Turn the current one-shot `./autoupdate` workflow into a scheduler-friendly N1 iteration lane that can be triggered repeatedly by a host scheduler without pretending to be an unsafe infinite self-mutation daemon.

## Why Now

The one-step iteration engine already exists. The next leverage point is not “infinite loop in one process.” The next leverage point is a safe recurrent trigger model where each run is bounded, inspectable, and recorded in teamwork history.

## Scope

- `autoupdate`
- `scripts/n1-automated-update.ts`
- `lib/agents/n1/automated-update.ts`
- `TO-DO/AUTOMATED_UPDATE_WORKFLOW.md`
- `docs/agents-operations.md`
- `NINFINITY_WORKFLOW.md`
- `__tests__/agents/*`

## Non-Goals

- no unbounded while-true daemon hidden inside one CLI process
- no blind auto-commit to a dirty repository
- no replacement of Symphony or N-Infinity orchestration

## Deliverables

- explicit recurring iteration contract for N1
- scheduler-facing flags or wrapper behavior
- run budget and stop rules for one scheduled pass
- evidence path for iteration history and next-step selection
- operations notes for how to trigger the loop safely

## Context Snapshot

- `./autoupdate` already writes teamwork and report artifacts for one bounded pass
- the missing layer is recurring orchestration, not launch-packet assembly
- N1Hub already has long-running automation surfaces through Symphony and N-Infinity, so this should integrate with them rather than compete with them blindly

## Source Signals

- scheduled loop systems are useful when each invocation stays bounded and inspectable
- the wrong target is one immortal process; the right target is one honest iteration triggered many times
- recurring execution must stay compatible with existing workflow law rather than inventing a shadow runtime

## Dependencies

- soft: build on the current N1 automated update and orchestration surfaces instead of bypassing them
- soft: keep the recurring contract legible next to Symphony and N-Infinity rather than competing with them

## Entry Checklist

- inspect the current one-shot autoupdate behavior and artifact writes
- inspect existing N-Infinity and agent-operations docs before inventing a new scheduler story
- confirm what should remain bounded to one iteration versus delegated to external scheduling

## Implementation Plan

1. Define the recurring N1 iteration contract and run budget.
2. Add scheduler-facing behavior or wrapper semantics to the current command.
3. Document safe host-level triggering patterns.
4. Verify that repeated runs stay honest about dirty state, blocking, and next action.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/n1/SKILL.md`

## System Prompt Slice

```text
You are the Autonomy Systems Agent. Extend the one-shot N1 iteration engine into a scheduler-friendly recurring lane without turning it into an unsafe hidden daemon or bypassing existing N-Infinity law.
```

## Operator Command Pack

- `Take TODO-014 and make N1 autoupdate scheduler-friendly without making it unsafe.`
- `Work as Autonomy Systems Agent and define a bounded recurring iteration contract for N1.`

## Acceptance Criteria

- one scheduled pass is still one bounded iteration
- repeated execution has clear run budget and stop semantics
- the host-level scheduling story is explicit and auditable
- the loop does not silently claim to have done real implementation work when it only refreshed planning state

## Verification

- `npx vitest run __tests__/agents/*.test.ts`
- `npm run typecheck`
- `npm run check:anchors:full`

## Evidence and Artifacts

- workflow docs updated in `TO-DO/AUTOMATED_UPDATE_WORKFLOW.md`
- operations note updated in `docs/agents-operations.md`
- scheduler artifacts added under `data/private/agents/n1/scheduler.*` and `reports/n1/scheduler/*.md`
- scheduler-facing commands now include `./autoupdate schedule --interval-minutes 30` and `npm run n1:update:schedule`
- `npx vitest run __tests__/agents/*.test.ts` passed on 2026-03-10
- `npm run typecheck` passed on 2026-03-10
- `npm run check:anchors:full` passed on 2026-03-10

## Risks

- infinite-loop thinking may push this task toward unsafe daemon behavior
- recurring planning runs can become noise if they do not meaningfully advance the queue

## Stop Conditions

- the design only works by bypassing existing N-Infinity or Symphony boundaries
- the loop cannot remain bounded to one honest iteration per invocation

## Queue Update Rule

- keep the task `ACTIVE` if the contract is defined but host integration is still partial
- mark it `BLOCKED` if recurring execution needs a larger runtime decision first
- mark it `DONE` only when recurring triggering is explicit, bounded, and documented

## Handoff Note

Treat this as scheduler engineering, not hype. The right answer is one honest iteration triggered many times, guarded by interval state and explicit reports, not one immortal process mutating itself in the dark.
