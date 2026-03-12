# TODO-036 Planning vs Execution Branch Guardrails

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `READY`
- Owner Lane: `Planning Guardrail Agent`
- Cluster: `Branch / validation / execution discipline`

## Goal

Enforce the difference between Dream planning and Real execution so capsule-native control-plane objects cannot blur speculative design with accepted delivery.

## Why Now

`TODO-012` made the branch posture explicit at the design level. The next bounded step is to turn that rule into concrete guardrails for planning, promotion, and execution surfaces.

## Scope

- `docs/real-dream-diff.md`
- `lib/diff/*`
- `lib/validator/*`
- `lib/a2c/*`
- relevant promote or merge routes under `app/api/*`

## Non-Goals

- no new branch model
- no repo-wide validator redesign
- no broad constitutional rewrite of already-contained Real/Dream doctrine

## Deliverables

- one explicit rule set for when planning objects belong in Dream and when execution objects belong in Real
- one bounded enforcement or warning path in the relevant runtime surfaces
- one clear promotion rule for approved task and delegation objects

## Dependencies

- hard: `TODO-012`
- soft: `TODO-034`

## Entry Checklist

- keep the current Real/Dream overlay model intact
- prefer the smallest enforceable rule over broad doctrine prose
- distinguish warning, rejection, and review-required cases explicitly

## Implementation Plan

1. Map the branch posture rules onto real runtime seams.
2. Choose the narrowest guardrail that prevents the worst confusion.
3. Update docs and runtime checks together.

## Acceptance Criteria

- Dream planning cannot silently masquerade as Real execution
- the enforcement path is explicit and reviewable
- the packet does not reopen already-contained branch doctrine work

## Verification

- `npm run typecheck`
- targeted diff or promotion checks chosen by the implementation
- manual cross-check against `TO-DO/CAPSULE_NATIVE_EXECUTION.md`

## Risks

- weak warnings that do not actually prevent drift
- over-enforcement that blocks legitimate review or promotion work

## Stop Conditions

- the task starts redefining the branch model itself
- the enforcement path requires a new core CapsuleOS law decision

## Handoff Note

Turn the branch posture from architecture language into one real guardrail at a real runtime seam.
