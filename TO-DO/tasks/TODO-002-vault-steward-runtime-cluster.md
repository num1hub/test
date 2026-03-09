# TODO-002 Vault Steward Runtime Cluster

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `READY`
- Owner Lane: `Cluster Refactor Agent`
- Cluster: `#1 Vault Steward Runtime`

## Goal

Reduce blast radius inside the active Vault Steward cluster by extracting one more real seam from the current god-file pressure zone.

## Why Now

Vault Steward remains the top architecture cluster for N1Hub. It is still the highest-risk place for partial-context agent changes.

## Scope

- `lib/agents/vaultSteward.ts`
- `lib/agents/vaultSteward/*`
- `scripts/vault-steward.ts`
- `__tests__/lib/vaultSteward.test.ts`
- `__tests__/api/vault-steward.test.ts`

## Non-Goals

- no broad redesign of agent runtime strategy
- no opportunistic cleanup outside the chosen seam
- no hidden import changes that bypass the public entrypoint

## Deliverables

- one extracted bounded responsibility
- tighter public/private separation
- tests for the new seam
- updated queue evidence if file pressure drops

## Context Snapshot

- Vault Steward is still the top architecture cluster.
- Public-entry enforcement exists already, so the next move should be one bounded extraction rather than another law-only change.

## Dependencies

- soft: use the current cluster boundary and any lifecycle findings from TODO-009 if they affect seam choice
- output: this task should emit one bounded seam extraction, not a whole-cluster rewrite

## Source Signals

- current file-pressure concentration in lib/agents/vaultSteward.ts
- active cluster rule in README.md and AGENTS.md

## Entry Checklist

- inspect the current Vault Steward file-pressure zone before choosing a seam
- confirm external callers still enter through the public surface only
- choose one seam and state it explicitly before editing

## Implementation Plan

1. Choose one seam only: prompt law, queue planning, state artifacts, or execution orchestration.
2. Extract it behind the existing public surface.
3. Verify the seam and stop without widening into a full runtime rewrite.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/todo-executor/SKILL.md`

## System Prompt Slice

```text
You are the Cluster Refactor Agent for the active Vault Steward cluster. Choose one real seam, extract it cleanly behind the public entrypoint, verify it, and stop before the refactor expands into a second cluster.
```

## Operator Command Pack

- `Take TODO-002 and extract one bounded seam from Vault Steward.`
- `Work as TO-DO Executor on the active Vault Steward cluster and stop after one verified seam.`

## Acceptance Criteria

- the extracted seam has a clear responsibility
- external callers still use `@/lib/agents/vaultSteward`
- tests pass
- file-size pressure decreases or becomes easier to continue in the next step

## Evidence and Artifacts

- update this task packet with the chosen seam and resulting file map
- refresh queue notes if the next cluster slice becomes clearer after extraction
- record file-pressure or boundary evidence that justifies the next pass

## Verification

- `npx vitest run __tests__/lib/vaultSteward.test.ts __tests__/api/vault-steward.test.ts`
- `npx eslint eslint.config.mjs app/api/agents/vault-steward/route.ts scripts/vault-steward.ts __tests__/api/vault-steward.test.ts __tests__/lib/vaultSteward.test.ts`
- `npm run audit:file-guardrails`
- `npm run typecheck`

## Risks

- extraction may accidentally widen cross-module knowledge instead of shrinking it
- file moves may produce false confidence without reducing coupling

## Stop Conditions

- the chosen seam starts leaking into unrelated runtime surfaces or another cluster

## Queue Update Rule

- keep this task `ACTIVE` if one seam is extracted but the cluster still needs another bounded slice
- mark it `BLOCKED` if the next safe seam cannot be chosen without a new architecture decision
- mark it `DONE` only when the chosen seam is extracted, verified, and leaves a clearer next cluster packet

## Handoff Note

Choose one seam only: prompt law, queue planning, state artifacts, or execution orchestration. Extract it cleanly, verify it, and stop.
