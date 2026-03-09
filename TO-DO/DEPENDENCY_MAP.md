<!-- @anchor doc:todo.dependency-map links=doc:todo.index,doc:todo.decomposition-law,doc:todo.lane-ownership,doc:todo.hot-queue,doc:todo.roadmap-q2-2026,doc:n1hub.context note="Dependency map for N1Hub hot tasks so agents can see unlock order, fronts, and split points without inferring them from prose." -->
# N1Hub TO-DO Dependency Map

Updated: 2026-03-09

This file explains how the current hot tasks unlock each other. It is not a gantt chart. It is a dependency and unlock map so the next agent can see what must land first, what can move in parallel, and what should wait.

## Front A · Real/Dream Constitutional Wave

### `TODO-007` Real Dream Global Audit

- class: `Audit`
- unlocks:
  - `TODO-008`
  - `TODO-009`
  - `TODO-010`
- reason:
  The branch wave should not make policy or lifecycle decisions from intuition.

### `TODO-008` Real Dream Constitutional Hub Triage

- class: `Decision`
- depends on:
  - hard: `TODO-007`
- unlocks:
  - narrower rewrite or promote packets if hub decisions split further
- parallel posture:
  should not outrun the branch audit

### `TODO-009` Vault Steward Dream-Only Operations Review

- class: `Decision`
- depends on:
  - hard: `TODO-007`
- soft dependencies:
  - current Vault Steward runtime artifacts
- unlocks:
  - bounded Vault Steward lifecycle or runtime follow-up packets

### `TODO-010` Real-Only Law Sync

- class: `Decision`
- depends on:
  - hard: `TODO-007`
- soft dependencies:
  - `TODO-008`
- unlocks:
  - explicit Real-first canonical law posture for later branch work

## Front B · A2C Intake and Packetization

### `TODO-016` A2C User Input Intake Contract

- class: `Control Plane`
- depends on:
  - soft: Front A should be materially contained before this becomes the main frontier
- unlocks:
  - `TODO-017`
  - `TODO-018`
  - `TODO-019`

### `TODO-017` A2C TO-DO Packet Builder

- class: `Control Plane`
- depends on:
  - hard: `TODO-016`
- soft dependencies:
  - `TODO-018`
- unlocks:
  - stable queue packet generation from operator input
  - `TODO-019`

### `TODO-018` N1 User Input Routing Lane

- class: `Control Plane`
- soft dependencies:
  - `TODO-016`
  - `TODO-017`
- unlocks:
  - explicit lane routing between assistant, queue, capsule, and defer
  - `TODO-019`

### `TODO-019` A2C User Input Test Net

- class: `Test Net`
- depends on:
  - hard: `TODO-016`
  - hard: `TODO-017`
- soft dependencies:
  - `TODO-018`
- unlocks:
  - trustworthy input-to-packet pipeline

## Front C · Runtime Hardening and Review Systems

### `TODO-001` A2C Query Safety

- class: `Implementation`
- soft dependencies:
  - Front A should no longer dominate the queue
  - `TODO-003` should stay aligned with the resulting contract
- unlocks:
  - stronger A2C read/write semantics
  - part of `TODO-003`

### `TODO-003` A2C Wave 2 Tests

- class: `Test Net`
- soft dependencies:
  - `TODO-001`
  - `TODO-019`
- unlocks:
  - stronger A2C runtime proof

### `TODO-002` Vault Steward Runtime Cluster

- class: `Implementation`
- depends on:
  - current cluster discipline
- soft dependencies:
  - `TODO-009` if Dream-only lifecycle law changes the runtime seam choice

### `TODO-011` Real Dream Promotion Test Net

- class: `Test Net`
- soft dependencies:
  - `TODO-007`
  - `TODO-008`
  - `TODO-010`
- unlocks:
  - stronger promotion-route proof after branch policy is clearer

### `TODO-012` Capsule-Native Execution Control Plane

- class: `Control Plane`
- soft dependencies:
  - `TODO-016`
  - `TODO-017`
  - `TODO-018`
- unlocks:
  - durable migration path from markdown queue to vault-native execution

### `TODO-013` Cross-Model Adversarial Review Lane

- class: `Control Plane`
- depends on:
  - hard: opposite-model reviewer path must be provable on the host
- unlocks:
  - hostile second-pass quality lane

### `TODO-014` N1 Scheduled Iteration Loop

- class: `Control Plane`
- soft dependencies:
  - current `N1` automated update and orchestration layers
- unlocks:
  - scheduler-friendly bounded recurring iterations

### `TODO-004`, `TODO-005`, `TODO-006`, `TODO-015`

- these remain parked behind the hotter fronts
- they are ready for planning and bounded work, but they should not displace the current unlock order without explicit operator override

## Parallelism Rule

Parallel work is justified only when:

- there is no hard dependency between the tasks
- the owner lanes are different
- the write surfaces do not overlap materially
- the verification blocks do not depend on the same unfinished artifact

If those conditions are not true, keep the work serial.

## Queue Override Rule

The operator can override this map at any time.

Without an override:

- respect hard dependencies
- respect front order
- do not treat speculative future work as hotter than already-unblocking work
