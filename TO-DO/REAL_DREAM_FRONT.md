<!-- @anchor doc:todo.real-dream-front links=doc:todo.index,doc:todo.hot-queue,doc:n1hub.context,doc:branching.real-dream-diff,doc:n1hub.readme note="Current Real/Dream field brief with corpus facts, hotspots, and first-wave execution order." -->
# Real Dream Front

Updated: 2026-03-09

This brief is the current operating picture for Real/Dream work inside N1Hub. It exists so the next agent can start from live repository truth instead of rediscovering the field.

## Current Vault Facts

- Total capsule files in `data/capsules`: `378`
- Real files: `192`
- Dream files: `186`
- Paired `real/dream` capsule IDs: `183`
- Dream-only capsule IDs: `3`
- Real-only capsule IDs: `9`
- Prior-format `*.dream.json` files still present in `data/capsules`: `0`
- Non-dream overlay branches materialized in `data/capsules`: `0`

## Meaning

- Real/Dream is not a side experiment. The corpus is near-parity.
- Most Dream work is expressed as sparse overlay on top of Real, not as separate branch families.
- The immediate risk is not branch sprawl. The immediate risk is unmanaged drift across constitutional and runtime hubs.

## Dream-Only Outliers

These are the only current dream-only capsule IDs:

- `capsule.operations.vault-steward.latest.v1`
- `capsule.operations.vault-steward.plan.v1`
- `capsule.operations.vault-steward.queue.v1`

Interpretation:

- the only truly Dream-only lane in the live vault is the Vault Steward operational lane
- this is a strong signal that Vault Steward is currently the practical steward of Dream activity
- these operational capsules are intentional Dream-only operational mirrors written by `writeDreamOperationalCapsules()` in `lib/agents/vaultSteward.ts`
- they should be overwritten in place as runtime state changes and should not be promoted to Real

## Real-Only Law Capsules

These are the current real-only IDs with no Dream overlay:

- `capsule.foundation.agent-activation-readiness.v1`
- `capsule.foundation.ai-friendly-engineering.v1`
- `capsule.foundation.contract-governed-boundaries.v1`
- `capsule.foundation.deep-intake-investigation.v1`
- `capsule.foundation.domain-capsule-boundaries.v1`
- `capsule.foundation.golden-path-engineering.v1`
- `capsule.foundation.ignition-ritual.v1`
- `capsule.foundation.low-blast-radius-architecture.v1`
- `capsule.foundation.workspace-recon.v1`

Interpretation:

- Real now contains newer engineering and governance law than Dream
- these nine capsules are `real-first canonical` mutation and boundary law in the current branch model
- Dream is therefore partially stale at the constitutional layer and should not receive mirrors for this set without a concrete future governance divergence

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

1. Treat the field census as frozen until live counts move again: `192 / 186 / 183 / 9 / 3`.
2. Treat the `TODO-008` top-ten hub matrix as the current branch-decision baseline.
3. Treat the three Vault Steward dream-only operational capsules as intentional Dream-only operational mirrors unless the publishing path changes.
4. Treat the nine real-only engineering law capsules as `real-first canonical` unless a specific future governance divergence appears.
5. `TODO-020` is now closed: the Dream `background-agent-runtime` hub was rewritten around current governed runtime truth with future-only delta preserved.
6. `TODO-021` is now closed: the Dream `vault-stewardship-swarm` hub was rewritten around live stewardship truth and explicitly separated from the Dream-only operational mirrors.
7. Continue the remaining selective `workspace` promotion packet.
8. Expand promotion and branch-safe tests only after those policy and doctrine packets land.

## Task Links

- [TODO-007 Real Dream Global Audit](/home/n1/n1hub.com/TO-DO/tasks/TODO-007-real-dream-global-audit.md)
- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [TODO-009 Vault Steward Dream-Only Operations Review](/home/n1/n1hub.com/TO-DO/tasks/TODO-009-vault-steward-dream-only-operations-review.md)
- [TODO-010 Real-Only Law Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-010-real-only-law-sync.md)
- [TODO-011 Real Dream Promotion Test Net](/home/n1/n1hub.com/TO-DO/tasks/TODO-011-real-dream-promotion-test-net.md)
