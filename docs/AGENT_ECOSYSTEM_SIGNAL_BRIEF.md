<!-- @anchor doc:agents.ecosystem-signals links=doc:agents.operations,doc:n1hub.context,doc:n1hub.memory,doc:todo.hot-queue,doc:todo.agent-operating-modes,doc:openclaw.fork-notes note="Clean-room N1Hub brief that translates external AI-agent ecosystem signals into adopt-now, adapt-later, and watchlist decisions." -->
# N1Hub Agent Ecosystem Signal Brief

This document is the clean-room bridge between external AI-agent ecosystem signals and repo-native N1Hub decisions.

It exists to answer one question:

What should N1Hub actually adopt from the wider agent ecosystem right now, and what should remain a watchlist item?

This is not a hype feed, not a link dump, and not a permission slip to import foreign playbooks blindly. Every item here is translated into N1Hub terms and judged by fit against the current instruction stack, hot queue, capsule model, and runtime boundaries.

## Adopt Now

These patterns are already strong fits for the current N1Hub trajectory.

### 1. Cross-Model Adversarial Review

Why it fits:

- N1Hub throughput is increasing through N1, `TO-DO`, and automated update lanes.
- Same-model self-review is too likely to repeat the same blind spots.
- The quality bar in N1Hub depends on proof, boundary discipline, and low blast radius.

Repo-native mapping:

- `skills/adversarial-review/SKILL.md`
- `TODO-013`

Rule:

- implementation lane and reviewer lane must use different model families
- no same-model fallback masquerading as adversarial review
- no "review complete" claim without reviewer proof artifacts

### 2. Proof-Bearing Status Updates

Why it fits:

- N1Hub is building toward more autonomous execution
- status drift is one of the fastest ways for agent systems to become untrustworthy

Repo-native mapping:

- `CONTEXT.md`
- `TO-DO/AGENT_OPERATING_MODES.md`
- `docs/agents-operations.md`

Rule:

- never say `done`, `working`, `running`, or `reviewed` unless the action actually started
- every serious status update should include proof such as a command, output path, report file, process id, or test artifact
- if proof does not exist yet, the correct state is `planned` or `blocked`, not `done`

### 3. Research -> Plan -> Annotation -> TO-DO -> Implement -> Feedback

Why it fits:

- N1Hub already separates assistant synthesis from executor work
- the missing value is not another planning file, but a stable phase model that future agents can follow

Repo-native mapping:

- `CONTEXT.md`
- `TO-DO/EXECUTION_PROTOCOL.md`
- `TO-DO/HOT_QUEUE.md`

Meaning in N1Hub:

1. research repo truth
2. write or refine the plan
3. challenge the plan before implementation
4. mint or update the hot task packet
5. implement one bounded slice
6. verify and feed the result back into queue, memory, or capsules

### 4. Scheduled One-Pass Iteration

Why it fits:

- N1Hub already has one-step automated update
- the safe next step is repeated bounded triggering, not one hidden immortal loop

Repo-native mapping:

- `TO-DO/AUTOMATED_UPDATE_WORKFLOW.md`
- `TODO-014`

Rule:

- one invocation still equals one honest iteration
- recurring execution should come from a scheduler or host trigger
- no silent in-process infinite loop that mutates the repo in the dark

### 5. Explicit Hot/Warm/Cold Context Topology

Why it fits:

- N1Hub already has root docs, context, memory, skills, `TO-DO`, and capsules
- the next scaling risk is routing confusion, not lack of files

Repo-native mapping:

- `CONTEXT.md`
- `MEMORY.md`
- `TODO-015`

Rule:

- hot context should stay compact and always loaded
- warm context should be mode-specific and task-specific
- cold context should be capsule-backed or retrieval-backed, not stuffed into every prompt

## Adapt Carefully

These patterns are promising, but should be adapted only when they solve a real N1Hub bottleneck.

### Worktree-Isolated Swarm Execution

Signals:

- Claude worktree lanes
- Parallel Code
- dmux
- multi-agent Codex

N1Hub stance:

- good fit for future `Swarm Conductor` execution
- should arrive only when task lanes have clear write boundaries
- worktree isolation is useful, but only after task packets and merge rules are strong enough

### Multi-Agent Orchestrators

Signals:

- Paperclip
- Agent Orchestrator
- Cursor Automations

N1Hub stance:

- useful as coordination inspiration
- not a reason to bypass repo-native `TO-DO`, capsules, or workflow law
- orchestration should remain subordinate to N1Hub's own queue, proof, and boundary contracts

### Context Compression and Repo Mapping

Signals:

- RepoMap
- Context Mode
- REFRAG

N1Hub stance:

- highly relevant when repo scale or token pressure becomes the limiting factor
- should be implemented as routing infrastructure, not as another giant markdown file
- belongs behind `TODO-015`, not ahead of it

### Memory Systems

Signals:

- OpenClaw memory stacks
- Claude auto-memory
- Codified Context

N1Hub stance:

- memory is valuable when it reduces repeated explanation
- new memory surfaces must earn their existence by reducing confusion more than they increase overlap
- capsules remain the durable system of record for planning and knowledge when the model outgrows markdown alone

## Watchlist, Not Immediate Work

These ideas may become useful later, but they are not current front-line priorities.

### Error Monitoring Agents

Potential fit:

- future autonomous monitoring for N1Hub app, agent runtime, and background lanes

Why not now:

- current need is stronger execution control and review before always-on incident response

### QueryWeaver

Potential fit:

- if N1Hub later grows a serious text-to-SQL or schema-navigation layer

Why not now:

- not a current bottleneck in the active repository

### Google Workspace CLI

Potential fit:

- future connector surface for calendar, docs, and external operator workflows

Why not now:

- connector sprawl should not outrun core agent execution discipline

### markdown.new and aggressive web-to-markdown tooling

Potential fit:

- future A2C ingestion and DeepMine research workflows

Why not now:

- ingestion quality depends more on pipeline contracts than on another fetch path today

### ChatClaw, Perplexity Computer, ClawdTalk, and interface-heavy agent shells

Potential fit:

- future operator interface expansion

Why not now:

- N1Hub still needs stronger capsule-native planning and bounded execution before more frontends and channels

## Anti-Patterns for N1Hub

Do not adopt these patterns, even if they are fashionable.

- copying leaked or proprietary system prompts
- pretending same-model review is adversarial review
- adding giant context files without load-routing discipline
- treating unbounded loops as a badge of autonomy
- importing vendor-specific magic before repo fit is proven
- letting external agent frameworks replace `TO-DO`, capsules, validator law, or workflow law

## Current Task Mapping

The current best N1Hub translation of these signals is:

- `TODO-013`
  cross-model adversarial review
- `TODO-014`
  recurring one-pass N1 iteration
- `TODO-015`
  hot/warm/cold context topology
- `TODO-012`
  capsule-native execution control plane

Those tasks are the correct execution bridge from ecosystem research into repo-native implementation.

## Decision Rule

When future external AI-agent ideas appear, process them in this order:

1. Does this solve a current N1Hub bottleneck?
2. Can it be expressed through existing repo surfaces first?
3. Does it reduce blast radius, improve proof, or improve routing?
4. If adopted, which `TO-DO` task or capsule should own it?

If those answers are weak, the idea belongs in the watchlist, not in the core system.
