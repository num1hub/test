# Chaos-to-Capsules Migration Playbook

## Purpose

Provide an operational playbook for migrating hundreds or thousands of fragmented sources into a coherent capsule base without losing signal integrity.

## Operating Assumption

Large corpus migration is a campaign, not a single-shot ingest.
Use controlled waves with auditable checkpoints.

## Wave Structure

Recommended default:

- Wave size: 20-50 source files per run.
- Hard cap: 50 mutations per invocation unless explicit override.
- Every wave produces a report packet and updates plan artifacts.

## Mandatory Artifacts

Maintain these artifacts for campaign continuity:

1. `data/private/a2c/tasks/ROADMAP.md` - campaign-level phases and goals.
2. `data/private/a2c/tasks/PLAN.md` - current execution queue and statuses.
3. `data/private/a2c/tasks/CAMPAIGN_STATE_<campaign_id>.json` - deterministic wave state.
4. `reports/a2c/*.json` - per-run machine-readable evidence.

## Wave Lifecycle

### Phase 1: Recon and Scope Lock

- classify workspace profile,
- classify source relevance (core/adjacent/external),
- choose dialect and duplicate strategy,
- resolve wave position (`--wave-index auto` preferred for campaign continuation).

### Phase 2: Intake and Decomposition

- stage sources in quarantine,
- process sequentially in active workspace,
- decompose long sources into meta + child capsules.

### Phase 3: Integration Decisions

- exact duplicate -> skip or update,
- near duplicate -> preserve and link,
- contradiction -> preserve and link with review flag.

### Phase 4: Quality Gates

- run audit,
- rebuild index,
- verify deterministic outputs and counts.

### Phase 5: Wave Closeout

- mark completed queue items,
- retain failed artifacts for analysis,
- update ROADMAP/PLAN with next-wave priorities.

## Campaign Stop Conditions

Pause campaign and request human review when:

1. unresolved conflict ratio exceeds 10% in a wave,
2. repeated schema/quality violations suggest systemic issue,
3. confidence drops to LOW for two consecutive waves.

## Non-Negotiables

Never:

- delete capsules automatically,
- fabricate reconciliation facts,
- bypass activation, recon, or audit gates.

Always:

- preserve lineage,
- keep decisions evidence-grounded,
- report deterministic next step.
