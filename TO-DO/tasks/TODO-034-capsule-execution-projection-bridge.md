# TODO-034 Capsule Execution Projection Bridge

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `READY`
- Owner Lane: `Control Plane Runtime Agent`
- Cluster: `Planning / assistant / runtime bridge`

## Goal

Project accepted markdown queue packets into durable vault-native task and delegation objects without inventing a second planning ontology.

## Why Now

`TODO-012` now defines the smallest viable control loop, but the bridge is still conceptual. N1Hub needs one bounded runtime step that ties accepted queue packets to `task` and `agent-delegation` objects so planning and execution can start converging on the vault.

## Scope

- `lib/a2c/*`
- `lib/agents/n1/*`
- `data/private/a2c/tasks/packet_candidates/*`
- `data/private/agents/n1/*`
- `TO-DO/TASK_TEMPLATE.md`
- `TO-DO/CAPSULE_NATIVE_EXECUTION.md`

## Non-Goals

- no replacement of the markdown hot queue in one pass
- no new planning ontology outside existing roadmap, goal, milestone, task, and delegation foundations
- no workspace UI redesign in this packet

## Deliverables

- one explicit projection contract from accepted queue packet fields into task and delegation objects
- one owned runtime namespace for staged execution projections
- one clear rule for which fields remain markdown-only during the bridge phase

## Dependencies

- hard: `TODO-012`

## Entry Checklist

- use the control loop defined in `TODO-012`
- keep markdown as the visible hot buffer during the bridge phase
- prefer stable identifiers and linkable objects over hidden prompt-only state

## Implementation Plan

1. Map queue packet fields to task and delegation attributes.
2. Define the owned projection namespace and artifact naming.
3. Add the narrowest runtime code needed to materialize and read the bridge objects.

## Acceptance Criteria

- accepted queue items can be represented as stable task and delegation objects
- the bridge does not invent a new task model
- markdown remains a temporary buffer, not an accidental permanent dual source of truth

## Verification

- `npm run typecheck`
- `npm run validate -- --dir data/capsules --strict --report`
- targeted runtime checks chosen by the implementation

## Risks

- dual-write drift between markdown and capsule projections
- hiding the real source of truth behind runtime artifacts instead of stable links

## Stop Conditions

- the implementation starts replacing the full queue instead of building the bridge
- the projection contract needs a new ontology decision

## Handoff Note

Implement the projection bridge first. If the bridge is weak, every later workspace or validator surface will inherit ambiguity.
