# Code Artifact Audit -> Capsule Protocol

## Purpose

Adapt rigorous code-review/refactor methodology for Anything-to-Capsules ingestion when incoming material is source code.

Goal:

1. preserve original business logic understanding,
2. extract high-quality technical intelligence,
3. convert findings into structured capsules without losing critical engineering context.

## When to Activate

Use this protocol if at least one condition is true:

1. input is code-heavy (`.py`, `.ts`, `.js`, `.go`, `.java`, etc.),
2. user asks to audit/refactor/review code before or during capsule creation,
3. user requests robustness/performance/security hardening analysis.

If input is non-code, skip this protocol.

## Core Adaptation Principle

The original code-review prompt is not used as-is.
It is transformed into a capsule-oriented workflow:

`Code Audit -> Refactor Reasoning -> Verification -> Capsule Distillation`

## Operational Workflow

### Phase A: Preliminary Engineering Notes

Capture:

1. language and assumed version,
2. completeness/integrity of code input,
3. ambiguous logic requiring explicit review markers.

Do not silently reinterpret unclear behavior.

### Phase B: Structured Engineering Audit

Score and analyze dimensions:

1. readability and naming,
2. modularity and SRP,
3. performance characteristics,
4. robustness/error handling,
5. modern idioms,
6. type safety/documentation,
7. security.

Use evidence from source snippets/patterns.

### Phase C: Refactor Design (Reasoning Layer)

Design improvements with constraints:

- preserve public API intent unless explicitly flagged,
- avoid functional regressions,
- avoid unnecessary over-engineering,
- prioritize critical-risk fixes first.

### Phase D: Verification Reasoning

Perform equivalence-oriented checks:

1. representative scenario tracing,
2. regression risk scan,
3. completeness/path coverage reasoning.

### Phase E: Capsule Distillation

Transform results into capsule-ready signals:

1. `summary` of engineering state,
2. `claims` for concrete findings,
3. `keywords` from high-signal terms,
4. `entities` (modules, services, libraries, components),
5. links to related existing capsules (`supports`, `extends`, `contradicts`, `duplicates`).

## Output Mapping to CapsuleOS

Recommended decomposition for code-centric intake:

1. meta capsule: overall audit scope and final engineering assessment,
2. child capsules:
   - readability/modularity findings,
   - performance findings,
   - security findings,
   - verification/regression notes.

Preserve lineage via decomposition metadata and typed links.

## Guardrails

Never:

- claim runtime/test results that were not actually run,
- invent vulnerabilities without evidence,
- treat speculative optimization as guaranteed performance gain,
- drop business-logic-relevant caveats during distillation.

Always:

- separate evidence from inference,
- keep risk level explicit,
- keep capsule fields deterministic and auditable.
