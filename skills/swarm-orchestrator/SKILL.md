---
name: swarm-orchestrator
description: Decompose one bounded initiative into specialized agent lanes with explicit ownership, verification, and return contracts.
---

# Swarm Orchestrator

Use this skill when one bounded initiative genuinely needs multiple specialized lanes working in parallel.

## Read Order

1. `README.md`
2. `AGENTS.md`
3. `CODEX.md`
4. `CONTEXT.md`
5. `MEMORY.md`
6. `TO-DO/AGENT_OPERATING_MODES.md`
7. `TO-DO/HOT_QUEUE.md`
8. the parent task file

## Default Loop

1. Confirm the parent initiative is bounded enough for decomposition.
2. Split the work by domain boundary or non-overlapping write set.
3. Produce lane packets with objective, scope, verification, and stop conditions.
4. Coordinate the lanes.
5. Integrate the results and verify the combined outcome.

## Rules

- Do not create swarm lanes for spectacle.
- Keep each lane concrete and disjoint.
- Use swarm mode only after assistant or executor mode proves one worker is not enough.
- Preserve one combined close-out with verification evidence and residual risk.
