# TODO-011 Real Dream Promotion Test Net

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `Diff Test Agent`
- Cluster: `Real/Dream runtime hardening`

## Goal

Expand test coverage around the agent-facing Real/Dream routes so promotion, scoped merge, and branch-safe review flows become safer to evolve.

## Why Now

Diff and merge runtime already has meaningful tests, but the promotion lane still needs stronger route-level evidence, especially around `/api/capsules/[id]/promote` and agent-facing branch workflows.

## Scope

- `app/api/branches/route.ts`
- `app/api/diff/route.ts`
- `app/api/diff/apply/route.ts`
- `app/api/capsules/[id]/diff/route.ts`
- `app/api/capsules/[id]/promote/route.ts`
- `__tests__/api/branches.test.ts`
- `__tests__/api/diff.test.ts`
- `__tests__/api/diff-apply.test.ts`
- `__tests__/lib/diff/*.test.ts`

## Non-Goals

- no redesign of merge strategy
- no UI-first test expansion
- no content-level review of every promoted capsule

## Deliverables

- route-level tests for capsule promotion
- stronger tests for auth, conflict handling, and scoped merge behavior
- clear evidence that route semantics match `docs/real-dream-diff.md`

## Context Snapshot

- diff and merge already have a test base
- promotion route coverage is still lighter than the rest of the Real/Dream runtime

## Dependencies

- soft: use the verified branch picture from TODO-007
- soft: let TODO-008 and TODO-010 clarify branch-policy expectations before expanding promotion proofs too broadly

## Source Signals

- docs/real-dream-diff.md
- current diff and branch route tests

## Entry Checklist

- inspect current promotion-route behavior before adding new assertions
- choose contract assertions, not implementation trivia
- keep the suite focused on promote, auth, conflict, and scoped merge behavior

## Implementation Plan

1. Review current diff, merge, and branch route tests.
2. Add promotion-route success and failure contracts.
3. Tighten auth, conflict, and scoped-merge route coverage without redesigning the merge engine.

## Added Route Cases

- `__tests__/api/capsules-promote.test.ts`
  - promotion success returns the real capsule
  - unauthorized promotion returns `401`
  - missing dream overlay returns `404`
  - merge conflict returns `409`
- `__tests__/api/diff-apply.test.ts`
  - scoped merge request forwards `scopeType`, `scopeRootId`, and conflict resolution
  - unauthorized merge apply returns `401`
- `__tests__/api/diff.test.ts`
  - unauthorized diff returns `401`
  - invalid diff input returns `400` before `computeDiff`
- `__tests__/api/capsules-diff.test.ts`
  - unauthorized capsule diff returns `401`
  - invalid branch name returns `400`
- `__tests__/api/branches.test.ts`
  - unauthorized branch read returns `401`
  - duplicate branch create returns `409`

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/todo-executor/SKILL.md`

## System Prompt Slice

```text
You are the Diff Test Agent. Expand route-level Real/Dream promotion and merge evidence without turning the task into a merge-engine rewrite.
```

## Operator Command Pack

- `Take TODO-011 and harden the Real/Dream promotion test net.`
- `Act as Diff Test Agent and add route-level contracts around promote, auth, and scoped merge behavior.`

## Acceptance Criteria

- `/api/capsules/[id]/promote` has meaningful success and failure tests
- route tests cover auth and conflict behavior, not only happy-path payloads
- diff and merge tests remain green after the additions
- docs and route behavior do not silently diverge

## Verification

- `npx vitest run __tests__/api/branches.test.ts __tests__/api/diff.test.ts __tests__/api/diff-apply.test.ts __tests__/lib/diff/*.test.ts`
- `npm run typecheck`
- `npm run validate -- --dir data/capsules --strict --report`

## Evidence and Artifacts

- update this packet with the promotion-route cases that were added
- update docs only if route behavior or contract language changed
- split a follow-up packet if deeper merge-engine gaps are discovered

## Risks

- test growth may start asserting implementation trivia instead of contract behavior
- promotion edge cases may reveal deeper merge-engine gaps that need a follow-up task

## Stop Conditions

- the work starts rewriting merge strategy instead of tightening route contracts

## Queue Update Rule

- keep this task `ACTIVE` if route coverage improved but the full target matrix is not yet covered
- mark it `BLOCKED` if promotion testing exposes a deeper merge-engine decision first
- mark it `DONE` only when the promotion-route contract is materially stronger and verified

## Handoff Note

Contained on 2026-03-10. The next Real/Dream runtime lane is deeper route or engine proof only if new failures surface; otherwise the hot path returns to `TODO-003`.

## Latest Pass

- Date: `2026-03-10`
- Outcome:
  - added the missing promotion-route success and failure contracts
  - tightened auth and invalid-input coverage around branches, diff, capsule-diff, and diff-apply routes
  - preserved this as a route-test pass without touching merge-engine behavior
- Verification:
  - `npx vitest run __tests__/api/branches.test.ts __tests__/api/diff.test.ts __tests__/api/diff-apply.test.ts __tests__/api/capsules-diff.test.ts __tests__/api/capsules-promote.test.ts __tests__/lib/diff/*.test.ts` -> passed (`10 passed | 1 skipped`, `28 passed | 1 skipped`)
  - `npm run typecheck` -> passed
  - `npm run validate -- --dir data/capsules --strict --report` -> passed (report: `reports/validation-2026-03-10T09-20-24-182Z.md`)
