# TODO-018 N1 User Input Routing Lane

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `N1 Routing Agent`
- Cluster: `Assistant and execution routing`

## Goal

Teach N1 to classify incoming user input into the correct lane before work starts: personal assistant synthesis, TO-DO creation, direct task execution, future capsule projection, or defer-for-clarity.

## Why Now

If N1 treats every user message as the same kind of request, the system will either over-plan, over-build, or lose durable work in chat. Routing discipline is the piece that lets operator input become executable structure without widening scope every turn.

## Scope

- `SOUL.md`
- `CONTEXT.md`
- `MEMORY.md`
- `TO-DO/AGENT_OPERATING_MODES.md`
- `skills/n1/*`
- `skills/personal-ai-assistant/*`
- `skills/todo-executor/*`
- `lib/agents/n1/types.ts`
- `lib/agents/n1/orchestration.ts`
- `lib/agents/n1/skill-scaffold.ts`
- `__tests__/agents/n1-automated-update.test.ts`

## Non-Goals

- no new runtime daemon in this slice
- no full implementation of packet generation or capsule projection
- no replacement of user override authority

## Deliverables

- one explicit routing model for operator input classes
- command or prompt slices for when N1 should synthesize, mint tasks, execute, or defer
- stronger handoff rules between assistant mode and executor mode
- machine-readable route-to-skill and handoff-target mapping for cold-start N1 orchestration

## Context Snapshot

- the user wants N1 to hold hot context and convert durable requests into execution structure
- N1Hub already has `Personal AI Assistant`, `TO-DO Executor`, and `Swarm Conductor`
- the missing piece is input classification discipline

## Dependencies

- soft: align with the intake fields from TODO-016
- soft: align with the packet-builder posture from TODO-017
- output: this task should give N1 explicit lane routing before broader execution starts

## Source Signals

- repeated operator requests for N1 to classify, plan, and route work instead of treating every message the same way
- CONTEXT.md
- TO-DO/AGENT_OPERATING_MODES.md

## Entry Checklist

- inspect current mode cards
- inspect current `CONTEXT.md` and `MEMORY.md`
- inspect the new A2C intake and packet-builder tasks so routing does not drift away from them

## Implementation Plan

1. define the main user-input classes N1 must distinguish
2. define lane-selection and defer rules
3. encode the result into the relevant context and skill surfaces
4. keep the routing model aligned with the A2C intake path

## Mode and Skill

- Primary mode: `Personal AI Assistant`
- Optional skill: `skills/n1/SKILL.md`

## System Prompt Slice

```text
You are the N1 Routing Agent. Classify operator input into the correct N1Hub lane before execution starts so durable requests become bounded work and weak or ambiguous input does not silently mutate the queue.
```

## Operator Command Pack

- `Take TODO-018 and define how N1 routes user input into the correct lane.`
- `Work as N1 Routing Agent and make operator input classification explicit in N1Hub.`

## Acceptance Criteria

- N1 has an explicit model for when to synthesize, mint TO-DO, execute, or defer
- lane selection stays consistent with the A2C intake path
- the result reduces chat residue instead of creating a second pseudo-memory layer

## Verification

- `npx vitest run __tests__/agents/n1-automated-update.test.ts`
- `npm run n1:orchestrate`
- `npm run check:anchors:full`

## Evidence and Artifacts

- update the context, memory, or skill surfaces that carry routing law
- leave at least one concrete route example for a real operator input type
- refresh the orchestration bridge so the routing model becomes machine-readable
- orchestration report: `reports/n1/orchestration/n1-orch-2026-03-09T21-22-48Z.md`
- repo-sync report: `reports/n1/repo-sync/n1-sync-2026-03-09T21-22-48Z.md`
- automated-update report: `reports/n1/automated-update/n1-iter-2026-03-09T21-22-48Z.md`

## Execution Outcome

- `N1` now has an explicit route matrix across `assistant_synthesis`, `queue_execution`, `orchestrate_or_sync`, `capsule_projection`, `swarm_split`, and `defer_for_clarity`.
- Shared surfaces (`CONTEXT.md`, `MEMORY.md`, mode cards, and skills) now carry the same routing law and handoff posture.
- The orchestration snapshot now serializes the routing model with default skill and handoff target, so cold-start `N1` can see the same lane-selection doctrine in machine-readable form.

## Risks

- routing rules can become doctrinal if they are not grounded in actual user-input shapes

## Stop Conditions

- the routing model starts overriding explicit user intent
- the work drifts into packet generation or runtime code that belongs to other tasks

## Queue Update Rule

- keep this task `ACTIVE` if the routing model exists but is not yet encoded into the shared surfaces
- mark it `BLOCKED` if lane selection depends on unresolved A2C intake decisions
- mark it `DONE` only when N1 can route user-input classes explicitly and consistently

## Handoff Note

The point is not to make N1 more verbose. The point is to make N1 choose the right execution posture early, so user intent lands in the right bounded system instead of being reinterpreted from scratch every session. The next N1-facing frontier is to let `TODO-016`, `TODO-017`, and `TODO-019` consume this routing law instead of re-inventing input classes.
