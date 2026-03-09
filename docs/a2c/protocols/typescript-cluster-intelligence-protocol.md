# TypeScript Cluster Intelligence Protocol

## Purpose

Extract high-signal engineering context from the TypeScript cluster triads so
Anything-to-Capsules can reason with real project contracts instead of generic
ingestion heuristics.

## Target Directories

1. `docs/typescript-clusters`
2. `src/core/typescript`
3. `tests/typescript-clusters`

## Core Rule

Treat each TypeScript cluster as a deterministic triad:

- docs define contract intent,
- source defines runtime contract/engine APIs,
- tests define invariants and quality gates.

If triad coherence is weak, agent confidence must drop and mutation posture must
become conservative.

The extraction is allowed to reuse intellectual patterns from historical
legacy corpus artifacts, but runtime behavior MUST NOT depend on external
corpus paths. The skill remains repo-native and local-first.

## Extraction Procedure

1. Build cluster sets from each directory.
2. Compute `docs/src/tests` triad coverage and gap lists.
3. Parse exported APIs from `src/core/typescript/*.ts`.
4. Parse invariant intent from test titles (`it(...)`, `test(...)`).
5. Emit:
   - `triad_coverage_ratio`
   - `average_triad_score`
   - cluster gap diagnostics
   - derived relevance terms and invariant signals
   - capability signals (`ingestion`, `retrieval`, `governance`, etc.)
   - threshold hint samples from source contracts/tests

## How Agent Uses This Context

1. Expand relevance classification for intake sources.
2. Add triad-governance risk into pre-ingest investigation.
3. Prefer non-destructive integration when conflict or triad drift appears.
4. Strengthen recommendations for dry-run and human review when risk rises.
5. Keep runtime decoupled from external-corpus-specific naming by filtering
   non-portable reference tokens during dynamic relevance expansion.


## Output Requirements

- Machine-readable JSON artifact.
- Optional markdown summary for operator visibility.
- Deterministic ordering of clusters, exports, and signals.
- Include capability and threshold-hint diagnostics so downstream modules can
  reason about contract depth, not only file presence.
