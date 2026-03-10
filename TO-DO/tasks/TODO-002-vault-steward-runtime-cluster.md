# TODO-002 Vault Steward Runtime Cluster

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `ACTIVE`
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
- chosen seam: prompt law duplication removed from `lib/agents/vaultSteward.ts`
- chosen seam in this pass: daemon lifecycle extracted from `lib/agents/vaultSteward.ts`
- chosen seam in this pass: Codex reviewer lane extracted from `lib/agents/vaultSteward.ts`
- chosen seam in this pass: Codex foreman lane extracted from `lib/agents/vaultSteward.ts`
- chosen seam in this pass: autonomous executor lane extracted from `lib/agents/vaultSteward.ts`
- chosen seam in this pass: provider scout execution extracted from `lib/agents/vaultSteward.ts`
- chosen seam in this pass: Dream operational capsule writing moved behind `lib/agents/vaultSteward/maintenance-artifacts.ts`
- chosen seam in this pass: shared runtime helpers moved behind `lib/agents/vaultSteward/utils.ts`
- chosen seam in this pass: queue job identity, fallback seeding, dedupe, and executor-selection logic moved behind `lib/agents/vaultSteward/job-planning.ts`
- chosen seam in this pass: executor prompt guidance, prompt rendering, and executor JSON schema moved behind `lib/agents/vaultSteward/executor-prompting.ts`
- resulting file map:
  - `lib/agents/vaultSteward.ts`
  - `lib/agents/vaultSteward/prompting.ts`
  - `__tests__/lib/vaultSteward.prompting.test.ts`
  - `lib/agents/vaultSteward/lifecycle.ts`
  - `__tests__/lib/vaultSteward.lifecycle.test.ts`
  - `lib/agents/vaultSteward/reviewer.ts`
  - `__tests__/lib/vaultSteward.reviewer.test.ts`
  - `lib/agents/vaultSteward/foreman.ts`
  - `__tests__/lib/vaultSteward.foreman.test.ts`
  - `lib/agents/vaultSteward/executor.ts`
  - `__tests__/lib/vaultSteward.executor.test.ts`
  - `lib/agents/vaultSteward/scout.ts`
  - `__tests__/lib/vaultSteward.scout.test.ts`
  - `lib/agents/vaultSteward/maintenance-artifacts.ts`
  - `lib/agents/vaultSteward/utils.ts`
  - `lib/agents/vaultSteward/queue-planning.ts`
  - `lib/agents/vaultSteward/job-planning.ts`
  - `__tests__/lib/vaultSteward.job-planning.test.ts`
  - `lib/agents/vaultSteward/executor-prompting.ts`
  - `__tests__/lib/vaultSteward.executor-prompting.test.ts`
- public-surface contract for seam tests:
  - `buildVaultStewardCodexSupervisorPrompt`
  - `buildVaultStewardExecutorPrompt`
  - `startVaultSteward`
  - `stopVaultSteward`
  - `markVaultStewardHeartbeat`
  - `runVaultStewardCodexReviewer`
  - `runVaultStewardCodexForeman`
  - `runVaultStewardExecutorLane`
  - `runVaultStewardProviderScoutOnce`
- file-pressure evidence:
  - `lib/agents/vaultSteward.ts` moved from `1952` lines to `1354` lines in the prompt-law pass
  - `lib/agents/vaultSteward.ts` moved from `1354` lines to `1209` lines in the lifecycle pass
  - `lib/agents/vaultSteward.ts` moved from `1209` lines to `1128` lines in the reviewer-lane pass
  - `lib/agents/vaultSteward.ts` moved from `1128` lines to `849` lines in the foreman and executor pass
  - `lib/agents/vaultSteward.ts` moved from `849` lines to `607` lines in the provider-scout pass
  - `lib/agents/vaultSteward.ts` moved from `607` lines to `545` lines in the artifact/helper pass
  - cumulative reduction in this task so far: `1952` to `545`
  - `lib/agents/vaultSteward/queue-planning.ts` moved from `746` lines to `449` lines in the job-planning pass
  - `lib/agents/vaultSteward/job-planning.ts` now owns `294` lines of queue job-selection and dedupe logic
  - Vault Steward hard file-guardrail violations dropped from `8` to `7` in this pass because `queue-planning.ts` no longer reports as hard
  - `lib/agents/vaultSteward/prompting.ts` moved from `649` lines to `507` lines in the executor-prompt pass
  - `lib/agents/vaultSteward/executor-prompting.ts` now owns `145` lines of executor prompt-law logic
  - Vault Steward hard file-guardrail violations dropped from `7` to `6` in this pass because `prompting.ts` no longer reports as hard
  - Vault Steward no longer has any hard file-guardrail violations
- verification evidence on `2026-03-10`:
  - `npx vitest run __tests__/lib/vaultSteward.test.ts __tests__/lib/vaultSteward.prompting.test.ts __tests__/lib/vaultSteward.executor-prompting.test.ts __tests__/lib/vaultSteward.lifecycle.test.ts __tests__/lib/vaultSteward.reviewer.test.ts __tests__/lib/vaultSteward.foreman.test.ts __tests__/lib/vaultSteward.executor.test.ts __tests__/lib/vaultSteward.scout.test.ts __tests__/lib/vaultSteward.job-planning.test.ts __tests__/api/vault-steward.test.ts` passed
  - `npx eslint eslint.config.mjs app/api/agents/vault-steward/route.ts scripts/vault-steward.ts __tests__/api/vault-steward.test.ts __tests__/lib/vaultSteward.test.ts __tests__/lib/vaultSteward.prompting.test.ts __tests__/lib/vaultSteward.executor-prompting.test.ts __tests__/lib/vaultSteward.lifecycle.test.ts __tests__/lib/vaultSteward.reviewer.test.ts __tests__/lib/vaultSteward.foreman.test.ts __tests__/lib/vaultSteward.executor.test.ts __tests__/lib/vaultSteward.scout.test.ts __tests__/lib/vaultSteward.job-planning.test.ts lib/agents/vaultSteward.ts lib/agents/vaultSteward/prompting.ts lib/agents/vaultSteward/executor-prompting.ts lib/agents/vaultSteward/lifecycle.ts lib/agents/vaultSteward/reviewer.ts lib/agents/vaultSteward/foreman.ts lib/agents/vaultSteward/executor.ts lib/agents/vaultSteward/scout.ts lib/agents/vaultSteward/maintenance-artifacts.ts lib/agents/vaultSteward/utils.ts lib/agents/vaultSteward/queue-planning.ts lib/agents/vaultSteward/job-planning.ts` passed
  - `npm run audit:file-guardrails` passed
  - `npm run typecheck` passed
  - `npm run check:anchors:full` passed

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

Prompt law, daemon lifecycle, reviewer, foreman, executor, provider-scout, artifact writing, shared helper logic, queue job planning, and executor prompt law are now materially more bounded. `lib/agents/vaultSteward.ts` is `545` lines, `lib/agents/vaultSteward/queue-planning.ts` is `449` lines, and `lib/agents/vaultSteward/prompting.ts` is `507` lines, so the Vault Steward cluster no longer carries any hard file-guardrail violations. The next clean hot-queue move is outside this cluster. Do not reopen the extracted lanes unless their public contracts change again.
