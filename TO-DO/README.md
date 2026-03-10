<!-- @anchor doc:todo.index links=doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.codex,doc:n1hub.context,doc:n1hub.memory,doc:todo.decomposition-law,doc:todo.lane-ownership,doc:todo.dependency-map,doc:todo.hot-queue,doc:todo.execution-protocol,doc:todo.roadmap-q2-2026,doc:todo.task-template,doc:todo.real-dream-front,doc:todo.capsule-native-execution,doc:todo.agent-operating-modes,doc:todo.codex-spark-profile note="Hot execution buffer and planning law for AI-agent work inside N1Hub." -->
# N1Hub Hot Execution Buffer

Updated: 2026-03-09

`TO-DO/` is the active execution buffer for AI agents working inside N1Hub. It is the place where hot work is planned, prioritized, ordered, and made concrete before implementation starts.

This folder is not an archive, not a brainstorm dump, and not a place for vague wishes. Every item here should point at real repo surfaces, real code boundaries, real tests, and real verification commands.

## Purpose

Use `TO-DO/` to:

- hold the current hot queue for AI-agent work
- define goals, execution band, acceptance criteria, and proof of completion without fake schedule pressure
- keep active work aligned with the real cluster order of N1Hub
- turn branch drift and vault pressure into explicit execution lanes
- reduce opportunistic wandering across the repo
- make the next valuable step obvious for the next agent

## Folder Law

Everything in `TO-DO/` should follow these rules:

1. Every hot task needs an ID, priority, owner lane, execution band, goal, scope, non-goals, and verification commands.
2. Prefer execution band and pull order over arbitrary date promises. Add a real deadline only when an external constraint actually exists.
3. Tasks must point to concrete code surfaces and not hide behind abstract themes.
4. P0 and P1 tasks should include an execution packet with implementation notes, command pack, and stop conditions.
5. A task without acceptance criteria is not ready for implementation.
6. A task without verification commands is not ready for promotion.
7. Finished items should move out of the hot lane or be explicitly marked complete with outcome evidence.
8. If repo truth changes, update the task file instead of leaving stale plans in place.
9. For Real/Dream branch packets, record both the real canonical outcome and the remaining Dream-only delta explicitly.

## Decomposition Law

Hot work should be decomposed before execution, not while the executor is already drifting.

Use [TO-DO/DECOMPOSITION_LAW.md](/home/n1/n1hub.com/TO-DO/DECOMPOSITION_LAW.md) as the task-sizing contract. In practice this means:

- one hot task should usually produce one bounded outcome
- one owner lane should be able to carry one serious pass without constant arbitration
- one queue item should have one dominant class: audit, decision, implementation, test net, control plane, or migration
- when the verification block, handoff note, or scope list starts fanning out, the task should split

If a task cannot be explained as one bounded packet, it is not ready to be `READY`.

## Priority Model

- `P0`
  Active hot work. Pull first unless the user gives a narrower override.
- `P1`
  Next-wave work. Ready after `P0` items are materially contained.
- `P2`
  Important but not time-critical. Keep visible, not blocking.

## Execution Bands

- `NOW`
  Active pull-order work. Agents should assume this is hot unless the operator overrides.
- `NEXT`
  Next-wave work that should start only after the current `NOW` band is materially contained.
- `LATER`
  Important work that stays visible but should not displace the active lane.

## 21st-Century Code Standards

Every task in this folder assumes these engineering standards:

- contract-first boundaries
- type-first public surfaces
- deterministic scripts and CI-safe execution
- `dry-run` means zero writes
- explicit storage ownership
- no silent side effects behind read-like commands
- boundary tests before broad refactors
- observability and operator-visible reports
- small-step reversible refactors
- file-size pressure treated as architecture signal, not style trivia

## Folder Map

- `HOT_QUEUE.md`
  Live pull order for AI agents.
- `DECOMPOSITION_LAW.md`
  Task-sizing, dependency, and split discipline for bounded execution packets.
- `LANE_OWNERSHIP_MAP.md`
  Maps owner lanes to the classes of work they should actually own.
- `DEPENDENCY_MAP.md`
  Shows which hot tasks unlock the next ones and where serial order matters.
- `REAL_DREAM_FRONT.md`
  Current Real/Dream field brief with corpus facts, hotspots, and first-wave execution order.
- `CAPSULE_NATIVE_EXECUTION.md`
  Design brief for moving planning and delegation from markdown into the capsule vault.
- `AGENT_OPERATING_MODES.md`
  Reusable mode cards, prompt slices, and operator command packs for assistant, executor, and swarm lanes.
- `CODEX_SPARK_EXECUTION_PROFILE.md`
  Model-specific execution profile for `GPT-5.3-Codex-Spark`: task-fit matrix, pull preference, and anti-drift rules for code-first packets.
- `EXECUTION_PROTOCOL.md`
  Status model, teamwork law, and per-pass execution rules for bounded task advancement.
- `AUTOMATED_UPDATE_WORKFLOW.md`
  Single-iteration workflow for `N1` that turns the hot queue into a teamwork launch packet.
- `ROADMAP_Q2_2026.md`
  Wave-based delivery plan.
- `TASK_TEMPLATE.md`
  Standard structure for new hot tasks.
- `tasks/*.md`
  Detailed active tasks.

## Agent Intake Order

When no user override exists, agents should read:

1. `TO-DO/README.md`
2. `TO-DO/DECOMPOSITION_LAW.md`
3. `TO-DO/LANE_OWNERSHIP_MAP.md`
4. `TO-DO/DEPENDENCY_MAP.md`
5. `TO-DO/AGENT_OPERATING_MODES.md`
6. `TO-DO/CODEX_SPARK_EXECUTION_PROFILE.md` when the operator explicitly asks for `GPT-5.3-Codex-Spark` or when a coding-heavy packet should use that overlay
7. `TO-DO/EXECUTION_PROTOCOL.md`
8. `TO-DO/AUTOMATED_UPDATE_WORKFLOW.md` when the operator wants one automated N1 iteration instead of an open-ended chat turn
9. `TO-DO/REAL_DREAM_FRONT.md` when branch, vault, or promotion work is in scope
10. `TO-DO/HOT_QUEUE.md`
11. the first relevant task file from `TO-DO/tasks/`

Then implementation may begin.

## Definition of Ready

A task is ready only if it has:

- a bounded domain
- named files or directories
- a public boundary
- explicit dependencies when another hot task or artifact must land first
- an execution band
- acceptance criteria
- verification commands
- entry checklist
- evidence and artifact expectations
- queue update rule
- a usable execution packet

## Queue Review Cadence

Treat queue grooming as part of execution, not as optional cleanup.

- after each serious pass, update the task packet first and the queue second
- after each new blocker, write the blocker in the packet and reflect it in queue status immediately
- after each new split, add the new bounded packet before pretending the parent task is still self-contained
- after each frontier change, update `HOT_QUEUE.md` so the next agent does not inherit stale pull order
- after each selective branch promotion, update the field brief so the next agent does not have to infer the new canonical branch rule
- after each branch-governance containment pass, either return the default hot path to the queue or name the next unresolved hub explicitly; do not leave free-floating branch work implied

## Definition of Done

A task is done only if:

- the code or docs match the task goal
- acceptance criteria are satisfied
- verification commands ran
- residual risk is explicit
- the queue status was updated
- teamwork artifacts and handoff notes reflect the actual outcome when the host lane supports them
