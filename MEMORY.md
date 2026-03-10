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
- `capsule.foundation.workspace.v1` is now canonically real-first for both workspace boundary doctrine and live runtime inventory; Dream should only carry future workspace delta
- `capsule.foundation.capsuleos.v1` is now canonically real-first for the live CapsuleOS operating contract; Dream should only carry future operating-system delta and should not shadow validator-owned trust law
- `N1` now has an explicit routing model: synthesis, queue execution, orchestration or sync, capsule projection, swarm split, and defer-for-clarity are distinct lanes, and explicit user override still beats heuristic routing
- `N1` routing is now richer than mode-only classification: each route also carries a default skill and handoff target so cold-start orchestration can move from operator intent to the correct baton lane without rebuilding that mapping from prose

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

- move from the now-contained Real/Dream constitutional wave into A2C intake, packetization, and routing work
- if branch governance is deliberately reopened again, continue from the next newly measured unresolved hub or the promotion-test frontier instead of reopening already-contained branch splits
- harden A2C runtime semantics and tests after the branch field is mapped and classified
- keep the Vault Steward runtime as the top cluster for bounded refactor work
- treat cross-model review, scheduled one-pass iteration, and hot-warm-cold context routing as the next serious agent-systems frontier after current P0 branch work
- deepen N1 as the chief orchestrator so Personal Assistant, TO-DO, Symphony, N-Infinity, Vault Steward, and A2C can be routed through one stable carrier identity

### Short Horizon

- `TODO-001` A2C Query Safety
- `TODO-016` A2C User Input Intake Contract
- `TODO-017` A2C TO-DO Packet Builder
- `TODO-019` A2C User Input Test Net
- `TODO-011` Real Dream Promotion Test Net

### Recently Completed Context

- `TO-DO/` now exists as a repo-native hot execution buffer with queue law, roadmap, and task packets
- Real/Dream corpus facts were measured and converted into first-wave hot tasks
- `CONTEXT.md` and `TO-DO/AGENT_OPERATING_MODES.md` now define deep mode context and reusable prompt slices for assistant, executor, and swarm lanes
- `N1` now has machine-readable `repo-sync` and `orchestration` continuity layers plus dedicated CLI entrypoints for sync and baton-routing
- `TODO-020` and `TODO-021` rewrote the Dream background runtime and Dream vault stewardship hubs around real-first runtime truth
- `TODO-022` promoted workspace boundary doctrine into Real and rewrote Dream workspace as future-only overlay
- `TODO-023`, `TODO-024`, `TODO-025`, `TODO-026`, and `TODO-027` made `personal-ai-assistant`, `key-agents`, `n1hub`, `tracker`, and `capsuleos` explicit real-first branch pairs instead of leaving the drift interpretation implicit
- `TODO-028` and `TODO-029` made `n-infinity` and `project.n-infinity` explicit real-first branch pairs instead of leaving the last measured retain-dream decisions implicit
- `TODO-030` extended branch containment into the first downstream N-Infinity atomic trio by making `weaver`, `parliament`, and `suggestion-agent` explicit real-first role pairs with future-only Dream delta
- `TODO-031` created a repo-native `GPT-5.3-Codex-Spark` coding overlay for bounded code-writing passes without inventing a separate repo-law mode
- `TODO-032` added a model-specific TO-DO execution profile for `GPT-5.3-Codex-Spark`, including a current fit matrix, pull preference, and anti-drift guidance for coding-heavy packets
- `TODO-033` extended that profile into explicit work domains, concrete active packages, and a first-job ladder so the model has real current work rather than only abstract fit guidance
- `TODO-018` made N1 user-input routing explicit across shared context, skills, and the machine-readable orchestration bridge
- `TODO-018` now also makes the route-to-skill and handoff-target contract explicit across `SOUL.md`, mode cards, skills, and the orchestration snapshot

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
