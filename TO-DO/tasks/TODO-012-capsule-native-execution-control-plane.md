# TODO-012 Capsule-Native Execution Control Plane

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `ACTIVE`
- Owner Lane: `Capsule Planning Agent`
- Cluster: `Planning / assistant / swarm control plane`

## Goal

Turn the markdown hot queue into a capsule-native execution control plane so planning, delegation, and completion can live in the vault instead of staying in markdown forever.

## Why Now

N1Hub already has the right capsule primitives: `roadmap`, `goal`, `milestone`, `task`, `planner`, `planning-horizon-engine`, `chat-to-capsules`, `personal-ai-assistant`, and `agent-delegation`. The missing piece is not vocabulary. The missing piece is the repo-native control plane that ties those capsules to bounded agent execution.

## Scope

- `data/capsules/capsule.foundation.roadmap.v1*.json`
- `data/capsules/capsule.foundation.goal.v1*.json`
- `data/capsules/capsule.foundation.milestone.v1*.json`
- `data/capsules/capsule.foundation.task.v1*.json`
- `data/capsules/capsule.foundation.planner.v1*.json`
- `data/capsules/capsule.foundation.planning-horizon-engine.v1*.json`
- `data/capsules/capsule.foundation.chat-to-capsules.v1*.json`
- `data/capsules/capsule.foundation.personal-ai-assistant.v1*.json`
- `data/capsules/capsule.foundation.agent-delegation.v1*.json`
- `docs/projects.md`
- `docs/real-dream-diff.md`
- `TO-DO/README.md`
- `TO-DO/CAPSULE_NATIVE_EXECUTION.md`

## Non-Goals

- no immediate rewrite of all current markdown tasks into capsules
- no fake autonomy layer that bypasses review and verification
- no second planning system detached from the capsule vault

## Deliverables

- one explicit design for vault-native roadmap, goal, milestone, and task execution
- mapping from markdown `TO-DO` items to capsule-native planning objects
- definition of how `chat-to-capsules` and `personal-ai-assistant` create, refine, and delegate task capsules
- branch posture rules for when planning belongs in Dream and when execution is Real
- follow-up implementation slices for UI, runtime, and validation work

## Context Snapshot

- the vault already has `roadmap`, `goal`, `milestone`, `task`, `planner`, `planning-horizon-engine`, `chat-to-capsules`, `personal-ai-assistant`, and `agent-delegation`
- `TO-DO/` is useful now, but it should become a hot buffer in front of a capsule-native control plane instead of a permanent markdown island

## Dependencies

- soft: use the intake and packetization posture from TODO-016, TODO-017, and TODO-018 instead of designing around raw chat forever
- output: this task should emit bounded follow-up slices rather than one giant migration ambition

## Source Signals

- TO-DO/CAPSULE_NATIVE_EXECUTION.md
- capsule.foundation.chat-to-capsules.v1
- capsule.foundation.personal-ai-assistant.v1

## Entry Checklist

- inspect the existing capsule foundations before inventing any new planning ontology
- confirm which parts of the current markdown queue are truly temporary versus durable
- keep branch posture explicit so Dream planning is not confused with Real execution

## Implementation Plan

1. Map current markdown planning objects to existing capsule foundations.
2. Define the assistant-to-task-to-agent control loop.
3. Define Dream versus Real branch posture for planning and execution objects.
4. Split the result into bounded follow-up implementation slices.

## Progress Update

- current control-plane model now treats `TO-DO/` as a temporary operator buffer in front of a stronger vault-native planning graph
- the chosen execution loop is `chat-to-capsules -> personal-ai-assistant -> planner -> planning-horizon-engine -> A2C packet candidate -> markdown queue review -> Real task capsule -> agent delegation -> execution evidence`
- the chosen branch posture is `Dream for exploratory planning`, `Real for accepted execution and proof`
- the next work should not be a broad migration; it should be three bounded slices: projection bridge, workspace surface, and branch or validation guardrails

## Chosen Control Loop

1. `chat-to-capsules` receives natural-language intent.
2. `personal-ai-assistant` grounds and classifies the request.
3. `planner` plus `planning-horizon-engine` compress intent into bounded planning candidates.
4. A2C writes normalized packet candidates under `data/private/a2c/tasks/packet_candidates`.
5. Human review promotes the candidate into the markdown queue while markdown remains the hot visible buffer.
6. Accepted queue items project into durable Real-side task and delegation capsules.
7. Execution lanes work from the projected task and delegation objects and return evidence into the vault.
8. Teamwork, repo-sync, orchestration, and markdown queue state act as projections of the stronger vault truth rather than private shadow systems.

## Durable vs Temporary State

- `durable`
  roadmap, goal, milestone, task, and delegation capsules
- `temporary`
  markdown queue rows, human draft notes, staged packet candidates, and runtime launch artifacts

This distinction is the key constraint that keeps the control plane from creating a second permanent planning island.

## Follow-Up Implementation Slices

1. `TODO-034 Capsule Execution Projection Bridge`
   - map accepted markdown queue packets into durable task and delegation objects without inventing a parallel schema
2. `TODO-035 Workspace Home Control Plane Surface`
   - build the first authenticated workspace home that reads the new control-plane objects instead of treating `/` as only a static shell
3. `TODO-036 Planning vs Execution Branch Guardrails`
   - enforce Dream-planning vs Real-execution posture in branch, validation, and promotion behavior

## Mode and Skill

- Primary mode: `Personal AI Assistant`
- Optional skill: `skills/personal-ai-assistant/SKILL.md`

## System Prompt Slice

```text
You are the Capsule Planning Agent. Design the smallest viable capsule-native execution control plane that uses existing planning foundations, personal-assistant ingress, and bounded agent delegation instead of inventing a parallel task system.
```

## Operator Command Pack

- `Take TODO-012 and design the capsule-native execution control plane for N1Hub.`
- `Work as Personal AI Assistant on TODO-012, then split the result into bounded implementation slices.`

## Acceptance Criteria

- the design uses existing capsule foundations instead of inventing an unrelated task model
- the assistant and agent handoff story is explicit, not hidden in prompts
- the design distinguishes durable vault state from temporary operator buffer state
- the design yields bounded implementation slices instead of one giant platform rewrite

## Verification

- `npm run validate -- --dir data/capsules --strict --report`
- `npm run check:anchors:full`
- manual cross-check against `TO-DO/CAPSULE_NATIVE_EXECUTION.md`

## Evidence and Artifacts

- update the control-plane design brief if the model changes materially
- leave explicit implementation slices for runtime, UI, validation, or vault-schema follow-up
- update this packet with the chosen assistant-to-task-to-agent loop
- queue follow-up packets under `TODO-034`, `TODO-035`, and `TODO-036`

## Risks

- it is easy to over-design the planning graph before the execution lane is bounded
- task capsules without a clear assistant and swarm contract could become another passive layer of documentation

## Stop Conditions

- the design starts inventing an unrelated planning ontology instead of using existing capsule foundations

## Queue Update Rule

- keep this task `ACTIVE` if the control-plane model is clear but the follow-up slices still need refinement
- mark it `BLOCKED` if existing capsule foundations cannot support the design without a new core-model decision
- mark it `DONE` only when the control-plane design and its next implementation slices are explicit and bounded

## Handoff Note

The control-plane model is now explicit enough to stop improvising the architecture. The next pull should be `TODO-034`, which turns accepted queue packets into durable task and delegation projections without trying to replace the whole markdown queue in one leap.
