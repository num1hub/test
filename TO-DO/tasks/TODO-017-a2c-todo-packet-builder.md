# TODO-017 A2C TO-DO Packet Builder

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Task Packet Agent`
- Cluster: `A2C intake and planning`

## Goal

Build the bounded A2C stage that converts actionable normalized operator input into N1Hub hot task packets with the same shape and discipline used by `TO-DO/tasks/*.md`.

## Why Now

An intake contract alone does not move work. N1Hub needs a packet-builder stage that can turn good input into explicit tasks with scope, non-goals, verification, and handoff, so N1 and future executor lanes can actually pull and run the work.

## Scope

- `lib/a2c/*`
- `TO-DO/tasks/*`
- `TO-DO/HOT_QUEUE.md`
- `TO-DO/TASK_TEMPLATE.md`
- `TO-DO/CAPSULE_NATIVE_EXECUTION.md`

## Non-Goals

- no automatic execution of generated tasks in this slice
- no broad redesign of the whole markdown queue
- no direct promotion into Real capsules yet

## Deliverables

- one repo-native packet-builder contract from normalized intake to hot task shape
- mapping rules from operator intent to task title, goal, scope, verification, and handoff
- guardrails for when input is too vague to become a task packet
- integration notes with later capsule-native execution work

## Context Snapshot

- the user explicitly wants input transformed into specially dedicated TO-DO for N1Hub
- the queue already has a strong task template with prompt slices, command packs, and verification
- the missing layer is deterministic packet generation, not more planning prose

## Dependencies

- hard: consume the normalized intake contract from TODO-016
- soft: align with TODO-018 so packet generation and routing do not define conflicting entry logic

## Source Signals

- TO-DO/tasks/TODO-016-a2c-user-input-intake-contract.md
- TO-DO/TASK_TEMPLATE.md
- existing hot task packets in TO-DO/tasks/

## Entry Checklist

- inspect `TO-DO/TASK_TEMPLATE.md`
- inspect representative hot tasks already in the queue
- inspect the intake contract from `TODO-016`

## Implementation Plan

1. map normalized intake fields to the task template
2. define rejection or defer rules for weak or noisy input
3. define queue-insertion posture and packet storage posture
4. leave a clean bridge to later capsule-native projection

## Packet Builder Path

- input artifact:
  - `data/private/a2c/intake/normalized/<intake-id>.normalized.json`
- builder runtime:
  - `lib/a2c/todoPacket.ts`
  - `scripts/a2c/packetize.ts`
- staged output:
  - `data/private/a2c/tasks/packet_candidates/<packet-id>.json`
  - `data/private/a2c/tasks/packet_candidates/<packet-id>.md`
- promotion posture:
  - packet candidates stay outside `TO-DO/tasks/` and `TO-DO/HOT_QUEUE.md` until reviewed and assigned a real `TODO-###` id

## Concrete Mapping Example

- normalized input:
  - `objective`: `Make A2C query behavior read only by default`
  - `route_class_hint`: `queue_execution`
  - `scope_hints`: `lib/a2c/query.ts`, `scripts/a2c/query.ts`, `__tests__/a2c/*`
  - `priority_hint`: `P1`
  - `execution_band_hint`: `NEXT`
  - `owner_lane_hints`: `A2C Runtime Agent`
  - `acceptance_criteria_hints`: `default query path leaves data/private/a2c untouched`
  - `verification_hints`: `npm run typecheck`, `npx vitest run __tests__/a2c/*.test.ts`
  - `stop_condition_hints`: `stop if a hidden caller still depends on write side effects`
- mapped packet fields:
  - title -> `TODO-DRAFT Make A2C Query Behavior Read Only By Default`
  - goal -> objective text
  - scope -> `scope_hints`
  - priority / execution band / owner lane -> direct hint mapping
  - acceptance criteria -> `acceptance_criteria_hints`
  - verification -> `verification_hints`
  - stop conditions -> `stop_condition_hints`
  - handoff -> points back to the normalized intake artifact rather than mutating queue truth directly

## Defer Rules

- defer when `route_class_hint` is not `queue_execution`
- defer when the objective is too short to bound the work
- defer when scope, acceptance, and verification hints are all absent

## Current Repo Truth

- the builder now consumes the normalized intake contract emitted by `TODO-016`
- packet candidates mirror the existing task template instead of inventing a second queue format
- queue insertion remains explicit review work, not automatic promotion

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/n1/SKILL.md`

## System Prompt Slice

```text
You are the Task Packet Agent. Build the A2C packet-builder stage that turns normalized operator intent into bounded N1Hub task packets with explicit scope, verification, and stop conditions.
```

## Operator Command Pack

- `Take TODO-017 and build the A2C TO-DO packet builder for N1Hub.`
- `Work as Task Packet Agent and map normalized input into real hot task packets.`

## Acceptance Criteria

- packet generation targets the existing N1Hub task template instead of inventing a second format
- vague input can be deferred instead of forcing bad tasks into the queue
- the design shows how generated packets enter `TO-DO` without bypassing queue law

## Verification

- `npm run typecheck`
- `npm run check:anchors:full`

## Evidence and Artifacts

- update the packet-builder design surfaces
- show at least one concrete example mapping from normalized intake to task packet fields
- update queue notes if the insertion posture changes

## Risks

- packet generation can become too eager and flood the queue with weak tasks

## Stop Conditions

- the work starts inventing a second task format outside the current queue discipline
- the design depends on capsule-native projection before the packet-builder itself is stable

## Queue Update Rule

- keep this task `ACTIVE` if the mapping exists but queue insertion is still unclear
- mark it `BLOCKED` if packet generation depends on a missing intake contract
- mark it `DONE` only when the packet-builder path is explicit and N1-ready

## Handoff Note

Contained on 2026-03-10. `TODO-019` should add fixture coverage for queue-ready and deferred packetization paths, while future promotion work can use `data/private/a2c/tasks/packet_candidates/*.md` as the reviewed handoff into `TO-DO/tasks/`.

## Latest Pass

- Date: `2026-03-10`
- Outcome:
  - added a repo-native packet builder that consumes normalized intake artifacts and stages packet candidates under A2C-owned storage
  - added explicit defer rules so vague or non-queue input does not flood the live queue
  - documented the transitional bridge from A2C packet candidates to future capsule-native execution
- Verification:
  - `npm run typecheck` -> passed
  - `npm run check:anchors:full` -> passed
