<!-- @anchor doc:todo.capsule-native-execution links=doc:todo.index,doc:todo.hot-queue,doc:todo.agent-operating-modes,doc:n1hub.context,doc:projects.reference,doc:branching.real-dream-diff,doc:n1hub.readme note="Design brief for moving planning and delegation from markdown into capsule-native execution surfaces." -->
# Capsule-Native Execution Control Plane

Updated: 2026-03-10

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

## Planning Object Roles

The control plane should use the existing planning foundations as distinct roles instead of inventing a second ontology:

- `roadmap`
  long-horizon sequencing object with phase posture, review anchors, and horizon compression inputs
- `goal`
  strategic outcome object that states what must become true
- `milestone`
  review gate or checkpoint where the system asks whether a phase was really crossed
- `task`
  smallest executable promise with definition of done, evidence, assignee, and branch target
- `agent-delegation`
  explicit handoff envelope that binds one task to one bounded lane, approval boundary, return path, and result summary
- `planner`
  planning hub that sequences and groups roadmap, goal, milestone, and task objects
- `planning-horizon-engine`
  temporal compression surface that turns long-horizon planning into near-horizon execution candidates
- `chat-to-capsules`
  conversational ingress that grounds requests in the graph and emits structured candidate changes instead of raw chat residue
- `personal-ai-assistant`
  operator-facing routing layer that explains, proposes, confirms, and hands bounded work into the control plane

## Durable State vs Temporary Buffer

The smallest viable control plane must keep these storage layers separate:

- `durable vault state`
  roadmap, goal, milestone, task, and delegation capsules that should survive across sessions and carry reviewable planning or execution truth
- `temporary operator buffer`
  markdown `TO-DO/`, hand-written task notes, and queue ordering while the capsule-native control plane is still being phased in
- `staged intake buffer`
  A2C normalized intake and packet candidates under `data/private/a2c/*`
- `runtime projection artifacts`
  teamwork, repo-sync, orchestration, and other machine-readable execution snapshots under `data/private/agents/n1/*` and `reports/n1/*`

The important rule is that runtime projection artifacts are not the long-term plan, and markdown queue rows are not the intended permanent source of execution truth.

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

## Smallest Viable Control Loop

The minimal vault-native loop should be:

1. Operator intent enters through `chat-to-capsules`.
2. `personal-ai-assistant` grounds the request in existing graph state and decides whether the outcome is roadmap, goal, milestone, task, or defer-for-clarity.
3. `planner` and `planning-horizon-engine` compress the request into one or more bounded execution candidates instead of one broad ambition blob.
4. A2C writes normalized intake and packet candidates into `data/private/a2c/tasks/packet_candidates`.
5. Human review promotes the candidate into the markdown hot queue while the queue remains the active operator-facing buffer.
6. The accepted queue packet projects into durable Real-side task and delegation capsules with explicit links back to parent roadmap, goal, or milestone objects.
7. A bounded execution lane accepts the delegation, performs work, and returns evidence, result summary, and state transition.
8. The vault stores the updated execution truth; markdown queue state and runtime artifacts become projections of that stronger vault state rather than the hidden source of record.

## Branch Posture

Planning and execution should be branch-aware by default:

- `Dream`
  holds exploratory roadmaps, alternative decompositions, speculative goals, future milestones, and unapproved task shapes
- `Real`
  holds accepted commitments, active task capsules, approved delegations, execution evidence, and completion truth
- `promotion boundary`
  any move from Dream planning into Real execution must be explicit, reviewable, and operator-governed

The branch rule should stay simple: Dream is where the system imagines and reshapes; Real is where the system commits, delegates, and records proof.

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

## Phased Migration

Use three bounded phases instead of one big rewrite:

1. `Bridge phase`
   - keep markdown `TO-DO/` as the visible hot queue
   - make the control loop and projection rules explicit
   - stage normalized packet candidates in A2C-owned storage
2. `Projection phase`
   - create stable task and delegation projections for accepted queue items
   - let runtime artifacts and assistant surfaces read those projections
   - keep markdown as the operator-facing review buffer
3. `Native phase`
   - let workspace surfaces read roadmap, goal, milestone, task, and delegation capsules directly
   - reduce markdown to import, export, review, or fallback presentation instead of permanent storage

## Follow-Up Slices

The next bounded passes after this design brief are:

- `TODO-034`
  implement the projection bridge from accepted queue packets into durable task and delegation capsules
- `TODO-035`
  build the authenticated workspace home as the first operator-facing control-plane surface over the new execution objects
- `TODO-036`
  add explicit branch and validation guardrails so Dream planning cannot silently masquerade as Real execution

## Task Link

- [TODO-012 Capsule-Native Execution Control Plane](/home/n1/n1hub.com/TO-DO/tasks/TODO-012-capsule-native-execution-control-plane.md)
