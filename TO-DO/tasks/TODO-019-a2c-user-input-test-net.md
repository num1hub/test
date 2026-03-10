# TODO-019 A2C User Input Test Net

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `A2C Intake Test Agent`
- Cluster: `A2C intake and planning`

## Goal

Add the first real test net for the user-input-to-TO-DO path so N1Hub can prove that operator requests become stable intake artifacts and bounded task packets without leaking into noise, unsafe scope, or fake completion.

## Why Now

If the new A2C intake path is not tested, it will become prompt magic instead of a trustworthy pipeline. This is exactly the kind of surface that looks smart in demos and fails under real operator input.

## Scope

- `__tests__/a2c/*`
- `lib/a2c/*`
- `TO-DO/*`
- `docs/a2c.md`

## Non-Goals

- no giant end-to-end swarm simulation
- no attempt to test every historical chat pattern in one move
- no validator-wide rollout outside the new intake path

## Deliverables

- fixtures for representative operator inputs
- tests for actionable input, vague input, noisy input, and over-broad input
- tests proving that packet generation preserves verification and stop-condition fields where expected
- tests proving that the path can defer or reject bad input cleanly

## Context Snapshot

- existing A2C tests are still focused on recon, watch, autonomous, ingest, and future TODO contracts
- user-input conversion is a new contract and needs its own proof bar
- the repo already values tests as contract documentation, not optional polish

## Dependencies

- hard: the intake contract from TODO-016 must be explicit enough to test
- hard: the packet-builder mapping from TODO-017 must be explicit enough to test
- soft: use the routing posture from TODO-018 where lane classification affects outcomes

## Source Signals

- TO-DO/tasks/TODO-016-a2c-user-input-intake-contract.md
- TO-DO/tasks/TODO-017-a2c-todo-packet-builder.md
- TO-DO/tasks/TODO-018-n1-user-input-routing-lane.md

## Entry Checklist

- inspect existing A2C tests and TODO test surfaces
- inspect the intake and packet-builder tasks so the test net targets the real contract
- choose a small but representative fixture set

## Implementation Plan

1. define the minimum operator-input fixture matrix
2. write tests for normalization, defer, and rejection behavior
3. write tests for packet-field preservation on good inputs
4. keep the suite bounded enough to run fast in normal development

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/n1/SKILL.md`

## System Prompt Slice

```text
You are the A2C Intake Test Agent. Build the first contract tests for the path from operator input to A2C intake and TO-DO packet output, proving that the pipeline is stable, bounded, and honest about weak input.
```

## Operator Command Pack

- `Take TODO-019 and build the A2C user-input test net.`
- `Work as A2C Intake Test Agent and prove the operator-input pipeline with bounded contract tests.`

## Acceptance Criteria

- representative user-input fixtures exist
- the path can distinguish actionable input from noise or over-broad intent
- the tests protect the intake and packet-builder contracts against silent drift

## Verification

- `npx vitest run __tests__/a2c/*.test.ts`
- `npm run typecheck`
- `npm run check:anchors:full`

## Evidence and Artifacts

- update the relevant tests and docs
- leave the fixture matrix or coverage notes explicit for the next agent

## Risks

- the test suite can become too broad before the contract is stable

## Stop Conditions

- the contract remains too vague to test without guessing
- the work starts pulling in unrelated A2C subsystems

## Queue Update Rule

- keep this task `ACTIVE` if the fixture matrix exists but implementation coverage is partial
- mark it `BLOCKED` if the intake and packet-builder contracts are still undefined
- mark it `DONE` only when the first bounded user-input test net passes and protects the new path

## Handoff Note

Contained on 2026-03-10. The first fixture net now covers actionable, vague, noisy, and over-broad input at the `lib/a2c` contract layer. The next test expansion, if needed, is route-level coverage for `POST /api/a2c/ingest`.

## Fixture Matrix

- actionable input
  - expects raw and normalized staging, `READY` packet output, preserved verification hints, preserved stop-condition hints
- vague planning input
  - expects `assistant_synthesis` route hint and `DEFERRED` packet status
- noisy input
  - expects defer without forced queue packet promotion
- over-broad execution input
  - expects defer even when verification hints are present

## Latest Pass

- Date: `2026-03-10`
- Outcome:
  - added fixture-driven operator-input tests for normalization and packetization
  - extended the normalized intake contract to carry `stop_condition_hints`
  - locked packetization against over-broad and planning-heavy input
- Verification:
  - `npx vitest run __tests__/a2c/*.test.ts` -> passed (`5 passed | 1 skipped`, `12 passed | 3 todo`)
  - `npm run typecheck` -> passed
  - `npm run check:anchors:full` -> passed
