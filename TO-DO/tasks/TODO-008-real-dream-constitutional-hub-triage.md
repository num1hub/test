# TODO-008 Real Dream Constitutional Hub Triage

- Priority: `P0`
- Execution Band: `NOW`
- Status: `DONE`
- Owner Lane: `Branch Steward Agent`
- Cluster: `Real/Dream governance`

## Goal

Take the highest-drift Real/Dream hubs and force an explicit decision on each one: `promote`, `retain-dream`, or `rewrite`. This task is about branch judgment, not about passive observation.

## Why Now

`TODO-007` closed with a measured hub ranking. The current drift front is led by `background-agent-runtime`, `personal-ai-assistant`, `workspace`, `vault-stewardship-swarm`, and `key-agents`, followed by `n1hub`, `tracker`, `capsuleos`, `n-infinity`, and `project.n-infinity`. Leaving triage on the old intuition list would make the next branch pass stale before it starts.

## Scope

- `data/capsules/capsule.foundation.background-agent-runtime.v1*.json`
- `data/capsules/capsule.foundation.personal-ai-assistant.v1*.json`
- `data/capsules/capsule.foundation.workspace.v1*.json`
- `data/capsules/capsule.foundation.vault-stewardship-swarm.v1*.json`
- `data/capsules/capsule.foundation.key-agents.v1*.json`
- `data/capsules/capsule.foundation.n1hub.v1*.json`
- `data/capsules/capsule.foundation.tracker.v1*.json`
- `data/capsules/capsule.foundation.capsuleos.v1*.json`
- `data/capsules/capsule.foundation.n-infinity.v1*.json`
- `data/capsules/capsule.project.n-infinity.v1*.json`
- `docs/real-dream-diff.md`
- `lib/diff/*`

## Non-Goals

- no mass editing outside the named hub set
- no automatic Dream-to-Real merge just because a capsule is ambitious
- no new doctrine written without checking code and docs reality

## Deliverables

- one decision matrix for the named hub set
- evidence-backed status for each hub: `promote`, `retain-dream`, or `rewrite`
- follow-up tasks for every hub that cannot be promoted cleanly
- explicit reasoning that cites current repo surfaces, not only capsule prose

## Context Snapshot

- measured top drift set from `TODO-007`:
  `background-agent-runtime`, `personal-ai-assistant`, `workspace`, `vault-stewardship-swarm`, `key-agents`, `n1hub`, `tracker`, `capsuleos`, `n-infinity`, `project.n-infinity`
- the strongest pressure is in runtime governance, assistant orchestration, workspace doctrine, vault stewardship, and N-Infinity system law
- this packet no longer uses the pre-audit candidate list from earlier branch intuition

## Dependencies

- hard: consume the latest verified audit from TODO-007 before classifying hub decisions
- soft: use the current diff and branch runtime surfaces to avoid capsule-only reasoning

## Source Signals

- TO-DO/tasks/TODO-007-real-dream-global-audit.md
- TO-DO/REAL_DREAM_FRONT.md

## Entry Checklist

- read the output of `TODO-007` first; do not triage from stale branch intuition
- inspect the measured top ten hub set against current docs, runtime files, and tests before classifying a hub
- confirm that the work stays inside the ten named hub families and does not fan out across the entire vault

## Implementation Plan

1. Start from the measured top ten hub set emitted by `TODO-007`, not from the older candidate list.
2. Classify the first five hubs against live docs, code, and tests.
3. Classify the remaining five hubs in a second decision pass.
4. Split rewrite follow-up work only after the full top-ten matrix is stable.
5. Close the packet only after the follow-up queue truth exists.

## Decision Matrix · Pass 1

Classified in this pass:

- `capsule.foundation.background-agent-runtime.v1` -> `rewrite`
  real branch is `sovereign` at version `1.7.0`; dream is `draft` at `1.1.0`; live diff shows `12` changed paths, `16` removed links, `23` semantic events, and `28` action-plan tasks. Current repo surfaces now encode activation readiness, workspace recon, deep intake investigation, and bounded autonomous operation in `scripts/a2c/activate.ts`, `lib/a2c/recon.ts`, `docs/a2c.md`, and `docs/agents-operations.md`. Dream still preserves useful runtime ambition, but as written it is behind the current governed runtime and should be rewritten around present repo law rather than promoted as-is.
- `capsule.foundation.personal-ai-assistant.v1` -> `retain-dream`
  real branch is `sovereign` at version `1.13.0`; dream is `draft` at `1.4.0`; live diff shows `10` changed paths, `13` removed links, `20` semantic events, and `23` action-plan tasks. The current shipped truth is the stable N1 carrier and assistant identity in `skills/personal-ai-assistant/SKILL.md`, `skills/n1/SKILL.md`, `SOUL.md`, and `lib/agents/n1/orchestration.ts`. Dream still carries valid future-facing assistant behavior around richer orchestration, multimodal ingress, and broader graph-backed execution, so it remains a useful target state instead of a promotion candidate.
- `capsule.foundation.workspace.v1` -> `promote`
  both branches are `sovereign`, but dream carries a sharper boundary law: Workspace as a lens over Planner, Tracker, Dashboard, and Assistant instead of a hub that owns their semantics. That framing matches the live repo discipline in `AGENTS.md`, `README.md`, and `docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md`, all of which push module ownership and explicit boundaries. Promotion here should be selective, not a blind overwrite: move the dream-side boundary doctrine into Real while keeping the stronger real-side runtime inventory.
- `capsule.foundation.vault-stewardship-swarm.v1` -> `rewrite`
  real branch is `sovereign` at `1.4.0`; dream is `draft` at `1.1.0`; live diff shows `13` changed paths, `7` removed links, `15` semantic events, and `20` action-plan tasks. The real branch and code already encode the live swarm shape and operational posture in `lib/agents/vaultSteward.ts`, `lib/agents/vaultSteward/maintenance-artifacts.ts`, `docs/agents-operations.md`, and dream-only operational capsules under `capsule.operations.vault-steward.*`. Dream preserves the right branch-safe instinct, but it is now too thin and stale compared with the implemented swarm law, so it should be rewritten as a forward-looking stewardship doctrine instead of promoted.
- `capsule.foundation.key-agents.v1` -> `retain-dream`
  real branch is `sovereign` at `1.3.0`; dream is `draft` at `1.1.0`; live diff shows `12` changed paths, `5` removed links, `12` semantic events, and `17` action-plan tasks. The current runtime already has explicit owner lanes and assistant/swarm splits in `TO-DO/LANE_OWNERSHIP_MAP.md`, `TO-DO/HOT_QUEUE.md`, `skills/n1/SKILL.md`, and `lib/agents/n1/orchestration.ts`. Dream still adds roadmap value by preserving the role-map view and the `Planning Horizon Engine` bridge, so it is better treated as future architecture context than as something to promote today.

Matrix state:

- all ten measured hubs now have an explicit branch decision
- follow-up packetization is complete through `TODO-020`, `TODO-021`, and `TODO-022`

## Decision Matrix · Pass 2

Classified in this pass:

- `capsule.foundation.n1hub.v1` -> `retain-dream`
  real branch is `sovereign` at version `1.6.0`; dream is `sovereign` at `1.3.0`; measured drift score is `123` from `8` modified paths, `7` link changes, `12` semantic events, and `15` action-plan tasks. Current repo law already treats N1Hub as a concrete runtime with explicit vault, AI, A2C, workspace, and orchestration surfaces in `README.md`, `docs/agents-operations.md`, and the authenticated app routes under `app/*`. Dream still preserves the broader "digital continent" habitat and long-horizon integration target, so it remains useful as future-facing branch doctrine rather than something to promote over the sharper real-side runtime map.
- `capsule.foundation.tracker.v1` -> `retain-dream`
  real branch is `sovereign` at version `1.3.0`; dream is `draft` at `1.1.0`; measured drift score is `114` from `8` modified paths, `6` link changes, `12` semantic events, and `14` action-plan tasks. The current runtime already encodes tracker truth as a concrete orchestration input in `lib/symphony/tracker.ts`, `lib/symphony/config.ts`, and `docs/symphony.md`, where tracker mode is explicit, read-only, and branch-aware. Dream's predictive execution intelligence, earlier drift detection, and richer reminder logic still read as a valid target state, so it should stay as Dream rather than replace the current real-side accountability contract.
- `capsule.foundation.capsuleos.v1` -> `retain-dream`
  real branch is `sovereign` at version `1.6.0`; dream is `sovereign` at `1.4.0`; measured drift score is `113` from `8` modified paths, `6` link changes, `11` semantic events, and `14` action-plan tasks. Live repo law already encodes CapsuleOS as a full operating boundary through `README.md`, `docs/validator.md`, and the validator-owned runtime in `lib/validator/*`: it is not merely a schema, but the present 5-element, 16-gate, lifecycle, and branch-discipline authority. Dream sharpens the future direction around richer control surfaces and decomposition pressure, but it does not outrank the current real-side constitutional law, so it should remain future doctrine rather than a promotion target.
- `capsule.foundation.n-infinity.v1` -> `retain-dream`
  real branch is `sovereign` at version `1.8.0`; dream is `draft` at `1.7.0`; measured drift score is `110` from `9` modified paths, `5` link changes, `11` semantic events, and `14` action-plan tasks. The current repo now grounds N-Infinity in real workflow law and runtime surfaces: `README.md`, `docs/ninfinity.md`, `NINFINITY_WORKFLOW.md`, `lib/symphony/config.ts`, and `lib/symphony/tracker.ts` all encode bounded capsule-graph execution with night-window dispatch and explicit tracker policy. Dream still preserves the higher-capability continuous swarm vision, but as written it is a target state beyond the current bounded runtime and should therefore stay Dream-side until that operating law changes.
- `capsule.project.n-infinity.v1` -> `retain-dream`
  real branch is `active` at version `1.3.0`; dream is `draft` at `1.2.0`; measured drift score is `108` from `7` modified paths, `6` link changes, `12` semantic events, and `13` action-plan tasks. The real project hub already carries the current implementation program for agent catalog, orchestration policy, durable state, and deployment shape, which matches the project-level semantics in `docs/projects.md` and the current runtime bridge documented in `docs/ninfinity.md`. Dream remains a roadmap for denser iteration fabric, stronger control-plane visibility, and richer autonomy shaping, so it should remain a project-level future plan rather than be promoted ahead of implemented project truth.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/todo-executor/SKILL.md`

## System Prompt Slice

```text
You are the Branch Steward Agent. Triage the highest-drift constitutional hubs against live repository reality and force an explicit branch decision for each one without drifting into mass editing.
```

## Operator Command Pack

- `Take TODO-008 and force branch decisions on the highest-drift constitutional hubs.`
- `Work as Branch Steward Agent: promote, retain, or rewrite each named hub against live repo truth.`

## Acceptance Criteria

- all ten measured hubs have an explicit branch decision
- the decision rationale references code, docs, tests, or runtime surfaces where relevant
- no hub is left in an unclassified “maybe later” state
- resulting follow-up work is split into bounded next tasks instead of one giant rewrite

## Verification

- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- `npx vitest run __tests__/lib/diff/*.test.ts __tests__/api/diff.test.ts __tests__/api/diff-apply.test.ts`

## Evidence and Artifacts

- update this task packet with a decision matrix or explicit link to where that matrix now lives
- update `TO-DO/REAL_DREAM_FRONT.md` if the constitutional hotspot picture changes materially
- create bounded follow-up tasks for every hub that lands in `rewrite`
- refresh `TO-DO/HOT_QUEUE.md` if new follow-up work changes the branch wave order

## Follow-Up Packets

- [TODO-020 Background Agent Runtime Dream Rewrite](/home/n1/n1hub.com/TO-DO/tasks/TODO-020-background-agent-runtime-dream-rewrite.md)
- [TODO-021 Vault Stewardship Swarm Dream Rewrite](/home/n1/n1hub.com/TO-DO/tasks/TODO-021-vault-stewardship-swarm-dream-rewrite.md)
- [TODO-022 Workspace Selective Promotion](/home/n1/n1hub.com/TO-DO/tasks/TODO-022-workspace-selective-promotion.md)

## Risks

- triage may drift into essay-writing instead of decision-making
- Dream may preserve useful future structure that is not ready for promotion yet
- if the packet keeps the pre-audit hub set, the next agent may triage the wrong surfaces with clean execution discipline but stale branch truth
- promoting the workspace hub must stay selective; copying the whole dream capsule into Real would discard stronger real-side runtime inventory and would widen blast radius unnecessarily

## Stop Conditions

- the work starts reviewing capsules outside the named hub set
- a hub cannot be classified without a separate new audit or implementation task

## Queue Update Rule

- if some hubs are classified but the set is incomplete, keep the task `ACTIVE` and record which hubs remain
- if classification depends on missing audit evidence or a new branch policy question, mark the task `BLOCKED`
- if all ten hubs have explicit decisions and follow-up splits, mark this task `DONE` and move the next unresolved branch item to the front

## Handoff Note

The measured target set is now aligned with `TODO-007`.
The full top-ten matrix is now classified.
The triage pass is closed.
Continue Front A by pulling [TODO-009 Vault Steward Dream-Only Operations Review](/home/n1/n1hub.com/TO-DO/tasks/TODO-009-vault-steward-dream-only-operations-review.md) and [TODO-010 Real-Only Law Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-010-real-only-law-sync.md) first, then take the new bounded follow-up packets `TODO-020`, `TODO-021`, and `TODO-022`.
