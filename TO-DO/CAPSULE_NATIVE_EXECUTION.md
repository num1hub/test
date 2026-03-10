<!-- @anchor doc:todo.capsule-native-execution links=doc:todo.index,doc:todo.hot-queue,doc:todo.agent-operating-modes,doc:n1hub.context,doc:projects.reference,doc:branching.real-dream-diff,doc:n1hub.readme note="Design brief for moving planning and delegation from markdown into capsule-native execution surfaces." -->
# Capsule-Native Execution Control Plane

Updated: 2026-03-09

`TO-DO/` works as a hot markdown buffer right now, but the long-term source of truth for planning and execution should live in the capsule vault. N1Hub already has the primitives for that model.

## Existing Capsule Foundations

The vault already contains the main planning and orchestration objects:

- `capsule.foundation.roadmap.v1`
- `capsule.foundation.goal.v1`
- `capsule.foundation.milestone.v1`
- `capsule.foundation.task.v1`
- `capsule.foundation.planner.v1`
- `capsule.foundation.planning-horizon-engine.v1`
- `capsule.foundation.chat-to-capsules.v1`
- `capsule.foundation.personal-ai-assistant.v1`
- `capsule.foundation.agent-delegation.v1`

## Desired Model

Use markdown `TO-DO/` as the immediate operator-visible intake buffer, but move durable planning and execution state into capsule storage:

- roadmap capsules for long-horizon structure
- goal capsules for strategic outcomes
- milestone capsules for phase gates
- task capsules for atomic work
- suggestion and delegation capsules for agent handoff packets
- branch posture on planning capsules so Dream intent is not confused with Real execution

## Native Interface Path

The natural front door for this system is:

1. `chat-to-capsules`
2. `personal-ai-assistant`
3. `planner`
4. `planning-horizon-engine`
5. bounded agent lanes that execute task capsules

That would let the user talk to the assistant in natural language while the system:

- grounds the request in existing capsules
- creates or updates roadmap, goal, milestone, and task capsules
- assigns work to bounded agent lanes
- writes execution results back into the vault
- keeps Dream planning separate from Real delivery

## Why This Fits N1Hub

- N1Hub already treats projects as graph projections rather than separate storage.
- The capsule corpus already includes branch-aware planning objects.
- Real/Dream already provides a native distinction between speculative planning and committed delivery.
- A2C, Symphony, and Vault Steward already operate on vault-native state instead of ad hoc spreadsheets.

## Constraint

Do not replace everything with markdown automation. Markdown can remain the operator buffer, but the durable task system should converge toward vault-native capsules and graph-native orchestration.

## Transitional Queue Bridge

Until task capsules become the durable control plane, A2C packetization should stage candidate markdown packets under `data/private/a2c/tasks/packet_candidates` first.

- normalized intake stays in A2C-owned namespaces
- packet candidates mirror the current `TO-DO/TASK_TEMPLATE.md` shape
- promotion into `TO-DO/tasks/` and `TO-DO/HOT_QUEUE.md` remains an explicit queue-law step
- later capsule-native execution can consume the same normalized intake and packet-candidate semantics without treating markdown staging as the final source of truth

## Task Link

- [TODO-012 Capsule-Native Execution Control Plane](/home/n1/n1hub.com/TO-DO/tasks/TODO-012-capsule-native-execution-control-plane.md)
