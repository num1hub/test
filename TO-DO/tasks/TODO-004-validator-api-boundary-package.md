# TODO-004 Validator/API Boundary Package

- Priority: `P2`
- Execution Band: `LATER`
- Status: `DONE`
- Owner Lane: `Validator Boundary Agent`
- Cluster: `#2 Validator/API boundary package`

## Goal

Harden parity between validator engine, API routes, CLI behavior, and OpenAPI output.

## Why Now

Validator law is a core repo boundary. If CLI, API, docs, and gates drift, the entire capsule system loses trust.

## Scope

- `lib/validator/*`
- `app/api/validate/*`
- `scripts/validate-cli.ts`
- `scripts/generate-validate-openapi.ts`
- `docs/validator.md`
- `docs/openapi/validate.openapi.json`

## Non-Goals

- no mass edits across `data/capsules`
- no speculative new gate model
- no UI redesign work

## Deliverables

- tighter CLI/API parity
- refreshed OpenAPI if route contracts changed
- improved boundary tests
- explicit documentation of any intentional differences

## Context Snapshot

- validator is one of the main repo-owned public boundaries and already governs capsule admissibility
- drift between CLI, API, and OpenAPI weakens the main trust surface for the vault

## Dependencies

- soft: keep this task behind the hotter branch and A2C fronts unless the operator overrides
- soft: align with current validator docs and route contracts before changing internals

## Source Signals

- docs/validator.md
- app/api/validate/*
- scripts/generate-validate-openapi.ts

## Entry Checklist

- compare current CLI behavior and API behavior from the public contract outward
- inspect the generated OpenAPI before changing route or engine behavior
- decide which public contract is canonical if drift is found

## Acceptance Criteria

- route behavior and CLI behavior are coherent
- OpenAPI matches the live validator contract
- validator tests and API tests both pass

## Verification

- `npm run validate -- --dir data/capsules --strict --report`
- `npm run docs:openapi`
- `npm test -- --run`
- `npm run typecheck`

## Evidence and Artifacts

- update this packet with the canonical contract decision if CLI and API diverge
- refresh docs or OpenAPI artifacts when the public validator contract changes
- record any intentional parity exceptions explicitly instead of leaving them implicit

## Canonical Contract Decision

- API canonical single-capsule contract:
  - `POST /api/validate` uses the `{ capsule, options?, autoFix? }` envelope as the documented public request shape
  - raw capsule-body submission remains backward-compatible route behavior, but it is compatibility mode rather than the canonical documented contract
- CLI/API parity rule:
  - local CLI mode and API mode share the same validator engine
  - remote CLI mode delegates only single-capsule validation to `POST /api/validate`
  - `--fix`, `--report`, and local file mutation/watch behavior remain CLI-only surfaces and are intentionally not mirrored by the remote API contract
- owner-role boundary rule:
  - `POST /api/validate/batch` and `POST /api/validate/fix` are explicit owner-role API surfaces

## Latest Pass

- Date: `2026-03-10`
- Outcome:
  - refreshed the validator OpenAPI generator so the generated spec matches live route behavior more closely
  - documented the canonical request envelope for `POST /api/validate`
  - documented the intentional CLI parity exception for local-only `--fix`, `--report`, and watch behavior
  - added validator API coverage for batch success, fix role enforcement, fix response shape, and stats `limit` forwarding
- Verification:
  - `npm run docs:openapi` -> passed and regenerated `docs/openapi/validate.openapi.json`
  - `npx vitest run __tests__/validator/api.test.ts __tests__/scripts/validateCli.test.ts` -> passed (`2 passed`, `13 passed`)
  - `npm run validate -- --dir data/capsules --strict --report` -> passed (`192 passed`, `0 failed`, `0 warnings`); report written to `reports/validation-2026-03-10T12-02-27-960Z.md`
  - `npm run typecheck` -> passed

## Risks

- OpenAPI generation may expose undocumented route drift
- route and CLI assumptions may diverge in edge cases

## Stop Conditions

- parity cannot be improved without a broader validator-contract decision first

## Queue Update Rule

- keep this task `ACTIVE` if the canonical contract is clear but parity work is still partial
- mark it `BLOCKED` if route, CLI, and docs disagree in a way that needs a higher-level policy call
- mark it `DONE` only when CLI, API, OpenAPI, and docs are coherent or their differences are explicitly documented

## Handoff Note

The validator boundary is now explicit enough that further work should be follow-up hardening rather than contract archaeology. Reopen this packet only if route behavior, CLI delegation, or generated OpenAPI drift again.
