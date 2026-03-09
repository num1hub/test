# TypeScript Cluster Context Atlas

## Purpose

Capture distilled engineering intelligence from the TypeScript triad corpus so
Anything-to-Capsules can reason with project-native contracts and tests instead
of generic ingestion assumptions.

This atlas is a static reference artifact. It does not create runtime
dependency on any external corpus path.

## Source Snapshot

- Workspace root: `C:\Users\N1\Desktop\N1`
- Scanned directories:
  - external legacy capsule corpus (read-only reference during analysis only)
  - `docs/typescript-clusters`
  - `src/core/typescript`
  - `tests/typescript-clusters`
- Observed counts:
  - legacy capsule corpus: 109 files
  - `docs/typescript-clusters`: 31 files
  - `src/core/typescript`: 31 files
  - `tests/typescript-clusters`: 31 files
  - Triad coverage: 31/31 (1.0)

## Operational Signals

### Triad Quality

- `triad_coverage_ratio=1.0`
- `average_triad_score=1.0`
- `clusters_with_apis=31`
- `clusters_with_threshold_hints=27`
- `anchor_coverage_count=31`

Interpretation:
- The docs/source/tests triad is complete and can be treated as a high-trust
  governance gate.

### Dominant Capability Signals

Top extracted capability families:

1. `governance`
2. `rollout`
3. `runtime`
4. `retrieval`
5. `lineage`
6. `operations`
7. `ingestion`
8. `autonomy`

Implication for Anything-to-Capsules:
- Deep intake should assume contract-heavy, gate-driven operation.
- Mutation runs should default to deterministic validation posture.

### Recurrent Invariant Signals

- `determinism`
- `validation`
- `hash-integrity`
- `pii-hygiene`
- `citation-discipline`
- `conflict-handling`
- `rollback-safety`
- `readiness-gates`
- `threshold-gates`

Implication:
- Ingestion outputs must preserve schema strictness, citation grounding, and
  reversible rollout behavior.

## Threshold Capital (Representative)

The triad corpus repeatedly encodes deterministic ranges and gates, including:

- Summary range patterns (`70-140` words in strict TypeScript contracts)
- Keywords range patterns (`5-12`)
- Confidence bounds (`[0,1]`)
- Retrieval defaults and rerank caps
- Rollout/rollback readiness thresholds
- Drift policies (revision spread, update skew windows)

Implication:
- Anything-to-Capsules investigation should treat threshold drift as a primary
  risk signal, not a cosmetic warning.

## Legacy Wisdom Import (Decoupled)

Historical legacy-corpus artifacts provide conceptual priors:

- progression planning,
- governance-first migration posture,
- conflict-aware integration,
- rollout safety discipline.

These priors are imported as skill heuristics only. Runtime must not require
direct access to external corpus files or paths.

### Deep Extraction Highlights (2026-02-18)

From a legacy manifest snapshot:

- `capsuleCount=100`
- `manifest dependency edges=223`
- priority distribution: `P0=64`, `P1=35`, `P2=1`
- dominant domain family: `TypeScript Runtime` + `TypeScript Quality`

Practical implication for Anything-to-Capsules:

- intake prioritization should be dependency-aware (not flat FIFO),
- conflict and duplicate flows should preserve lineage/audit artifacts,
- deterministic quality gates remain the default posture for any non-trivial
  merge/update campaign.

## How to Use This Atlas

1. Load before deep investigation or large corpus migration runs.
2. Use capability signals to tune relevance and merge posture.
3. Use triad and threshold signals to raise or lower mutation confidence.
4. Keep the repo-native N1Hub vault as runtime SSOT; use this atlas as supporting context.
