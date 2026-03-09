<!-- @anchor doc:todo.execution-protocol links=doc:todo.index,doc:todo.decomposition-law,doc:todo.lane-ownership,doc:todo.dependency-map,doc:todo.hot-queue,doc:todo.task-template,doc:todo.agent-operating-modes,doc:n1hub.codex,doc:n1hub.context note="Execution and teamwork protocol for carrying one hot TO-DO task through bounded implementation inside N1Hub." -->
# N1Hub TO-DO Execution Protocol

Updated: 2026-03-09

This protocol defines how one hot `TO-DO` item should move from queue entry to completed, blocked, or handed-off state.

The goal is not to add ceremony. The goal is to stop agents from doing invisible work, leaving stale task packets behind, or widening scope without updating the queue.

## Core Rule

One serious execution pass should advance one bounded task packet.

That pass may:

- complete the task
- partially advance the task and leave a better handoff
- discover a real blocker and mark the task `BLOCKED`
- split follow-up work into new bounded tasks

That pass should not:

- touch three unrelated queue items at once
- quietly change queue reality without updating the packet
- claim progress without verification or explicit evidence

## Status Model

- `READY`
  The task packet is specific enough to be taken by an agent right now.
- `ACTIVE`
  An agent has begun bounded work and the packet now reflects the current implementation front.
- `BLOCKED`
  The task cannot move safely without a new decision, missing evidence, or another upstream change.
- `DONE`
  Deliverables exist, verification passed, residual risk is explicit, and the queue no longer treats the task as live hot work.

## Mandatory Read Order For One Pass

1. `TO-DO/README.md`
2. `TO-DO/AGENT_OPERATING_MODES.md`
3. `TO-DO/EXECUTION_PROTOCOL.md`
4. `TO-DO/HOT_QUEUE.md`
5. the selected task packet in `TO-DO/tasks/`
6. the exact code, docs, tests, and capsules named in the packet

Do not start from chat memory alone when the packet already exists.

## Teamwork Artifacts

When the host supports it, each pass should leave or refresh machine-readable teamwork artifacts:

- `data/private/agents/n1/teamwork.latest.json`
- `data/private/agents/n1/teamwork.history.jsonl`
- `reports/n1/automated-update/*.md`

These artifacts do not replace the queue. They are the machine-readable bridge between queue law and actual execution history.

## Task Packet Contract

Every `P0` or `P1` packet should carry:

- exact scope boundaries
- explicit dependencies when they exist
- source signals when the task is grounded in another audit, article pattern, or runtime report
- entry checklist
- non-goals
- implementation plan
- operator command pack
- acceptance criteria
- verification commands
- stop conditions
- evidence and artifact expectations
- queue update rule

If one of those is missing, fix the packet before pretending the task is ready.

## Execution Loop

1. Select the highest-priority relevant task from `TO-DO/HOT_QUEUE.md`.
2. Confirm that the packet still matches repo truth.
3. If needed, move the packet from `READY` to `ACTIVE`.
4. Execute one bounded implementation slice.
5. Run the named verification commands or the smallest sufficient subset justified by the slice.
6. Update the packet, queue, and teamwork artifacts with the actual outcome.
7. Leave a handoff that tells the next agent exactly where to continue.

## Pass Types

Each serious pass should know what kind of pass it is before starting:

- `discovery pass`
  map callers, writer paths, counts, or boundary truth before mutation
- `decision pass`
  classify a bounded set and force explicit outcomes
- `mutation pass`
  change one runtime or doc contract
- `proof pass`
  add or tighten tests, reports, or other verification artifacts

Do not combine discovery, major mutation, and large test expansion into one foggy pass unless the packet explicitly proves that the scope stays bounded.

## Dependency Rule

When a task depends on another task or artifact:

- name the dependency explicitly in the packet
- distinguish hard dependency from soft dependency
- do not simulate progress before the dependency exists
- if the dependency lands and changes the path, update the packet before continuing

If the real dependency graph changes, the queue must change too.

## Partial Completion Rule

If the pass moved the task forward but did not finish it:

- keep the task in the queue
- set or retain `ACTIVE`
- update `Implementation Plan`, `Context Snapshot`, `Risks`, or `Handoff Note` if repo truth changed
- record what was completed and what remains

Do not mark a task `DONE` just because one internal step passed.

## Blocked Rule

Mark a task `BLOCKED` when:

- stop conditions triggered
- the packet conflicts with repo truth
- the task depends on another hot task finishing first
- verification exposes a new problem that must be solved elsewhere

When blocking a task, record:

- the exact blocker
- the exact path or command that exposed it
- the smallest next decision needed to unblock it

If the blocker really belongs to another cluster or owner lane, split a new packet instead of burying that dependency in prose.

## Completion Rule

Mark a task `DONE` only when:

- the deliverables are actually present
- the acceptance criteria are actually met
- the verification commands actually passed
- the packet says what remains risky or intentionally deferred
- the queue was updated so future agents do not keep pulling completed work

## Acceptable Follow-Up Splits

Split new tasks when:

- the remaining work belongs to a different cluster
- the remaining work needs a different owner lane
- the original packet would become too broad to stay legible

Do not split because the work feels “important.” Split because the boundary changed.

## Handoff Minimum

Every handoff should give the next agent:

- current status
- exact next file, report, or artifact to open first
- what is already proven
- what is still missing
- whether the next pass is discovery, decision, mutation, or proof

If a handoff cannot say those things clearly, the packet is under-specified.

## Queue Review Cadence

Review queue truth at these moments:

- after any status change
- after any blocker
- after any split into follow-up tasks
- after any audit that changes pull order
- after any pass that invalidates the current `Goal`, `Scope`, or `Implementation Plan`

## Anti-Patterns

- leaving `READY` on a task that already has active partial work
- changing code without updating the task packet or queue
- closing a task without verification evidence
- using one packet as a license to rewrite a whole subsystem
- letting automated-update traces diverge from the human-readable queue
