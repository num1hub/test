# TODO-005 Symphony Contract Split

- Priority: `P2`
- Execution Band: `LATER`
- Status: `ACTIVE`
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

## Latest Pass

- Date: `2026-03-10`
- Chosen seam:
  - orchestrator runtime-state shaping extracted from `lib/symphony/orchestrator.ts`
- Outcome:
  - moved initial runtime-state construction, issue detail shaping, runtime snapshot shaping, and shared issue field helpers into `lib/symphony/orchestrator-state.ts`
  - reduced `lib/symphony/orchestrator.ts` from `687` lines to `584`
  - added dedicated seam coverage in `__tests__/symphony/orchestrator-state.test.ts`
  - kept `WORKFLOW.md` unchanged because the public workflow contract did not move in this pass
- Follow-up pass on `2026-03-10`:
  - chosen seam:
    - Linear-tracker normalization and payload parsing extracted from `lib/symphony/tracker.ts`
  - outcome:
    - moved Linear issue normalization, label/blocker parsing, timestamp/priority parsing, and JSON payload parsing into `lib/symphony/tracker-linear.ts`
    - reduced `lib/symphony/tracker.ts` from `633` lines to `539`
    - added dedicated seam coverage in `__tests__/symphony/tracker-linear.test.ts`
- Resulting file map:
  - `lib/symphony/orchestrator.ts`
  - `lib/symphony/orchestrator-state.ts`
  - `__tests__/symphony/orchestrator.test.ts`
  - `__tests__/symphony/orchestrator-state.test.ts`
  - `lib/symphony/tracker.ts`
  - `lib/symphony/tracker-linear.ts`
  - `__tests__/symphony/tracker.test.ts`
  - `__tests__/symphony/tracker-linear.test.ts`
- Verification:
  - `npx vitest run __tests__/symphony/*.test.ts` -> passed (`5 passed`, `12 passed`)
  - `npm run typecheck` -> passed
  - `wc -l lib/symphony/orchestrator.ts lib/symphony/orchestrator-state.ts` -> passed (`584`, `144`)
  - follow-up verification on `2026-03-10`:
    - `npx vitest run __tests__/symphony/*.test.ts` -> passed (`6 passed`, `14 passed`)
    - `npm run typecheck` -> passed
    - `wc -l lib/symphony/tracker.ts lib/symphony/tracker-linear.ts` -> passed (`539`, `100`)

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

The orchestrator and tracker files are now both below the hard file limit, and their extracted seams are explicit. The next clean Symphony seam is `lib/symphony/agentClient.ts` or a narrower Capsule Graph run-state persistence split inside `lib/symphony/tracker.ts`, not worker execution or workflow-law redesign. Treat `WORKFLOW.md` as a contract surface and keep future passes bounded to one Symphony seam at a time.

## Pass Update: 2026-03-10 agentClient notification seam

- Extracted Codex app-server notification parsing and event shaping into `lib/symphony/agentClient-events.ts`.
- Kept process launch, JSON-RPC transport, and server-request handling in `lib/symphony/agentClient.ts`.
- Added focused protocol coverage in `__tests__/symphony/agentClient-events.test.ts`.
- File-pressure result: `lib/symphony/agentClient.ts` moved to `430` lines; extracted module is `201` lines.
- Verification for this pass:
  - `npx vitest run __tests__/symphony/*.test.ts`
  - `npm run typecheck`
- Handoff:
  - `TODO-005` remains `ACTIVE`.
  - Next clean Symphony seam is soft-pressure reduction in `lib/symphony/orchestrator.ts` or `lib/symphony/tracker.ts`, not more `agentClient` protocol splitting.
