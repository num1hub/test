# TODO-001 A2C Query Safety

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `READY`
- Owner Lane: `A2C Runtime Agent`
- Cluster: `A2C runtime hardening`

## Goal

Make A2C query semantics read-only by default. Query should not silently write transient artifacts unless the caller explicitly opts into synthesis.

## Why Now

Right now A2C retrieval surfaces still risk acting like mutation surfaces. That widens blast radius and makes operator expectations unreliable.

## Scope

- `lib/a2c/query.ts`
- `scripts/a2c/query.ts`
- `scripts/a2c/investigate.ts`
- `lib/a2c/oracle.ts`
- `docs/a2c.md`
- `__tests__/a2c/*`

## Non-Goals

- no redesign of the entire A2C retrieval stack
- no speculative vector or embedding work
- no full audit rewrite

## Deliverables

- explicit read-only default for query paths
- explicit opt-in path for transient synthesis
- updated docs for query behavior
- contract tests for no-write default and opt-in writes

## Context Snapshot

- A2C retrieval still carries write risk behind read-like semantics.
- This work belongs after the active Real/Dream `NOW` wave, not before it.

## Dependencies

- soft: wait until the active Real/Dream NOW wave is materially contained before making this the main execution frontier
- soft: keep the resulting contract aligned with TODO-003

## Source Signals

- A2C runtime investigation showing read-like paths still writing transient artifacts
- TO-DO/tasks/TODO-003-a2c-wave-2-tests.md

## Entry Checklist

- map every caller of `queryVault` before changing the default contract
- confirm current write paths in `lib/a2c/query.ts` and adjacent A2C callers
- inspect the current A2C tests and docs so the contract change lands in one coherent pass

## Implementation Plan

1. Map every caller of `queryVault`.
2. Make read-only the default query contract.
3. Add explicit opt-in for transient synthesis and update tests plus docs.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/todo-executor/SKILL.md`

## System Prompt Slice

```text
You are the A2C Runtime Agent. Make A2C query surfaces read-only by default, keep the change bounded to the query contract and its callers, and prove the new behavior with tests.
```

## Operator Command Pack

- `Act as TO-DO Executor and complete TODO-001 end-to-end.`
- `Harden A2C query semantics so reads stop writing by default, then verify it.`

## Acceptance Criteria

- default query path leaves `data/private/a2c` untouched
- synthesis requires an explicit opt-in
- investigate/oracle callers remain coherent after the change
- docs and tests match the new contract

## Verification

- `npx vitest run __tests__/a2c/*.test.ts`
- `npm run typecheck`
- `npm run a2c:recon`

## Evidence and Artifacts

- update this task packet with the caller map and any contract exceptions discovered
- update `docs/a2c.md` when the query contract changes
- update or add the A2C tests that prove no-write default and explicit opt-in mutation
- refresh teamwork artifacts when the pass runs through the N1 host lane

## Risks

- hidden callers may depend on current side effects
- docs may promise safer behavior before all callers are updated

## Stop Conditions

- a caller depends on write side effects that cannot be removed without a new planning decision

## Queue Update Rule

- if the caller map is complete but the contract change still needs implementation, keep the task `ACTIVE`
- if a hidden caller needs a broader design decision, mark the task `BLOCKED` and capture that caller explicitly
- if query defaults are read-only, docs are aligned, and tests prove it, mark the task `DONE`

## Handoff Note

Start from `lib/a2c/query.ts`, then inspect every caller of `queryVault`. Change the contract once, not separately at each caller.
