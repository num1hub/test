<!-- @anchor doc:n1hub.memory links=doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.codex,doc:n1hub.context,doc:n1hub.soul,doc:n1hub.tools,doc:todo.index,doc:todo.agent-operating-modes,doc:openclaw.fork-notes,doc:n1hub.low-blast-radius-architecture,doc:governance.anchors-spec note="Durable memory surface for operator preferences, repo truths, and active architectural continuity in N1Hub." -->
# N1Hub Working Memory

`MEMORY.md` is the durable markdown memory surface for N1Hub. It carries stable operator preferences, long-lived repo truths, active architectural priorities, and other high-signal continuity that should survive across sessions.

It is not a scratchpad, not a large conversation dump, and not a substitute for capsules, tests, contracts, or live repository truth.

## What Belongs Here

- stable operator preferences that repeatedly shape implementation style
- durable repo truths that are expensive to rediscover each session
- current architectural priorities that remain active across multiple tasks
- long-lived boundary rules that matter even when the immediate task changes
- continuity notes about how the instruction stack is supposed to work together

## What Does Not Belong Here

- secrets, tokens, private credentials, or raw keys
- large logs, traces, pasted transcripts, or temporary debug output
- ephemeral task plans that stop mattering after one short turn
- speculative claims not yet reflected in code, docs, tests, or verified decisions
- facts already stored more canonically in capsules, workflow files, schemas, or generated artifacts

## Operator and Collaboration Preferences

- Prefer deep, repo-native integration over shallow copying or demo-mode adaptation.
- Favor AI-friendly architecture that reduces blast radius through explicit boundaries, public entrypoints, readable files, and measurable guardrails.
- Treat root instruction surfaces as living governance files that must remain coherent.
- Prefer evidence-backed changes, regenerated artifacts, and explicit verification over hand-wavy claims of completion.
- When external systems inspire the repo, adapt them to N1Hub reality instead of importing foreign assumptions verbatim.
- For hot execution planning, prefer priority, execution band, and pull order over early calendar deadlines. AI agents can move much faster than human schedule intuition, so date pressure should be added only when it reflects real external constraints.

## Stable Repo Truths

- N1Hub is a Next.js App Router, React, and TypeScript repository.
- The main runtime domains are `validator`, `a2c`, `symphony`, `graph`, branching or diff, and agent runtime or Vault Steward.
- `data/capsules` is validator-owned storage and should not be casually mass-edited.
- Anchor governance is a real repo-native governance layer, not a demo overlay.
- The main instruction stack includes `README.md`, `AGENTS.md`, `SOUL.md`, `CODEX.md`, `TOOLS.md`, `WORKFLOW.md`, `NINFINITY_WORKFLOW.md`, and `MEMORY.md`.
- `CONTEXT.md` is the deep role and mode context surface for assistant, executor, and swarm behavior.
- `skills/` exists as a workspace-local capability layer in the OpenClaw-compatible style, but N1Hub still centers repo truth, validator law, capsules, and workflows.
- Two operator-facing modes are now explicit: `Personal AI Assistant` and `TO-DO Executor`. `Swarm Conductor` is the bounded multi-agent orchestration lane when one worker is not enough.
- `Automated Update Iteration` and `N1 Chief Orchestrator` now exist as machine-readable bridge modes for refresh and baton-routing rather than broad hidden autonomy.
- The main AI agent identity for Egor N1 is `N1`.
- serious status claims in N1Hub should be proof-bearing rather than declarative; command output, artifact paths, or equivalent evidence should back completion claims
- N1 now has a repo-sync artifact under `data/private/agents/n1/` and `reports/n1/repo-sync/` to compress live project state into a cold-start packet without replacing live repo truth
- N1 now also has an orchestration artifact under `data/private/agents/n1/` and `reports/n1/orchestration/` so the next cold-start agent can see available lanes, baton order, and the current conductor decision without inventing them from scratch

## Current Durable Priorities

1. `#1 Vault Steward Runtime`
   Keep prompt construction, queue planning, artifacts, and orchestration from collapsing into private god-files.
2. `#2 Validator/API boundary package`
   Keep validator-owned contracts, route schemas, and CLI or OpenAPI surfaces explicit and stable.
3. `#3 Symphony orchestration contracts`
   Keep workflow law, prompt rendering, tracker state, and execution surfaces separable.
4. Root-surface stewardship
   Keep `README.md`, `AGENTS.md`, `SOUL.md`, `CODEX.md`, `TOOLS.md`, and `MEMORY.md` coherent as one instruction stack.
5. Assistant and execution-mode coherence
   Keep `CONTEXT.md`, `TO-DO/AGENT_OPERATING_MODES.md`, and workspace `skills/` coherent with the actual assistant, executor, and swarm lanes used in N1Hub.

## Hot Memory Horizons

### Long Horizon

- move `TO-DO/` from markdown-only hot buffer toward a capsule-native execution control plane
- keep low-blast-radius architecture and public-boundary discipline as the base engineering law
- preserve Real/Dream as a real planning and promotion system rather than branch folklore

### Medium Horizon

- finish the Real/Dream triage wave before broad new architecture work
- harden A2C runtime semantics and tests after the branch field is mapped and classified
- keep the Vault Steward runtime as the top cluster for bounded refactor work
- treat cross-model review, scheduled one-pass iteration, and hot-warm-cold context routing as the next serious agent-systems frontier after current P0 branch work
- deepen N1 as the chief orchestrator so Personal Assistant, TO-DO, Symphony, N-Infinity, Vault Steward, and A2C can be routed through one stable carrier identity

### Short Horizon

- `TODO-007` Real Dream Global Audit
- `TODO-008` Real Dream Constitutional Hub Triage
- `TODO-009` Vault Steward Dream-Only Operations Review
- `TODO-010` Real-Only Law Sync

### Recently Completed Context

- `TO-DO/` now exists as a repo-native hot execution buffer with queue law, roadmap, and task packets
- Real/Dream corpus facts were measured and converted into first-wave hot tasks
- `CONTEXT.md` and `TO-DO/AGENT_OPERATING_MODES.md` now define deep mode context and reusable prompt slices for assistant, executor, and swarm lanes
- `N1` now has machine-readable `repo-sync` and `orchestration` continuity layers plus dedicated CLI entrypoints for sync and baton-routing

## Memory Read Policy

- Read `MEMORY.md` after `README.md`, `AGENTS.md`, `SOUL.md`, and `CODEX.md` when the task benefits from cross-session continuity.
- Use this file as a compact continuity layer, not as the primary source of technical truth.
- If `MEMORY.md` conflicts with current code, tests, schemas, or governed docs, the live repo wins and `MEMORY.md` must be updated.

## Memory Write Policy

Update this file when changes affect one of the following:

- durable operator preferences
- long-lived architectural priorities
- stable boundary rules
- persistent repo truths that future agents would otherwise need to rediscover
- instruction-stack semantics that now matter across multiple sessions

Do not update this file for one-off implementation trivia. Keep it compact enough to stay useful as injected or hand-read context.

## OpenClaw-Inspired Patterns Adopted Cleanly

N1Hub adopts these public, high-signal OpenClaw-style patterns in a clean-room way:

- explicit bootstrap files for law, identity, tools, and memory
- compact durable memory as markdown instead of hidden chat residue
- workspace-local `skills/` for focused capability prompts
- separation between persona, execution rules, tool notes, and long-lived memory

N1Hub does not replace capsules, validator truth, or workflow contracts with markdown memory files.

## Disclosure Rule

If you materially change this file, say so explicitly in close-out just as you would for other instruction surfaces.
