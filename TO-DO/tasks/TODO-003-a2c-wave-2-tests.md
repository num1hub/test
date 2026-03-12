# TODO-003 A2C Wave 2 Tests

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `DONE`
- Owner Lane: `A2C Test Agent`
- Cluster: `A2C runtime hardening`

## Goal

Convert the remaining A2C `TO-DO` contracts into real tests and close the highest remaining runtime drift.

## Why Now

The first A2C test wave exists, but the most dangerous remaining gaps still live in query semantics, audit freshness, and cluster-context measurement.

## Scope

- `__tests__/a2c/future.todo.test.ts`
- `lib/a2c/query.ts`
- `lib/a2c/audit.ts`
- `lib/a2c/clusterContext.ts`
- `docs/a2c.md`

## Non-Goals

- no large feature expansion
- no unrelated docs sweep
- no widening into the full capsule corpus

## Deliverables

- real tests replacing current A2C `TO-DO` placeholders
- query no-write coverage
- audit freshness coverage
- cluster-context coverage focused on `lib/a2c` and A2C docs/tests

## Context Snapshot

- A first A2C test wave exists, but the remaining most dangerous gaps still sit in query, audit freshness, and clusterContext measurement.
- This task should convert placeholders into contracts, not generate new placeholders.

## Dependencies

- soft: use the explicit query contract from TODO-001 when that path changes
- soft: keep the suite aligned with the intake work planned in TODO-019

## Source Signals

- __tests__/a2c/future.todo.test.ts
- TO-DO/tasks/TODO-001-a2c-query-safety.md
- TO-DO/tasks/TODO-019-a2c-user-input-test-net.md

## Implementation Plan

1. Replace the highest-value `TO-DO` tests with real contracts.
2. Add focused fixtures for query, audit, and clusterContext.
3. Align docs and tests on the same A2C semantics.

## Added Contracts

- `__tests__/a2c/query.test.ts`
  - query stays read-only by default
  - explicit synthesis opt-in still works
- `__tests__/a2c/audit-cluster-context.test.ts`
  - audit flags stale index geometry against live vault capsules
  - cluster context scans only `lib/a2c`, dedicated A2C docs, and `__tests__/a2c`

## Narrowed Future Contract

- no remaining placeholder contracts from the original A2C wave-2 backlog
- future ingest API expansion should be treated as new edge-case coverage, not as deferred placeholder debt

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/todo-executor/SKILL.md`

## System Prompt Slice

```text
You are the A2C Test Agent. Replace placeholder A2C contracts with real enforced tests on the runtime surfaces that still drift most, and keep the work inside query, audit, and clusterContext.
```

## Operator Command Pack

- `Act as TO-DO Executor and convert the remaining A2C placeholders into real tests.`
- `Take TODO-003 and finish the next A2C contract-test wave without widening scope.`

## Acceptance Criteria

- each current `TO-DO` item is either converted to a real test or replaced by a narrower future contract
- A2C coverage reflects actual runtime surfaces
- docs and tests agree on A2C semantics

## Verification

- `npx vitest run __tests__/a2c/*.test.ts`
- `npm run typecheck`
- `npm run a2c:recon`
- `npm run a2c:auto`

## Risks

- clusterContext heuristics may look green without measuring the right files
- audit freshness checks may need careful fixture control
- live repo audit may expose a stale index that this packet proves but does not repair

## Stop Conditions

- the work starts drifting into new A2C features instead of contract tests

## Handoff Note

Contained on 2026-03-10. The original A2C wave-2 placeholder backlog is now exhausted; any further ingest-route growth should be tracked as new edge coverage rather than leftover contract debt.

## Latest Pass

- Date: `2026-03-10`
- Outcome:
  - converted the audit freshness placeholder into a real stale-index contract test
  - converted the cluster-context placeholder into a real dedicated-scan contract test
  - narrowed the only remaining A2C placeholder to the ingest API route layer
  - aligned `docs/a2c.md` with the new audit and cluster-context semantics
- Verification:
  - `npx vitest run __tests__/a2c/*.test.ts` -> passed (`6 passed | 1 skipped`, `14 passed | 1 todo`)
  - `npm run typecheck` -> passed
  - `npm run a2c:recon` -> passed (`status: COMPLETE`)
  - `npm run a2c:auto` -> command passed, report status `PARTIAL` because audit now surfaces `INDEX_FRESHNESS` drift in `data/private/a2c/index.json`
  - follow-up runtime repair on `2026-03-10`:
    - `npm run a2c:index` -> passed (`status: COMPLETE`, `nodes: 192`, `edges: 1898`, `issues: 0`)
    - `npm run a2c:audit` -> passed (`status: COMPLETE`, `valid: 192`, `invalid: 0`, `issues: 0`)
    - `npm run a2c:auto` -> command passed, report status `PARTIAL` with `issues: 0`; the remaining partial state is dry-run persistence only, not `INDEX_FRESHNESS`
  - follow-up contract pass on `2026-03-10`:
    - added route-level coverage for `POST /api/a2c/ingest` operator-input `202`, mixed-payload `400`, and multi-candidate quarantine `207`
    - removed the last A2C placeholder test because the remaining ingest route gap is now covered by concrete API tests
