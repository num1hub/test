<!-- @anchor doc:todo.hot-queue links=doc:todo.index,doc:todo.decomposition-law,doc:todo.lane-ownership,doc:todo.dependency-map,doc:todo.execution-protocol,doc:todo.roadmap-q2-2026,doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.codex note="Live hot execution queue for AI agents inside N1Hub." -->
# N1Hub Hot Queue

Updated: 2026-03-09

Pull order rule: when the user does not give a narrower priority, agents should start from the first unfinished `P0` item in this file.

## Active Pull Order

| ID | Priority | Execution Band | Owner Lane | Status | Goal | Surface |
| --- | --- | --- | --- | --- | --- | --- |
| `TODO-007` | `P0` | `NOW` | `Branch Audit Agent` | `DONE` | Freeze the Real/Dream field into a deterministic global audit with hotspot ranking. | `data/capsules/*`, `docs/real-dream-diff.md`, `lib/diff/*`, `scripts/curate-vault-real-dream.ts` |
| `TODO-008` | `P0` | `NOW` | `Branch Steward Agent` | `DONE` | Triage the highest-drift constitutional hubs into explicit promote, retain, or rewrite decisions. | `data/capsules/*`, `docs/real-dream-diff.md`, `lib/diff/*`, `lib/agents/vaultSteward/*` |
| `TODO-009` | `P0` | `NOW` | `Vault Steward Agent` | `DONE` | Resolve the three dream-only Vault Steward operational capsules with explicit lifecycle law. | `data/capsules/capsule.operations.vault-steward.*`, `lib/agents/vaultSteward.ts`, `lib/agents/vaultSteward/*` |
| `TODO-010` | `P0` | `NOW` | `Governance Sync Agent` | `DONE` | Reconcile the nine real-only engineering law capsules with Dream branch policy. | `data/capsules/*`, `scripts/curate-vault-real-dream.ts`, `docs/real-dream-diff.md` |
| `TODO-020` | `P1` | `NEXT` | `Governance Sync Agent` | `DONE` | Rewrite the Dream background-agent-runtime hub around current governed runtime truth. | `data/capsules/capsule.foundation.background-agent-runtime.v1*.json`, `docs/a2c.md`, `docs/agents-operations.md`, `lib/a2c/*` |
| `TODO-021` | `P1` | `NEXT` | `Vault Steward Agent` | `DONE` | Rewrite the Dream vault-stewardship-swarm hub without collapsing it into live operational residue. | `data/capsules/capsule.foundation.vault-stewardship-swarm.v1*.json`, `data/capsules/capsule.operations.vault-steward.*`, `lib/agents/vaultSteward/*` |
| `TODO-022` | `P1` | `NEXT` | `Branch Steward Agent` | `READY` | Selectively promote Dream-side workspace boundary doctrine into Real while preserving runtime inventory. | `data/capsules/capsule.foundation.workspace.v1*.json`, `README.md`, `AGENTS.md`, `docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md` |
| `TODO-001` | `P1` | `NEXT` | `A2C Runtime Agent` | `READY` | Make A2C query semantics safe and read-only by default. | `lib/a2c/query.ts`, `scripts/a2c/query.ts`, `scripts/a2c/investigate.ts`, `lib/a2c/oracle.ts` |
| `TODO-002` | `P1` | `NEXT` | `Cluster Refactor Agent` | `READY` | Decompose the Vault Steward runtime along real public seams. | `lib/agents/vaultSteward.ts`, `lib/agents/vaultSteward/*`, `scripts/vault-steward.ts` |
| `TODO-003` | `P1` | `NEXT` | `A2C Test Agent` | `READY` | Turn the remaining A2C `TO-DO` contracts into real tests and close runtime drift. | `__tests__/a2c/*`, `lib/a2c/*`, `docs/a2c.md` |
| `TODO-011` | `P1` | `NEXT` | `Diff Test Agent` | `READY` | Expand Real/Dream promotion and merge test coverage around agent-facing routes. | `app/api/diff/*`, `app/api/capsules/[id]/promote/route.ts`, `__tests__/api/*`, `__tests__/lib/diff/*` |
| `TODO-012` | `P1` | `NEXT` | `Capsule Planning Agent` | `READY` | Turn the markdown hot queue into a capsule-native execution control plane backed by the vault. | `data/capsules/*`, `docs/projects.md`, `docs/real-dream-diff.md`, `lib/a2c/*`, `lib/agents/*` |
| `TODO-013` | `P1` | `NEXT` | `Review Systems Agent` | `READY` | Introduce a cross-model adversarial review lane with opposite-model proof and synthesized verdicts. | `skills/adversarial-review/*`, `scripts/n1-automated-update.ts`, `lib/agents/n1/*`, `docs/agents-operations.md` |
| `TODO-014` | `P1` | `NEXT` | `Autonomy Systems Agent` | `READY` | Turn one-shot N1 automated update into a scheduler-friendly recurring iteration lane. | `scripts/n1-automated-update.ts`, `lib/agents/n1/*`, `docs/agents-operations.md`, `NINFINITY_WORKFLOW.md` |
| `TODO-016` | `P1` | `NEXT` | `A2C Intake Agent` | `READY` | Turn raw operator input into a structured A2C intake contract with TO-DO-ready fields instead of chat residue. | `lib/a2c/*`, `app/api/a2c/ingest/route.ts`, `docs/a2c.md`, `TO-DO/*`, `data/private/a2c/*` |
| `TODO-017` | `P1` | `NEXT` | `Task Packet Agent` | `READY` | Build the A2C packet builder that converts actionable user input into N1Hub hot task packets. | `lib/a2c/*`, `TO-DO/tasks/*`, `TO-DO/HOT_QUEUE.md`, `TO-DO/CAPSULE_NATIVE_EXECUTION.md` |
| `TODO-018` | `P1` | `NEXT` | `N1 Routing Agent` | `READY` | Teach N1 to classify user input into assistant, TO-DO, capsule, or defer lanes before work starts. | `CONTEXT.md`, `MEMORY.md`, `TO-DO/AGENT_OPERATING_MODES.md`, `skills/n1/*`, `skills/personal-ai-assistant/*` |
| `TODO-019` | `P1` | `NEXT` | `A2C Intake Test Agent` | `READY` | Add a test net that proves user input becomes stable TO-DO packets, rejects noise, and preserves repo boundaries. | `__tests__/a2c/*`, `lib/a2c/*`, `TO-DO/*`, `docs/a2c.md` |
| `TODO-004` | `P2` | `LATER` | `Validator Boundary Agent` | `READY` | Harden validator/API contract parity and OpenAPI discipline. | `lib/validator/*`, `app/api/validate/*`, `scripts/validate-cli.ts`, `scripts/generate-validate-openapi.ts` |
| `TODO-005` | `P2` | `LATER` | `Symphony Contract Agent` | `READY` | Split Symphony orchestration law, prompt rendering, and runtime tracking into bounded contracts. | `lib/symphony/*`, `scripts/symphony.ts`, `WORKFLOW.md` |
| `TODO-006` | `P2` | `LATER` | `Architecture Steward Agent` | `READY` | Turn file guardrails into a changed-files CI gate with waiver discipline. | `scripts/check-file-guardrails.ts`, `.github/workflows/*`, `package.json`, `docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md` |
| `TODO-015` | `P2` | `LATER` | `Context Systems Agent` | `READY` | Formalize a hot-warm-cold memory topology for N1Hub context surfaces, skills, and capsules. | `CONTEXT.md`, `MEMORY.md`, `TO-DO/*`, `skills/*`, `data/capsules/*` |

## Immediate Focus

Current recommended execution sequence:

1. `TODO-022`
2. `TODO-001`
3. `TODO-016`
4. `TODO-017`
5. `TODO-018`
6. `TODO-019`

Reason:

- `TODO-007` is now closed and the measured field census lives in `TO-DO/REAL_DREAM_FRONT.md` and `docs/real-dream-diff.md`.
- `TODO-008` is now closed with an explicit top-ten triage matrix and split follow-up packets.
- `TODO-009` is now closed: the three dream-only Vault Steward capsules are intentional Dream-only operational mirrors, not accidental residue.
- `TODO-010` is now closed: the nine real-only engineering law capsules remain explicit `real-first canonical` doctrine rather than needing speculative Dream mirrors.
- `TODO-020` is now closed: the Dream background-agent-runtime hub was rewritten around real-first mutation gates and future-only runtime delta.
- `TODO-021` is now closed: the Dream stewardship hub was rewritten around live lane/runtime truth and explicitly separated from Dream-only operational mirrors.
- `TODO-022` is now the remaining Front A doctrine pass: selectively move workspace boundary doctrine from Dream into Real.
- `TODO-001` remains hot, but only after the branch field is mapped, triaged, and packetized.
- `TODO-016` starts the direct path from operator input into A2C instead of leaving intent trapped in chat.
- `TODO-017` turns the intake contract into real hot task packets the queue can execute.
- `TODO-018` keeps N1 from routing every user message into the wrong lane.
- `TODO-019` prevents the new intake path from becoming untested prompt magic.

## Execution Fronts

Treat the queue as three fronts, not as one flat backlog:

- `Front A · Real/Dream constitutional wave`
  `TODO-007`, `TODO-008`, `TODO-009`, `TODO-010`, `TODO-020`, `TODO-021`, `TODO-022`
- `Front B · A2C intake and packetization wave`
  `TODO-016`, `TODO-017`, `TODO-018`, `TODO-019`
- `Front C · Runtime hardening and review systems`
  `TODO-001`, `TODO-002`, `TODO-003`, `TODO-011`, `TODO-012`, `TODO-013`, `TODO-014`

This means:

- do not pull `Front B` as if `Front A` does not exist
- do not let `Front C` sprawl across the queue while the branch triage wave is still unresolved
- when one front changes materially, update the queue order explicitly

## Dependency Notes

- `TODO-007` is complete and now serves as the audit output dependency for `TODO-008`, `TODO-009`, `TODO-010`, `TODO-020`, `TODO-021`, and `TODO-022`
- `TODO-020`, `TODO-021`, and `TODO-022` consume the triage output from `TODO-008`
- `TODO-021` should consult `TODO-009` before mutating Dream stewardship doctrine
- `TODO-016` should land before `TODO-017`
- `TODO-017` and `TODO-018` should inform `TODO-019`
- `TODO-012` should use the A2C intake and packetization work rather than outrunning it conceptually

If any of those dependencies stop being true, change the packets and the queue instead of carrying stale coupling in your head.

## Queue Discipline

- Do not skip a `P0` item for a `P1` item without explicit user instruction.
- Do not treat a soft dependency like a finished artifact; read the real output first.
- Do not mark a task `DONE` until its verification commands have passed.
- If the execution band or pull order becomes wrong, update the task file instead of pretending the plan still holds.
- If a task is blocked by repo truth, write the blocker into the task file immediately.

## Status Model

- `READY`
  The packet is actionable right now.
- `ACTIVE`
  A bounded implementation slice is already in motion and the packet should carry the freshest handoff.
- `BLOCKED`
  A real stop condition fired and the queue should not keep pretending the task is hot and clear.
- `DONE`
  Deliverables exist, verification passed, and the queue can move on.

## Per-Pass Update Law

After every serious execution pass, the agent should update:

- the task packet status if it changed
- `Handoff Note` when the next continuation point became clearer
- `Implementation Plan` when repo truth changed the path
- queue ordering if the active frontier changed
- teamwork artifacts when the current host lane supports them

Do not leave the queue looking `READY` when the real state is partial work, blocked work, or completed work.

## Detailed Tasks

- [TODO-001 A2C Query Safety](/home/n1/n1hub.com/TO-DO/tasks/TODO-001-a2c-query-safety.md)
- [TODO-002 Vault Steward Runtime Cluster](/home/n1/n1hub.com/TO-DO/tasks/TODO-002-vault-steward-runtime-cluster.md)
- [TODO-003 A2C Wave 2 Tests](/home/n1/n1hub.com/TO-DO/tasks/TODO-003-a2c-wave-2-tests.md)
- [TODO-007 Real Dream Global Audit](/home/n1/n1hub.com/TO-DO/tasks/TODO-007-real-dream-global-audit.md)
- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [TODO-009 Vault Steward Dream-Only Operations Review](/home/n1/n1hub.com/TO-DO/tasks/TODO-009-vault-steward-dream-only-operations-review.md)
- [TODO-010 Real-Only Law Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-010-real-only-law-sync.md)
- [TODO-012 Capsule-Native Execution Control Plane](/home/n1/n1hub.com/TO-DO/tasks/TODO-012-capsule-native-execution-control-plane.md)
- [TODO-013 Cross-Model Adversarial Review Lane](/home/n1/n1hub.com/TO-DO/tasks/TODO-013-cross-model-adversarial-review.md)
- [TODO-014 N1 Scheduled Iteration Loop](/home/n1/n1hub.com/TO-DO/tasks/TODO-014-n1-scheduled-iteration-loop.md)
- [TODO-016 A2C User Input Intake Contract](/home/n1/n1hub.com/TO-DO/tasks/TODO-016-a2c-user-input-intake-contract.md)
- [TODO-017 A2C TO-DO Packet Builder](/home/n1/n1hub.com/TO-DO/tasks/TODO-017-a2c-todo-packet-builder.md)
- [TODO-018 N1 User Input Routing Lane](/home/n1/n1hub.com/TO-DO/tasks/TODO-018-n1-user-input-routing-lane.md)
- [TODO-019 A2C User Input Test Net](/home/n1/n1hub.com/TO-DO/tasks/TODO-019-a2c-user-input-test-net.md)
- [TODO-020 Background Agent Runtime Dream Rewrite](/home/n1/n1hub.com/TO-DO/tasks/TODO-020-background-agent-runtime-dream-rewrite.md)
- [TODO-021 Vault Stewardship Swarm Dream Rewrite](/home/n1/n1hub.com/TO-DO/tasks/TODO-021-vault-stewardship-swarm-dream-rewrite.md)
- [TODO-022 Workspace Selective Promotion](/home/n1/n1hub.com/TO-DO/tasks/TODO-022-workspace-selective-promotion.md)
- [TODO-011 Real Dream Promotion Test Net](/home/n1/n1hub.com/TO-DO/tasks/TODO-011-real-dream-promotion-test-net.md)
- [TODO-004 Validator/API Boundary](/home/n1/n1hub.com/TO-DO/tasks/TODO-004-validator-api-boundary-package.md)
- [TODO-005 Symphony Contract Split](/home/n1/n1hub.com/TO-DO/tasks/TODO-005-symphony-contract-split.md)
- [TODO-006 File Guardrails Gate](/home/n1/n1hub.com/TO-DO/tasks/TODO-006-file-guardrails-changed-files-gate.md)
- [TODO-015 Context Engineering Memory Topology](/home/n1/n1hub.com/TO-DO/tasks/TODO-015-context-engineering-memory-topology.md)
