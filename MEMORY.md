<!-- @anchor doc:n1hub.memory links=doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.codex,doc:n1hub.soul,doc:n1hub.tools,doc:openclaw.fork-notes,doc:n1hub.low-blast-radius-architecture,doc:governance.anchors-spec note="Durable memory surface for operator preferences, repo truths, and active architectural continuity in N1Hub." -->
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

## Stable Repo Truths

- N1Hub is a Next.js App Router, React, and TypeScript repository.
- The main runtime domains are `validator`, `a2c`, `symphony`, `graph`, branching or diff, and agent runtime or Vault Steward.
- `data/capsules` is validator-owned storage and should not be casually mass-edited.
- Anchor governance is a real repo-native governance layer, not a demo overlay.
- The main instruction stack includes `README.md`, `AGENTS.md`, `SOUL.md`, `CODEX.md`, `TOOLS.md`, `WORKFLOW.md`, `NINFINITY_WORKFLOW.md`, and `MEMORY.md`.
- `skills/` exists as a workspace-local capability layer in the OpenClaw-compatible style, but N1Hub still centers repo truth, validator law, capsules, and workflows.

## Current Durable Priorities

1. `#1 Vault Steward Runtime`
   Keep prompt construction, queue planning, artifacts, and orchestration from collapsing into private god-files.
2. `#2 Validator/API boundary package`
   Keep validator-owned contracts, route schemas, and CLI or OpenAPI surfaces explicit and stable.
3. `#3 Symphony orchestration contracts`
   Keep workflow law, prompt rendering, tracker state, and execution surfaces separable.
4. Root-surface stewardship
   Keep `README.md`, `AGENTS.md`, `SOUL.md`, `CODEX.md`, `TOOLS.md`, and `MEMORY.md` coherent as one instruction stack.

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
