<!-- @anchor doc:openclaw.fork-notes links=doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.codex,doc:n1hub.soul,doc:n1hub.memory,doc:n1hub.tools note="Selective OpenClaw pattern adoption notes for N1Hub." -->
# OpenClaw Fork Notes for N1Hub

This is a manual, selective fork of ideas from OpenClaw into the N1Hub architecture.

The goal is not to clone OpenClaw as-is. The goal is to extract the patterns that make sense for
N1Hub and bind them to CapsuleOS, AI Wallet, DeepMine, Symphony, and N-Infinity.

## What OpenClaw Gets Right

Based on the official OpenClaw docs, the strongest transferable patterns are:

1. Repo or workspace-owned identity files
   - `AGENTS.md`
   - `SOUL.md`
   - `MEMORY.md`
   - `TOOLS.md`
2. Workspace-local skills
   - `skills/<name>/SKILL.md`
3. A protected control surface
   - browser UI for chat, config, and operational control
4. Clear distinction between memory, persona, and tools
   - personality is not buried inside random prompts
   - tool guidance is not mixed with identity text
   - durable memory is not mixed with either of them
5. Host-level operational realism
   - gateway, auth, onboarding, dashboard, remote access, and long-running service posture are
     treated as first-class concerns

Official references:

- `SOUL.md` and workspace bootstrap files:
  - https://docs.openclaw.ai/concepts/agent
  - https://docs.openclaw.ai/reference/templates/SOUL
- `AGENTS.md`, `MEMORY.md`, and `TOOLS.md` templates:
  - https://docs.openclaw.ai/reference/templates/AGENTS
  - https://docs.openclaw.ai/reference/templates/MEMORY
  - https://docs.openclaw.ai/reference/templates/TOOLS
- public system-prompt structure and sub-agent behavior:
  - https://docs.openclaw.ai/reference/prompt/system
  - https://docs.openclaw.ai/reference/prompt/sub-agents
- memory concepts and indexing:
  - https://docs.openclaw.ai/concepts/memory
  - https://docs.openclaw.ai/reference/prompt/index-memory
- skills:
  - https://docs.openclaw.ai/skills
- control UI and dashboard:
  - https://docs.openclaw.ai/control-ui
  - https://docs.openclaw.ai/dashboard

## What N1Hub Should Copy

N1Hub now adopts the following OpenClaw-style structures:

- root `SOUL.md`
  - persona, boundaries, and operator contract for N1Hub intelligence surfaces
- root `MEMORY.md`
  - durable cross-session working memory for operator preferences, active priorities, and stable repo truths
- root `TOOLS.md`
  - stable notes about local runtime surfaces, APIs, and conventions
- workspace-local `skills/`
  - focused `SKILL.md` documents for DeepMine generation, capsule snapshots, validation, and
    Linear bridge behavior
- `/ai` control surface
  - provider status, DeepMine console, and Symphony or N-Infinity lane telemetry in one operator view

These fit N1Hub well because:

- `AGENTS.md` and `CODEX.md` now exist as explicit execution surfaces
- the repo already has AI Wallet, Symphony, and N-Infinity
- the capsule graph already gives N1Hub a better long-memory layer than ad hoc chat logs

## What N1Hub Should Not Copy Blindly

Some OpenClaw ideas are useful but should not replace N1Hub architecture:

- Do not replace the capsule graph with markdown-only memory files.
- Do not collapse Symphony orchestration into a chat-first gateway daemon.
- Do not treat external subscription bridges as identical to official provider APIs.
- Do not let a general control UI bypass capsule validation, workflow policy, or repo truth.

## N1Hub-Specific Mapping

OpenClaw concept -> N1Hub analogue

- `SOUL.md` -> `SOUL.md` for Assistant, DeepMine, and future chat surfaces
- `MEMORY.md` -> `MEMORY.md` for compact durable continuity that is smaller and more curated than capsules
- `TOOLS.md` -> `TOOLS.md` describing N1Hub APIs, validator, Symphony, and AI Wallet
- `skills/` -> workspace-local skills for DeepMine, capsule graph, validator, and Linear bridge
- Control UI -> existing Workspace + AI Wallet + Symphony/N-Infinity status surfaces, with a future
  unified AI control plane
- OpenClaw gateway control plane -> N1Hub `/ai` plus server-side `/api/ai/control-state`
- gateway auth -> current `N1HUB_AUTH_TOKEN` model, likely to evolve into a stronger multi-user
  control plane later

## Why This Matters

OpenClaw's biggest insight is not "add more agents." It is that agents need a durable local
operating surface:

- identity
- memory
- boundaries
- skills
- operator-visible control

That is the part worth forking into N1Hub.

N1Hub already has a stronger graph and orchestration model than OpenClaw in some areas. What it
needed was a cleaner local assistant surface around them. This document, `SOUL.md`, `MEMORY.md`,
`TOOLS.md`, and `skills/` are the first step in that direction.

## Clean-Room Rule

N1Hub should copy public patterns, not proprietary prompt leaks or confidential dumps.

The safe replication method is:

1. study official public docs
2. extract the structural ideas
3. adapt them to N1Hub architecture and governance
4. verify the result inside the repo
