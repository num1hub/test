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
- these operational capsules need explicit lifecycle law instead of remaining implicit branch residue

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
- Dream is therefore partially stale at the constitutional layer
- future agents should not assume Dream is the more advanced branch in every domain

## Highest-Drift Paired Hubs

These paired overlays showed the strongest raw divergence during the current census:

- `capsule.foundation.key-agents.v1`
- `capsule.foundation.vault-stewardship-swarm.v1`
- `capsule.foundation.capsule-librarian-agent.v1`
- `capsule.foundation.capsuleos.v1`
- `capsule.foundation.n1hub.v1`
- `capsule.foundation.a2c-link.v1`
- `capsule.foundation.n-infinity.weaver.v1`
- `capsule.foundation.branch-steward-agent.v1`
- `capsule.foundation.symphony-observability.v1`
- `capsule.foundation.n1hub-gold-master.v1`

Interpretation:

- the biggest Real/Dream pressure sits in agent architecture, vault stewardship, constitutional law, orchestration, and runtime doctrine
- broad content cleanup is not the first move
- the first move is hub triage, promotion discipline, and operational law around Dream-safe work

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

1. Audit the whole Real/Dream field and freeze the current drift picture.
2. Triage the highest-drift constitutional hubs into `promote`, `retain-dream`, or `rewrite`.
3. Resolve the Vault Steward dream-only outliers with explicit lifecycle law.
4. Reconcile the nine real-only law capsules with Dream branch policy.
5. Expand tests around promotion and branch-safe workflows only after the triage targets are explicit.

## Task Links

- [TODO-007 Real Dream Global Audit](/home/n1/n1hub.com/TO-DO/tasks/TODO-007-real-dream-global-audit.md)
- [TODO-008 Real Dream Constitutional Hub Triage](/home/n1/n1hub.com/TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md)
- [TODO-009 Vault Steward Dream-Only Operations Review](/home/n1/n1hub.com/TO-DO/tasks/TODO-009-vault-steward-dream-only-operations-review.md)
- [TODO-010 Real-Only Law Sync](/home/n1/n1hub.com/TO-DO/tasks/TODO-010-real-only-law-sync.md)
- [TODO-011 Real Dream Promotion Test Net](/home/n1/n1hub.com/TO-DO/tasks/TODO-011-real-dream-promotion-test-net.md)
