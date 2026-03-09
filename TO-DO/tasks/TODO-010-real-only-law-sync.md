# TODO-010 Real-Only Law Sync

- Priority: `P0`
- Execution Band: `NOW`
- Status: `READY`
- Owner Lane: `Governance Sync Agent`
- Cluster: `Real/Dream governance`

## Goal

Reconcile the nine real-only engineering law capsules with Dream branch policy so Dream no longer carries an older constitutional picture of N1Hub by default.

## Why Now

Real already contains newer engineering and governance law:

- `capsule.foundation.agent-activation-readiness.v1`
- `capsule.foundation.ai-friendly-engineering.v1`
- `capsule.foundation.contract-governed-boundaries.v1`
- `capsule.foundation.deep-intake-investigation.v1`
- `capsule.foundation.domain-capsule-boundaries.v1`
- `capsule.foundation.golden-path-engineering.v1`
- `capsule.foundation.ignition-ritual.v1`
- `capsule.foundation.low-blast-radius-architecture.v1`
- `capsule.foundation.workspace-recon.v1`

If Dream remains silent on those laws, agents may incorrectly treat older Dream capsules as the higher-fidelity plan.

## Scope

- the nine real-only capsule files listed above
- `scripts/curate-vault-real-dream.ts`
- `docs/real-dream-diff.md`
- `TO-DO/REAL_DREAM_FRONT.md`

## Non-Goals

- no automatic creation of Dream overlays for every real-only capsule
- no repo-wide editorial sweep through unrelated foundation capsules
- no weakening of the current Real-first engineering law

## Deliverables

- classification of each real-only law capsule as either `real-first canonical` or `needs dream overlay`
- explicit rule for when engineering law should stay Real-only
- follow-up work for any capsule that truly needs a Dream counterpart
- updates to branch curation notes if the policy needs to be encoded

## Context Snapshot

- the current real-only law capsules are all newer engineering and governance doctrine
- Dream is therefore partially stale at the constitutional layer, not universally more advanced

## Dependencies

- hard: start from the latest verified branch audit in TODO-007
- soft: use the decision posture from TODO-008 when constitutional hub treatment changes branch interpretation

## Source Signals

- TO-DO/tasks/TODO-007-real-dream-global-audit.md
- TO-DO/tasks/TODO-008-real-dream-constitutional-hub-triage.md
- TO-DO/REAL_DREAM_FRONT.md

## Entry Checklist

- confirm the nine listed real-only IDs still have no Dream overlay before classifying policy
- inspect the current Dream-side constitutional capsules so the sync decision is based on live branch law rather than assumption
- check whether `TODO-007` or `TODO-008` already changed the branch interpretation for any of these laws

## Implementation Plan

1. Review the nine real-only law capsules against current Dream policy.
2. Classify each one as `real-first canonical` or `needs dream overlay`.
3. Write branch-policy rationale and split any true follow-up overlay work into bounded tasks.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/todo-executor/SKILL.md`

## System Prompt Slice

```text
You are the Governance Sync Agent. Reconcile Real-first engineering law with Dream branch policy, preserve the newer law, and classify which capsules stay canonical in Real versus which truly need Dream mirrors.
```

## Operator Command Pack

- `Take TODO-010 and reconcile the real-only engineering law capsules with Dream policy.`
- `Work as Governance Sync Agent and classify each real-only law capsule without manufacturing speculative overlays.`

## Acceptance Criteria

- all nine real-only law capsules are classified
- Dream policy no longer leaves these capsules unexplained
- the result preserves current engineering law instead of regressing it
- follow-up implementation work is bounded and explicit

## Verification

- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- `npm run check:anchors:full`

## Evidence and Artifacts

- update this packet with classification results for all nine law capsules
- update `TO-DO/REAL_DREAM_FRONT.md` if the real-only law interpretation changes
- update branch curation notes or follow-up task packets if any capsule genuinely needs a Dream mirror
- refresh queue order if the sync outcome changes the remaining branch wave

## Risks

- creating Dream overlays too casually may manufacture speculative law instead of clarifying policy
- leaving everything Real-only without rationale will keep Dream semantically stale

## Stop Conditions

- the task starts generating new Dream prose before branch policy is settled

## Queue Update Rule

- if some law capsules are classified but others still need review, keep the task `ACTIVE`
- if branch policy cannot be decided without a higher-level constitutional decision, mark the task `BLOCKED`
- if all nine capsules have explicit policy treatment and bounded follow-up, mark the task `DONE`

## Handoff Note

This task is about branch law, not about writing more capsule prose. Decide which engineering laws should remain Real-first and which ones need Dream mirrors, then encode that policy clearly.
