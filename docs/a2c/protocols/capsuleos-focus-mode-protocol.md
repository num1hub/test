# CapsuleOS Focus Mode Protocol

## Purpose

Define the primary operating mode when user intent is to build a sovereign CapsuleOS knowledge base from large historical materials.
This mode prioritizes CapsuleOS truth-building over generic "ingest anything" behavior.

## Activation Conditions

Enable CapsuleOS Focus Mode when at least one condition is true:

1. user explicitly says focus is CapsuleOS,
2. repository surface shows strong CapsuleOS doctrine and contract concentration,
3. intake corpus is mainly CapsuleOS docs/contracts/code clusters.

## Core Principle

Transform digital chaos into CapsuleOS Source of Truth with deterministic, traceable, non-destructive integration.

## Scope Prioritization

Prioritize intake in this order:

1. CapsuleOS canonical contracts and governance docs:
   - `docs/CAPSULEOS_OVERVIEW.md`
   - `docs/CAPSULEBASE_N1_DECISION.md`
   - `reports/a2c/index.json` (or equivalent repo-native KB index)
2. Existing vault capsules (`data/capsules/*.json`)
3. TypeScript implementation + test clusters tied to CapsuleOS contracts
4. Secondary operational context (logs, drafts, notes)

## Relevance Classifier

Classify each incoming source:

- `core`: directly defines CapsuleOS architecture, contracts, lifecycle, governance.
- `adjacent`: implementation detail or supporting analysis.
- `external`: not clearly related to CapsuleOS scope.

Policy:

- `core`: ingest with high-priority decomposition.
- `adjacent`: ingest with normal decomposition.
- `external`: retain in queue as deferred unless user explicitly approves integration.

## Capsule Construction Policy

For substantial topics, enforce meta -> child decomposition:

1. one parent `meta` capsule capturing high-level domain intent,
2. child capsules for concrete domains (schema, ingestion, retrieval, runtime, governance, operations),
3. deterministic typed links preserving lineage and traceability.

## Source-of-Truth Reinforcement

When a source contradicts existing vault:

1. preserve both versions,
2. add `contradicts` links with evidence,
3. set `human_review_required=true`,
4. avoid forced merge unless conflict is resolved with clear evidence.

## Output Requirements

Each run in focus mode must report:

1. core/adjacent/external source counts,
2. created meta/child capsule counts,
3. conflict and duplicate decisions,
4. unresolved review queue items.
