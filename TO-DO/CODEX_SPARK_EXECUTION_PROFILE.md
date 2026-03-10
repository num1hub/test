<!-- @anchor doc:todo.codex-spark-profile links=doc:todo.index,doc:todo.hot-queue,doc:todo.agent-operating-modes,doc:n1hub.context,doc:n1hub.codex note="Model-specific execution profile for GPT-5.3-Codex-Spark inside the N1Hub TO-DO system." -->
# GPT-5.3-Codex-Spark Execution Profile

Updated: 2026-03-10

This file is the repo-native TO-DO profile for `GPT-5.3-Codex-Spark`. It exists so the model does not have to reconstruct its best-fit work from the entire queue every time.

This profile does not create a new repo-law mode. The owning lane stays `TO-DO Executor`. The purpose of this file is narrower:

- define what this model should pull first
- define what it should avoid as a first move
- keep coding-heavy execution from drifting into planning theater

## Current Fields of Activity

Right now `GPT-5.3-Codex-Spark` should treat its concrete field of activity inside N1Hub as five bounded lanes:

1. `A2C runtime safety`
   - tighten query semantics, read/write boundaries, and caller coherence
   - typical packets: `TODO-001`
2. `A2C contract tests`
   - replace placeholders with enforced runtime contracts
   - typical packets: `TODO-003`, `TODO-019`
3. `A2C intake and packetization implementation`
   - encode stable intake and task-packet mechanics after the contract is clear
   - typical packets: `TODO-016`, `TODO-017`
4. `Real/Dream runtime route tests`
   - expand route-level protection around diff, apply, promote, auth, and conflict handling
   - typical packets: `TODO-011`
5. `bounded secondary hardening`
   - only after the higher-fit work above is contained
   - typical packets: narrow slices of `TODO-002` or `TODO-014`

These are fields of activity, not a second queue. They tell the model where it should be productive first.

## Best Fit

Use `GPT-5.3-Codex-Spark` first for:

- bounded implementation packets with named code files
- test-heavy packets with clear runtime contracts
- CLI or script hardening work with narrow blast radius
- contract enforcement work where code and verification matter more than prose

## Poor First Fit

Do not use `GPT-5.3-Codex-Spark` as the first lane for:

- broad repo-law rewrites
- root-doc coherence passes
- Real/Dream doctrine triage or constitutional branch interpretation
- open-ended planning, roadmap synthesis, or memory-topology design
- swarm routing, baton arbitration, or cross-lane orchestration

Those belong first to `N1`, `Personal AI Assistant`, or the base `TO-DO Executor` without the coding overlay.

## Current Task-Fit Matrix

### Excellent Fit Now

- `TODO-001` A2C Query Safety
  - why: bounded runtime code, explicit caller map, tests, and narrow contract change
  - gate shape: `vitest`, `typecheck`, `a2c:recon`
- `TODO-011` Real/Dream Promotion Test Net
  - why: route-level tests, focused API behavior, strong verification surface
  - gate shape: targeted `vitest`, `typecheck`, capsule validation
- `TODO-003` A2C Wave 2 Tests
  - why: contract-test conversion with concrete runtime surfaces
  - caveat: stay aligned with the contract established by `TODO-001`

### Strong Fit After Dependencies

- `TODO-017` A2C TO-DO Packet Builder
  - why: implementation-heavy mapping work once `TODO-016` makes the intake contract explicit
  - dependency: do not pull first unless `TODO-016` is materially contained
- `TODO-019` A2C User Input Test Net
  - why: test-heavy and code-first once the input and packet contracts are stable
  - dependency: do not pull before `TODO-016` and `TODO-017`

### Mixed Fit

- `TODO-016` A2C User Input Intake Contract
  - why: partially code-facing, but still heavy on contract design and packet shape
  - guidance: use `GPT-5.3-Codex-Spark` only if the pass is implementing the contract in code, not just inventing the contract from scratch
- `TODO-014` N1 Scheduled Iteration Loop
  - why: contains real code and tests, but also operations and workflow posture
  - guidance: good second lane after the scheduler contract is already narrowed
- `TODO-002` Vault Steward Runtime Cluster
  - why: code-heavy, but cluster refactor pressure makes blast radius higher
  - guidance: only use this overlay when the pass is one narrow extraction step, not a broad redesign

### Avoid As First Pull

- `TODO-012` Capsule-Native Execution Control Plane
- `TODO-013` Cross-Model Adversarial Review Lane
- `TODO-015` Context Engineering Memory Topology

These are too architecture-heavy or cross-surface for this overlay to be the first brain on the task.

## Pull Preference Inside The Current Queue

When the operator explicitly wants `GPT-5.3-Codex-Spark` and does not name a narrower packet, use this preference order:

1. `TODO-001`
2. `TODO-011`
3. `TODO-003`
4. `TODO-016`
5. `TODO-017` only after `TODO-016`
6. `TODO-019` only after `TODO-016` and `TODO-017`

Reason:

- this keeps the overlay aligned with the current queue frontier
- it respects the input-to-packet dependency chain
- it privileges coding-heavy and test-heavy packets before mixed planning/implementation packets

## Concrete Work Packages Now

### Package 1: A2C Query Safety

- packet: `TODO-001`
- primary files:
  - `lib/a2c/query.ts`
  - `scripts/a2c/query.ts`
  - `scripts/a2c/investigate.ts`
  - `lib/a2c/oracle.ts`
  - `__tests__/a2c/*`
- concrete job:
  - map `queryVault` callers
  - make read-only the default behavior
  - keep transient synthesis behind explicit opt-in
  - prove it with tests

### Package 2: Real/Dream Promotion Route Test Net

- packet: `TODO-011`
- primary files:
  - `app/api/branches/route.ts`
  - `app/api/diff/route.ts`
  - `app/api/diff/apply/route.ts`
  - `app/api/capsules/[id]/promote/route.ts`
  - `__tests__/api/*`
  - `__tests__/lib/diff/*`
- concrete job:
  - harden route-level tests around auth, conflict handling, promote, and scoped merge behavior

### Package 3: A2C Wave 2 Tests

- packet: `TODO-003`
- primary files:
  - `__tests__/a2c/future.todo.test.ts`
  - `lib/a2c/query.ts`
  - `lib/a2c/audit.ts`
  - `lib/a2c/clusterContext.ts`
- concrete job:
  - convert placeholders into real query, audit, and cluster-context contracts

### Package 4: A2C Intake Contract Implementation

- packet: `TODO-016`
- primary files:
  - `lib/a2c/*`
  - `app/api/a2c/ingest/route.ts`
  - `data/private/a2c/*`
- concrete job:
  - only when implementing the intake contract in code
  - not as the first lane for inventing the contract from scratch

### Package 5: A2C Packet Builder

- packet: `TODO-017`
- dependency gate:
  - only after `TODO-016`
- concrete job:
  - encode mapping from normalized intake to task packet fields
  - keep packet shape aligned with `TO-DO/TASK_TEMPLATE.md`

### Package 6: A2C Input Test Net

- packet: `TODO-019`
- dependency gate:
  - only after `TODO-016` and `TODO-017`
- concrete job:
  - build fixture-driven tests for actionable input, vague input, noisy input, and defer/reject behavior

## Default First Job

If the operator says only “work”, “continue”, or explicitly requests `GPT-5.3-Codex-Spark` without naming a packet, the default first job is:

1. `TODO-001`
2. if `TODO-001` is blocked by repo truth, fall back to `TODO-011`
3. if both are blocked, hand the baton back to `N1` instead of improvising a new packet

## Coding Discipline For This Model

- prefer code, tests, scripts, types, and fixtures over broad explanatory prose
- keep doc edits limited to packet truth or contract wording that directly supports the code change
- map callers before changing shared runtime semantics
- stop when the packet turns into policy, product design, or orchestration work
- treat `Verification` in the task packet as mandatory, not advisory

## Handoff Rule

If the model reaches one of these conditions, hand the baton back instead of forcing progress:

- the packet is mostly planning or doctrine
- dependencies are not landed yet
- the next move is lane selection, not implementation
- the pass would widen from one bounded code slice into multi-surface architecture

Return target:

- `skills/todo-executor/SKILL.md` for normal queue execution without the model-specific overlay
- `skills/n1/SKILL.md` for baton routing or lane choice
- `skills/personal-ai-assistant/SKILL.md` for planning or synthesis
