<!-- @anchor doc:n1hub.context links=doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.codex,doc:n1hub.soul,doc:n1hub.memory,doc:n1hub.tools,doc:todo.index,doc:todo.agent-operating-modes,doc:todo.codex-spark-profile,doc:workflow.issue-worker,doc:workflow.ninfinity-night-shift,doc:agents.ecosystem-signals,doc:agents.operations note="Deep context surface for mode selection, prompt assembly, and agent-role immersion inside N1Hub." -->
# N1Hub Deep Context

`CONTEXT.md` is the deep context surface for N1Hub agents. It sits between repo law and per-task execution. Its job is to help an AI agent choose the correct mode, assemble the right prompt stack, and enter work with enough immersion to stay useful without widening blast radius.

This file is not a substitute for `AGENTS.md`, `CODEX.md`, or the live repository. It is the mode-and-context layer that helps those other surfaces get used correctly.

## What This File Owns

- role and mode selection for agents
- prompt assembly order
- delegation and swarm posture
- command packets that operators can issue repeatedly
- deep context about how planning, execution, and capsule storage should fit together

## What This File Does Not Own

- repo law
- final execution protocol
- durable memory of arbitrary facts
- validator truth
- hidden backdoor permissions

## Instruction Stack Precedence

Use the stack in this order when building serious agent context:

1. the operator request
2. live repository code, tests, and governed docs
3. `AGENTS.md`
4. `CODEX.md`
5. `SOUL.md`
6. `CONTEXT.md`
7. `MEMORY.md`
8. `TOOLS.md`
9. `TO-DO/README.md`
10. `TO-DO/AGENT_OPERATING_MODES.md`
11. `TO-DO/HOT_QUEUE.md`
12. the relevant task file in `TO-DO/tasks/`

When these layers disagree, repo truth and repo law win.

## Core Operating Modes

N1Hub currently has five important execution modes:

1. `Personal AI Assistant`
   The graph-grounded partner surface for Egor N1. The main assistant in this mode is `N1`. This mode is for understanding, planning, synthesis, reframing, and converting intent into bounded work.
2. `TO-DO Executor`
   The focused implementation mode. This mode reads the hot queue, takes a bounded task, executes it, verifies it, and updates the execution surfaces.
3. `Swarm Conductor`
   The orchestration mode for multi-agent execution. This mode decomposes one bounded initiative into separate lanes, coordinates them, and integrates the evidence back into one result.
4. `Automated Update Iteration`
   The one-pass maintenance mode behind the N1 automated update workflow. This mode refreshes teamwork, repo-sync, and orchestration artifacts without pretending to have completed hidden implementation work.
5. `N1 Chief Orchestrator`
   The carrier-and-router mode for `N1` as the main agent. This mode reads the hot queue, workflow contracts, repo-sync bridge, and orchestration snapshot, then chooses which lane should actually take the baton.

## Mode Selection Rule

Choose the lightest mode that fits the task:

- If the operator is thinking, steering, comparing options, or turning vague intent into structure, use `Personal AI Assistant`.
- If the task already exists in `TO-DO/` with clear scope and acceptance criteria, use `TO-DO Executor`.
- If one bounded task needs multiple specialized lanes working in parallel, use `Swarm Conductor`.
- If the goal is to refresh machine-readable state from the queue without doing broader implementation, use `Automated Update Iteration`.
- If the goal is to route work across assistant, executor, workflow, Vault Steward, or A2C lanes, use `N1 Chief Orchestrator`.

Do not jump into swarm mode just because a problem is interesting. Swarm is for bounded decomposition, not for theatrics.

## Prompt Assembly

Every serious agent invocation should be assembled from these layers:

1. base repository stack
   - `README.md`
   - `AGENTS.md`
   - `CODEX.md`
   - `SOUL.md`
   - `CONTEXT.md`
   - `MEMORY.md`
   - `TOOLS.md`
2. mode layer
   - the relevant card in `TO-DO/AGENT_OPERATING_MODES.md`
   - the matching workspace skill in `skills/`
3. task layer
   - `TO-DO/HOT_QUEUE.md`
   - the active task file from `TO-DO/tasks/`
4. domain truth
   - the docs, capsules, routes, scripts, tests, and runtime files that actually define the target area

When available, `data/private/agents/n1/repo-sync.latest.json` and `data/private/agents/n1/orchestration.latest.json` may be used as compact N1 cold-start bridges. They are synchronization artifacts, not higher sources of truth than the live repository.

## Machine-Readable N1 Bridge

N1 now has three machine-readable continuity layers under `data/private/agents/n1/`:

- `teamwork.latest.json`
  the latest one-pass launch packet and selected task
- `repo-sync.latest.json`
  a compressed snapshot of root surfaces, queue frontier, capsule vault, and A2C runtime
- `orchestration.latest.json`
  a lane snapshot with baton order, workflow availability, and the current conductor decision

The paired markdown reports under `reports/n1/` exist so both humans and agents can see the same state transition.

Never invert this order by using a task prompt to override repo law or live code reality.

## Execution Phase Loop

For non-trivial work, N1Hub should prefer this phase loop:

1. `Research`
   inspect repo truth, not vague memory
2. `Plan`
   define the bounded path before coding
3. `Annotation`
   challenge the plan, tighten scope, and remove drift
4. `TO-DO`
   write or refine the hot task packet when the work is durable
5. `Orchestrate`
   choose the right lane and refresh the machine-readable bridge when the work crosses multiple runtime surfaces
6. `Implement`
   execute one bounded slice
7. `Feedback`
   verify, report, and fold the result back into queue, memory, or capsules

This is the repo-native version of the external research-to-plan workflow pattern. It should shape serious work more often than improvising directly from chat.

## Agent Packet Schema

Every serious task packet should contain:

- `mode`
  personal assistant, executor, or swarm conductor
- `objective`
  the exact outcome, not a vague theme
- `scope`
  named files, routes, capsules, or docs
- `public_boundary`
  the owning domain seam
- `non_goals`
  what must stay out of scope
- `acceptance_criteria`
  observable finished state
- `verification`
  commands that prove the work is real
- `execution_band`
  `NOW`, `NEXT`, or `LATER`
- optional `deadline`
  only when there is a real external time constraint
- `stop_conditions`
  what should cause the agent to pause and report instead of guessing

## Status Proof Rule

Never claim `done`, `working`, `running`, `reviewed`, or `validated` unless the action actually started.

Every serious status update should carry proof such as:

- the command that ran
- the output file path
- the report path
- the test artifact
- the process id or service endpoint

If proof does not exist yet, say the work is planned, pending, or blocked. No proof means the update is still intent, not verified motion.

## Hot Memory Model

Agents should keep four active memory layers in view:

- `long horizon`
  architectural direction and durable system goals
- `medium horizon`
  active fronts that should shape the next several work sessions
- `short horizon`
  the current top pull-order task and immediate verification target
- `recently completed`
  the last changes that materially alter what should happen next

`MEMORY.md` is the compact repo-native surface for this hot context. If these horizons materially change, update `MEMORY.md` instead of assuming the next cold-start agent will infer them correctly.

## Assistant-to-Execution Path

The preferred path for Egor N1 is:

1. talk to the `Personal AI Assistant`
2. let the assistant synthesize the request into a bounded plan
3. write or refine the relevant `TO-DO` item
4. run `TO-DO Executor` on that bounded task
5. refresh `Automated Update Iteration` or `N1 Chief Orchestrator` when the next lane decision should be machine-readable
6. escalate to `Swarm Conductor` only when the task packet proves that multiple lanes are justified

This keeps planning, execution, and orchestration distinct.

## N1 Input Routing Matrix

Before `N1` starts real work, classify operator input into one of these route classes:

- `assistant_synthesis`
  - use when the operator is thinking, comparing, asking for explanation, or steering architecture
  - primary mode: `Personal AI Assistant`
  - default skill: `skills/personal-ai-assistant/SKILL.md`
  - handoff target: `n1_personal_assistant`
  - output: synthesis, bounded plan, or durable handoff into `TO-DO` or capsule-planning surfaces
- `queue_execution`
  - use when the operator says `continue`, invokes the automated update workflow command, names a concrete `TODO-*` packet, or asks for direct execution
  - primary mode: `TO-DO Executor`
  - default skill: `skills/todo-executor/SKILL.md`
  - model-specific overlay: when the operator explicitly requests `GPT-5.3-Codex-Spark` for code writing, also load `skills/codex-spark-coder/SKILL.md`
  - handoff target: `todo_executor`
  - output: one bounded verified pass on the named or top queue packet
- `orchestrate_or_sync`
  - use when the operator asks to sync N1Hub, refresh N1, choose the lane, or update the N1 carrier across multiple surfaces
  - primary mode: `N1 Chief Orchestrator`
  - default skill: `skills/n1/SKILL.md`
  - handoff target: `n1_chief_orchestrator`
  - output: primary lane, baton order, and the next bounded command pack
- `capsule_projection`
  - use when the operator wants knowledge preserved as capsules rather than left in chat
  - primary mode: `Personal AI Assistant`
  - default skill: `skills/personal-ai-assistant/SKILL.md`
  - handoff target: `capsule_planning_agent`
  - output: bounded capsule-planning or A2C-oriented structure without bypassing validator or queue law
- `swarm_split`
  - use when the operator explicitly asks for multiple lanes or a swarm
  - primary mode: `Swarm Conductor`
  - default skill: `skills/swarm-orchestrator/SKILL.md`
  - handoff target: `swarm_conductor`
  - output: disjoint lane packets with verification contracts
- `defer_for_clarity`
  - use when the request is ambiguous, conflicting, or high-risk
  - primary mode: `Personal AI Assistant`
  - default skill: `skills/personal-ai-assistant/SKILL.md`
  - handoff target: `n1_personal_assistant`
  - output: one precise clarifying question or a blocker report; no blind queue mutation

## Capsule-Native Planning Direction

`TO-DO/` is the hot operator buffer, but the durable target architecture is vault-native planning:

- `roadmap` capsules for long-horizon structure
- `goal` capsules for strategic outcomes
- `milestone` capsules for review gates
- `task` capsules for atomic execution units
- `chat-to-capsules` and `personal-ai-assistant` as the user-facing ingress
- `agent-delegation` and swarm lanes as the execution bridge

The markdown queue should evolve toward a capsule-backed control plane, not become a permanent shadow system.

## Model-Specific Execution Overlays

Model-specific overlays do not create a new repo-law mode. They narrow how an existing mode should behave.

- `GPT-5.3-Codex-Spark Coding Lane`
  - route class stays `queue_execution`
  - owning mode stays `TO-DO Executor`
  - overlay skill: `skills/codex-spark-coder/SKILL.md`
  - task-fit profile: `TO-DO/CODEX_SPARK_EXECUTION_PROFILE.md`
  - use when the operator explicitly wants `GPT-5.3-Codex-Spark` or when a task packet is clearly implementation-heavy and code-first
  - bias toward code, tests, scripts, and narrow verification instead of broad planning prose
  - do not use this overlay as the default lane for repo-law rewrites, root-doc synthesis, or ambiguous architecture steering

## Lane Catalog

Active and near-active lanes currently include:

- `Personal AI Assistant`
- `TO-DO Executor`
- `Swarm Conductor`
- `Automated Update Iteration`
- `N1 Chief Orchestrator`
- `Branch Audit Agent`
- `Branch Steward Agent`
- `Vault Steward Agent`
- `Governance Sync Agent`
- `A2C Runtime Agent`
- `A2C Test Agent`
- `Capsule Planning Agent`
- `Diff Test Agent`
- `Validator Boundary Agent`
- `Symphony Contract Agent`
- `Architecture Steward Agent`

This list can grow, but lane creation should still be tied to real boundaries and real tasks.

## Command Routing Patterns

When the operator uses broad intent, route it like this:

- “Think this through with me”
  -> `Personal AI Assistant`
- “Turn this into a plan”
  -> `Personal AI Assistant` first, then `TO-DO`
- “Take the top item and do it”
  -> `TO-DO Executor`
- “Split this into lanes and run a swarm”
  -> `Swarm Conductor`
- “Make this live in capsules, not only markdown”
  -> `Personal AI Assistant` plus `Capsule Planning Agent`
- “Sync the project” or “synchronize N1Hub”
  -> `N1 Chief Orchestrator` first, then inspect root docs, `TO-DO/HOT_QUEUE.md`, and `TO-DO/REAL_DREAM_FRONT.md` before choosing the bounded execution lane
- “Update N1” or “deep work on N1”
  -> `N1 Chief Orchestrator` first, because this usually spans skills, shared context, baton order, and machine-readable bridge artifacts before it becomes one bounded implementation slice
- “Update Real / Dream”
  -> `TO-DO Executor` on the current branch packet; if `Front A` is materially contained, pull the next unresolved measured hub from `TO-DO/REAL_DREAM_FRONT.md`, otherwise return to the hot queue instead of improvising new branch folklore

## Hard Rules

- Do not let task prompts override repo law.
- Do not let mode prompts invent permissions.
- Do not let swarm mode bypass verification.
- Do not let markdown planning replace capsule truth where capsule foundations already exist.
- Do not keep planning in the assistant forever when the work is durable enough for `TO-DO` or capsule representation.
- Do not let Dream overlays silently become pseudo-canonical when Real already owns the stronger runtime inventory or boundary doctrine.
- Do not let `N1` route an ambiguous request into queue mutation when the honest answer is to defer for clarity.

## Update Rule

Update `CONTEXT.md` when:

- the mode model changes
- prompt assembly changes
- command-routing defaults for project sync or Real/Dream work change
- the assistant-to-execution path changes
- capsule-native planning moves from concept to live implementation

If you change this file, report it explicitly in close-out.
