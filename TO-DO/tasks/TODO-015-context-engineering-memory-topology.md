# TODO-015 Context Engineering Memory Topology

- Priority: `P2`
- Execution Band: `LATER`
- Status: `READY`
- Owner Lane: `Context Systems Agent`
- Cluster: `Agent memory and context`

## Goal

Formalize a durable hot/warm/cold context topology for N1Hub so N1, TO-DO, skills, and future capsule-native planning can load the right amount of context without dragging the whole repository into every turn.

## Why Now

N1Hub already has `README.md`, `AGENTS.md`, `CODEX.md`, `SOUL.md`, `CONTEXT.md`, `MEMORY.md`, `TO-DO/`, capsules, and skills. The surfaces are getting stronger, but the loading strategy is still more implicit than it should be. As the system scales, context routing will matter as much as the content itself.

## Scope

- `CONTEXT.md`
- `MEMORY.md`
- `TO-DO/README.md`
- `TO-DO/AGENT_OPERATING_MODES.md`
- `skills/*`
- `data/capsules/*`
- future compressed repo-map or retrieval surfaces if justified

## Non-Goals

- no giant rewrite of all root docs
- no fake RAG subsystem bolted on without clear need
- no mass import of external agent playbooks without clean-room adaptation

## Deliverables

- one explicit memory topology for hot, warm, and cold context
- read-order rules for when each layer is loaded
- bounded retrieval or compression strategy for large repo context
- integration notes for capsule-native planning and future swarm lanes

## Context Snapshot

- N1Hub already behaves like a multi-layer context system, but its memory topology is still partly informal
- current surfaces include durable markdown memory, skills, capsules, and a hot execution buffer
- context quality is becoming a scaling constraint, not just a documentation quality concern

## Source Signals

- one giant `AGENTS.md` does not scale indefinitely
- hot, warm, and cold context should be routed rather than stuffed into one prompt
- compression, retrieval, and repo-map patterns matter only when they reduce confusion more than they add architectural drift

## Dependencies

- soft: use the stronger TO-DO and N1 execution surfaces as current hot-layer reality
- soft: let TODO-012 inform where capsule-native planning belongs in the topology

## Entry Checklist

- inspect the current roles of `CONTEXT.md`, `MEMORY.md`, `TO-DO/`, and skills
- inspect where the current stack duplicates information instead of routing it cleanly
- confirm which context problems are real in N1Hub versus merely fashionable in the wider ecosystem

## Implementation Plan

1. Map the current context surfaces by function and load timing.
2. Define hot, warm, and cold layers for N1Hub.
3. Identify the thinnest useful compression or retrieval additions.
4. Encode the result into repo-native docs and skills without widening drift.

## Mode and Skill

- Primary mode: `Personal AI Assistant`
- Optional skill: `skills/n1/SKILL.md`

## System Prompt Slice

```text
You are the Context Systems Agent. Turn the current N1Hub instruction stack, memory surfaces, skills, and capsule layer into an explicit hot/warm/cold context topology that scales better without becoming doctrinal bloat.
```

## Operator Command Pack

- `Take TODO-015 and formalize the N1Hub context and memory topology.`
- `Work as Context Systems Agent and design a scalable hot-warm-cold context model for N1Hub.`

## Acceptance Criteria

- N1Hub has an explicit hot, warm, and cold context model
- the loading rules do not duplicate existing root-doc responsibilities
- capsule-native planning and future swarm lanes have a clear place in the topology
- the result is grounded in current repo surfaces rather than external hype

## Verification

- `npm run check:anchors:full`
- targeted doc coherence review across `README.md`, `CONTEXT.md`, `MEMORY.md`, `TO-DO/`, and skills

## Evidence and Artifacts

- update the relevant memory, context, or skill surfaces
- leave one compact topology artifact or matrix that future agents can actually follow

## Evidence and Artifacts

- update the relevant memory, context, or skill surfaces
- leave one compact topology artifact or matrix that future agents can actually follow

## Risks

- context architecture can easily turn into verbose theory with no routing value
- compression layers can become another hidden memory surface if not disciplined

## Stop Conditions

- the work starts duplicating the whole repo into a new pseudo-memory file
- the proposed topology does not clearly reduce confusion or token pressure

## Queue Update Rule

- keep the task `ACTIVE` if the topology is mapped but not yet encoded into the repo surfaces
- mark it `BLOCKED` if real routing depends on infrastructure not yet present
- mark it `DONE` only when the hot, warm, and cold model is explicit and usable

## Handoff Note

This is not a license to add more files just because other systems do. Solve routing first. Add new context surfaces only when they reduce confusion more than they increase it.
