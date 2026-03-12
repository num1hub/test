<!-- @anchor doc:todo.real-dream-front links=doc:todo.index,doc:todo.hot-queue,doc:n1hub.context,doc:branching.real-dream-diff,doc:n1hub.readme note="Current Real/Dream field brief with corpus facts, hotspots, and first-wave execution order." -->
# Real Dream Front

Updated: 2026-03-12

This brief is the current operating picture for Real/Dream work inside N1Hub. It exists so the next agent can start from live repository truth instead of rediscovering the field.

## Current Vault Facts

- Total capsule files in `data/capsules`: `489`
- Real files: `257`
- Dream files: `232`
- Paired `real/dream` capsule IDs: `227`
- Dream-only capsule IDs: `5`
- Real-only capsule IDs: `30`
- Prior-format `*.dream.json` files still present in `data/capsules`: `0`
- Non-dream overlay branches materialized in `data/capsules`: `0`

## Meaning

- Real/Dream remains a first-class operating model, but the corpus is no longer near parity.
- Dream still covers most live IDs, but Real-only decomposition and governance surfaces now materially outnumber Dream-only outliers.
- The immediate risk is not branch creation. The immediate risk is stale branch framing after containment and any accidental reopening of sensitive law surfaces without a new measured need.

## Dream-Only Outliers

These are the current dream-only capsule IDs:

- `capsule.operations.vault-steward.archive.v1`
- `capsule.operations.vault-steward.archive.vault-steward-1773020624098.v1`
- `capsule.operations.vault-steward.latest.v1`
- `capsule.operations.vault-steward.plan.v1`
- `capsule.operations.vault-steward.queue.v1`

Interpretation:

- the Dream-only lane is still confined to Vault Steward operational state and archive mirrors
- the two `archive*` capsules are Dream-only archive artifacts, while `latest`, `plan`, and `queue` remain active operational mirrors
- these capsules are written by Vault Steward runtime code and should be overwritten in place as state changes
- they should not be promoted to Real without explicit policy that changes their branch role

## Real-Only Capsules

These are the current real-only IDs with no Dream overlay:

- `capsule.foundation.agent-activation-readiness.v1`
- `capsule.foundation.ai-friendly-engineering.v1`
- `capsule.foundation.background-agent-runtime.control-plane.v1`
- `capsule.foundation.background-agent-runtime.daemon-lifecycle.v1`
- `capsule.foundation.background-agent-runtime.mutation-gates.v1`
- `capsule.foundation.background-agent-runtime.work-orchestration.v1`
- `capsule.foundation.contract-governed-boundaries.v1`
- `capsule.foundation.deep-intake-investigation.v1`
- `capsule.foundation.domain-capsule-boundaries.v1`
- `capsule.foundation.golden-path-engineering.v1`
- `capsule.foundation.ignition-ritual.v1`
- `capsule.foundation.key-agents.governance-lane.v1`
- `capsule.foundation.key-agents.mining-lane.v1`
- `capsule.foundation.key-agents.planning-lane.v1`
- `capsule.foundation.key-agents.stewardship-lane.v1`
- `capsule.foundation.key-agents.swarm-lane.v1`
- `capsule.foundation.key-agents.user-lane.v1`
- `capsule.foundation.low-blast-radius-architecture.v1`
- `capsule.foundation.n-infinity.governance-metrics.v1`
- `capsule.foundation.n-infinity.runtime-fabric.v1`
- `capsule.foundation.n-infinity.signal-fabric.v1`
- `capsule.foundation.n-infinity.swarm-roster.v1`
- `capsule.foundation.sovereign-refactor.v1`
- `capsule.foundation.workspace-recon.v1`
- `capsule.foundation.workspace.assistant-control.v1`
- `capsule.foundation.workspace.execution-loop.v1`
- `capsule.foundation.workspace.identity-access.v1`
- `capsule.foundation.workspace.operator-surfaces.v1`
- `capsule.foundation.workspace.runtime-lanes.v1`
- `capsule.project.n1hub-sovereign-refactor.v1`

Interpretation:

- Real now contains both newer engineering/governance law and newer decomposed runtime sub-hubs that Dream does not yet mirror
- the original nine engineering-law capsules remain real-first canonical
- the `background-agent-runtime` split is now explicitly classified as `real-first canonical`: the Dream parent already routes through the four real-only sub-hubs, so mirroring them would duplicate current runtime law instead of preserving future-only delta
- the `key-agents` split is now explicitly classified as `real-first canonical`: the Dream parent already routes through the six real-only lane hubs, so mirroring them would duplicate current live lane topology instead of preserving future-only coordination delta
- the `workspace` split is now explicitly classified as `real-first canonical`: the Dream parent already routes through the five real-only workspace sub-hubs, while the real parent already owns canonical boundary doctrine and runtime inventory after `TODO-022`
- the `n-infinity` split is now explicitly classified as `real-first canonical`: the Dream parent already routes through `runtime-fabric`, `swarm-roster`, `signal-fabric`, and `governance-metrics`, while the real parent already owns canonical live night-shift and bounded swarm doctrine after `TODO-028`
- the sovereign-refactor planning set is now also explicitly classified as `real-first canonical`: `sovereign-refactor` and `project.n1hub-sovereign-refactor` are live operator-directed real-side planning surfaces, not missing Dream mirrors
- `n1hub-gold-master` is not an open parity gap: the paired Real/Dream surface is already lawful, with Real carrying the current constitutional charter and Dream carrying the next-horizon constitutional extension
- the CapsuleOS branch frontier is now materially contained: the paired `capsuleos*` law surfaces are already lawful branch pairs, the protected Dream `16-gates` micro-packet is repaired, and the Dream-wide `G16` finalization wave is complete
- the original engineering-law set plus the measured decomposition/planning families are now explicitly classified; remaining branch-sensitive work is no longer live parity or validator debt and should reopen only through a deliberate protected-law governance decision

## Highest-Drift Paired Hubs

Measured on `2026-03-09` by running hub-scoped `computeDiff('real', 'dream', { scopeType: 'capsule', capsuleIds: [id] })`
across all paired capsules whose real-side metadata advertises `subtype: "hub"`.

Scoring model used for ranking:

- `score = modifiedPaths * 5 + linkChanges * 8 + semanticEvents + actionPlanTasks`
- `modifiedPaths` comes from diff field changes
- `linkChanges` is `addedLinks + removedLinks + modifiedLinks`
- `semanticEvents` and `actionPlanTasks` come from the live diff payload

Current top measured hub drift set:

- `capsule.foundation.background-agent-runtime.v1`
  score `239` · `12` modified paths · `16` link changes · `23` semantic events · `28` action-plan tasks
- `capsule.foundation.personal-ai-assistant.v1`
  score `197` · `10` modified paths · `13` link changes · `20` semantic events · `23` action-plan tasks
- `capsule.foundation.workspace.v1`
  score `173` · `8` modified paths · `12` link changes · `17` semantic events · `20` action-plan tasks
- `capsule.foundation.vault-stewardship-swarm.v1`
  score `156` · `13` modified paths · `7` link changes · `15` semantic events · `20` action-plan tasks
- `capsule.foundation.key-agents.v1`
  score `129` · `12` modified paths · `5` link changes · `12` semantic events · `17` action-plan tasks
- `capsule.foundation.n1hub.v1`
  score `123` · `8` modified paths · `7` link changes · `12` semantic events · `15` action-plan tasks
- `capsule.foundation.tracker.v1`
  score `114` · `8` modified paths · `6` link changes · `12` semantic events · `14` action-plan tasks
- `capsule.foundation.capsuleos.v1`
  score `113` · `8` modified paths · `6` link changes · `11` semantic events · `14` action-plan tasks
- `capsule.foundation.n-infinity.v1`
  score `110` · `9` modified paths · `5` link changes · `11` semantic events · `14` action-plan tasks
- `capsule.project.n-infinity.v1`
  score `108` · `7` modified paths · `6` link changes · `12` semantic events · `13` action-plan tasks

Interpretation:

- the measured drift front is concentrated in runtime governance, assistant orchestration, workspace doctrine, and vault stewardship
- broad content cleanup is still not the first move
- the next branch wave should start from hub triage and explicit branch decisions on the measured top set, not from older intuition lists
- workspace is now no longer an open interpretation gap: Real is canonical for workspace boundaries and runtime inventory, while Dream is narrowed to future workspace delta
- personal-ai-assistant is now also explicit: Real is canonical for the live `N1` carrier contract, while Dream remains future assistant doctrine instead of shadow runtime truth
- key-agents is now also explicit: Real is canonical for the live lane topology, while Dream remains future swarm-coordination doctrine instead of a shadow map of current runtime ownership
- n1hub is now also explicit: Real is canonical for the live N1Hub runtime contract, while Dream remains future habitat doctrine instead of a shadow statement of current runtime truth
- tracker is now also explicit: Real is canonical for the live accountability and orchestration contract, while Dream remains predictive execution doctrine instead of a shadow statement of current runtime tracking truth
- capsuleos is now also explicit: Real is canonical for the live CapsuleOS operating contract, while Dream remains future operating-system doctrine instead of a shadow restatement of validator-owned trust law
- n-infinity is now also explicit: Real is canonical for the live bounded night-shift swarm contract, while Dream remains future iteration-fabric doctrine instead of a shadow statement of already-live runtime behavior
- project.n-infinity is now also explicit: Real is canonical for the current implementation program and bounded deployment posture, while Dream remains future control-plane and swarm-governance doctrine instead of a shadow statement of the current project topology
- operator-directed downstream capsule work can now continue from bounded atomic clusters or move to promotion testing, but the hub wave itself is no longer the bottleneck

## Existing Runtime Surfaces

Real/Dream already has live code and API surfaces:

- `docs/real-dream-diff.md`
- `lib/diff/branch-manager.ts`
- `lib/diff/diff-engine.ts`
- `lib/diff/merge-engine.ts`
- `app/api/branches/route.ts`
- `app/api/diff/route.ts`
- `app/api/diff/apply/route.ts`
- `app/api/capsules/[id]/diff/route.ts`
- `app/api/capsules/[id]/promote/route.ts`
- `scripts/curate-vault-real-dream.ts`

Real/Dream also already has test evidence, especially around diff and merge:

- `__tests__/lib/diff/*.test.ts`
- `__tests__/api/diff.test.ts`
- `__tests__/api/diff-apply.test.ts`
- `__tests__/api/branches.test.ts`

The gap is not total absence of runtime. The gap is missing operator-facing task discipline around corpus drift, promotion review, and outlier stewardship.

## First-Wave Execution Order

1. Treat the field census as frozen until live counts move again: `489 / 257 / 232 / 227 / 5 / 30`.
2. Treat the `TODO-008` top-ten hub matrix as the current branch-decision baseline.
3. Treat the five Vault Steward dream-only operational and archive capsules as intentional Dream-only mirrors unless the publishing path changes.
4. Treat the original engineering-law set and the newer real-only decomposition families as `real-first canonical` unless a specific future governance divergence appears.
5. `TODO-020` is now closed: the Dream `background-agent-runtime` hub was rewritten around current governed runtime truth with future-only delta preserved.
6. `TODO-021` is now closed: the Dream `vault-stewardship-swarm` hub was rewritten around live stewardship truth and explicitly separated from the Dream-only operational mirrors.
7. `TODO-022` is now closed: the real `workspace` hub owns the canonical boundary doctrine and live runtime inventory, while Dream keeps only future-facing workspace delta.
8. `TODO-023` is now closed: the real `personal-ai-assistant` hub owns the canonical current `N1` carrier contract, while Dream keeps future assistant delta.
9. `TODO-024` is now closed: the real `key-agents` hub owns the canonical live role map, while Dream keeps future swarm-coordination delta.
10. `TODO-025` is now closed: the real `n1hub` hub owns the canonical current runtime contract, while Dream keeps future habitat doctrine.
11. `TODO-026` is now closed: the real `tracker` hub owns the canonical current accountability contract, while Dream keeps predictive execution doctrine.
12. `TODO-027` is now closed: the real `capsuleos` hub owns the canonical live operating contract, while Dream keeps future operating-system delta.
13. `TODO-028` is now closed: the real `n-infinity` hub owns the canonical live night-shift and bounded swarm contract, while Dream keeps future iteration-fabric doctrine.
14. `TODO-029` is now closed: the real `project.n-infinity` hub owns the canonical current implementation program and bounded deployment posture, while Dream keeps future control-plane and swarm-governance doctrine.
15. First-wave hub containment is complete, and the default next branch-facing step is no longer open parity classification or validator finalization: the remaining branch frontier is materially contained unless the operator deliberately reopens a specific sensitive surface.
16. `TODO-030` is now closed: the first downstream N-Infinity atomic trio (`weaver`, `parliament`, `suggestion-agent`) keeps Real canonical for the current role contracts while Dream keeps future-only delta.
17. The current branch-facing blocker is no longer Dream validator debt. The full corpus validator is now green after the protected `16-gates` micro-packet and the Dream-wide seal recomputation wave, while non-protected downstream Dream hygiene and parity classification are materially contained.
18. The `background-agent-runtime` decomposition family is now explicitly classified as `real-first canonical`: `control-plane`, `daemon-lifecycle`, `mutation-gates`, and `work-orchestration` stay Real-only unless Dream gains a concrete future runtime divergence instead of just restating current routing.
19. The `key-agents` decomposition family is now explicitly classified as `real-first canonical`: `user-lane`, `mining-lane`, `planning-lane`, `stewardship-lane`, `governance-lane`, and `swarm-lane` stay Real-only unless Dream gains a concrete future lane divergence instead of just restating current role topology.
20. The `workspace` decomposition family is now explicitly classified as `real-first canonical`: `assistant-control`, `execution-loop`, `identity-access`, `operator-surfaces`, and `runtime-lanes` stay Real-only unless Dream gains a concrete future habitat divergence instead of just restating current composition routing.
21. The `n-infinity` decomposition family is now explicitly classified as `real-first canonical`: `runtime-fabric`, `swarm-roster`, `signal-fabric`, and `governance-metrics` stay Real-only unless Dream gains a concrete future swarm-governance divergence instead of just restating current bounded night-shift routing.
22. The sovereign-refactor planning family is now explicitly classified as `real-first canonical`: `sovereign-refactor` and `project.n1hub-sovereign-refactor` stay Real-only unless Dream gains a concrete future refactor-governance divergence instead of simply shadowing the current operator-directed program.
23. `n1hub-gold-master` remains a lawful paired constitutional surface: Real keeps the current constitutional north star, while Dream carries the extended constitutional horizon without needing selective promotion or a new parity packet.
24. The remaining branch-facing frontier is no longer open validator work: `capsuleos*` already exists as lawful paired branch doctrine, `16-gates@dream` is repaired, and the broader Dream `G16` pending-hash debt has been finalized through the repo-native validator auto-fix path rather than left as open parity drift.

## Task Links

- [TODO-007 Real Dream Global Audit](/home/n1/n1hub.com/TO-DO/tasks/TODO-007-real-dream-global-audit.md)
- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [TODO-009 Vault Steward Dream-Only Operations Review](/home/n1/n1hub.com/TO-DO/tasks/TODO-009-vault-steward-dream-only-operations-review.md)
- [TODO-010 Real-Only Law Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-010-real-only-law-sync.md)
- [TODO-027 CapsuleOS Retain-Dream Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-027-capsuleos-retain-dream-sync.md)
- [TODO-028 N-Infinity Retain-Dream Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-028-n-infinity-retain-dream-sync.md)
- [TODO-029 N-Infinity Project Retain-Dream Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-029-project-n-infinity-retain-dream-sync.md)
- [TODO-030 N-Infinity Atomic Retain-Dream Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-030-n-infinity-atomic-retain-dream-sync.md)
- [TODO-011 Real Dream Promotion Test Net](/home/n1/n1hub.com/TO-DO/tasks/TODO-011-real-dream-promotion-test-net.md)
