# TODO-005 Symphony Contract Split

- Priority: `P2`
- Execution Band: `LATER`
- Status: `READY`
- Owner Lane: `Symphony Contract Agent`
- Cluster: `#3 Symphony orchestration contracts`

## Goal

Separate Symphony workflow law, prompt rendering, tracker state, and execution logic into more bounded contracts.

## Why Now

Symphony already acts like an operating system inside N1Hub. It needs clearer seams before its runtime complexity grows further.

## Scope

- `lib/symphony/index.ts`
- `lib/symphony/prompt.ts`
- `lib/symphony/orchestrator.ts`
- `lib/symphony/tracker.ts`
- `scripts/symphony.ts`
- `WORKFLOW.md`
- `__tests__/symphony/*`

## Non-Goals

- no rewrite of the workflow model
- no opportunistic A2C or validator changes
- no style-only refactor

## Deliverables

- clearer role split across Symphony modules
- contract tests for new seams
- updated workflow docs if the public contract moved

## Context Snapshot

- Symphony already behaves like an orchestration runtime with workflow law, prompt rendering, tracker state, and execution logic
- the main risk is not lack of functionality but entanglement across those layers

## Dependencies

- soft: keep this behind the active Vault Steward cluster unless the operator prioritizes Symphony directly
- soft: preserve WORKFLOW.md as the public contract surface while splitting internals

## Source Signals

- WORKFLOW.md
- lib/symphony/orchestrator.ts
- lib/symphony/tracker.ts

## Entry Checklist

- inspect current workflow law before moving code
- identify one seam candidate before editing multiple Symphony modules
- confirm the tests or missing tests around the chosen seam

## Acceptance Criteria

- prompt rendering, tracker logic, and orchestration are less entangled
- Symphony tests pass
- workflow docs remain aligned with code

## Verification

- `npx vitest run __tests__/symphony/*.test.ts`
- `npm run typecheck`
- `npm test -- --run`

## Evidence and Artifacts

- update this packet with the seam chosen for the split
- update WORKFLOW.md only if the public contract really moved
- leave a clearer file-responsibility map for the next Symphony pass

## Risks

- workflow docs may drift if code moves first
- extraction may produce naming improvements without reducing coupling

## Stop Conditions

- the work starts touching multiple unrelated Symphony seams in one pass

## Queue Update Rule

- keep this task `ACTIVE` if one seam is extracted but the overall contract split remains partial
- mark it `BLOCKED` if workflow law and code disagree in a way that needs a new policy decision
- mark it `DONE` only when the chosen seam is clearly split, tested, and documented

## Handoff Note

Treat `WORKFLOW.md` as a contract surface. If the code and workflow law disagree, reconcile that explicitly instead of relying on private repo memory.
