# TODO-006 File Guardrails Changed-Files Gate

- Priority: `P2`
- Execution Band: `LATER`
- Status: `READY`
- Owner Lane: `Architecture Steward Agent`
- Cluster: `architecture enforcement`

## Goal

Turn file guardrails into a changed-files CI gate so new debt is blocked without exploding on historical debt.

## Why Now

The repo already has file guardrail auditing, but it is not yet the kind of selective gate that teams can enforce safely during active cleanup.

## Scope

- `scripts/check-file-guardrails.ts`
- `package.json`
- `.github/workflows/*`
- `docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md`
- `AGENTS.md`
- `CODEX.md`

## Non-Goals

- no full-history hard fail on existing debt
- no blanket waivers without documentation
- no unrelated CI cleanup

## Deliverables

- changed-files guardrail mode
- documented waiver mechanism
- CI integration plan or implementation
- docs updated to reflect the true enforcement model

## Context Snapshot

- the repo already has file guardrail auditing, but enforcement still needs a changed-files posture that teams can actually live with
- the wrong gate turns red everywhere and gets ignored; the right gate blocks only new debt

## Dependencies

- soft: this should follow the hotter runtime and branch fronts unless architecture enforcement becomes urgent
- soft: keep docs, CI, and command surfaces aligned in one pass

## Source Signals

- scripts/check-file-guardrails.ts
- docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md
- current package guardrail commands

## Entry Checklist

- inspect how the current audit behaves on the live repo
- identify which changed-files signal can be enforced without exploding on historical debt
- decide how waivers are recorded before wiring CI

## Acceptance Criteria

- newly changed oversized files fail or require an explicit waiver
- existing untouched debt does not block the whole repo
- docs and CI say the same thing

## Verification

- `npm run audit:file-guardrails`
- `npm run check:file-guardrails:hard`
- relevant CI workflow dry-run or targeted validation
- `npm run check:anchors:full`

## Evidence and Artifacts

- update docs and command surfaces together if enforcement posture changes
- record the waiver path explicitly if waivers are introduced
- update this packet with the real changed-files rule that was chosen

## Risks

- a naive gate may instantly redline the repo and be ignored
- waiver logic may become a loophole if not documented tightly

## Stop Conditions

- the changed-files policy cannot be expressed without effectively enforcing full-history debt
- waiver logic becomes the main mechanism instead of the exception path

## Queue Update Rule

- keep this task `ACTIVE` if the enforcement model is chosen but CI or docs still lag behind
- mark it `BLOCKED` if safe changed-files enforcement cannot be expressed yet
- mark it `DONE` only when enforcement, waiver discipline, and docs are explicit and aligned

## Handoff Note

The point is not punishment. The point is to stop adding new architecture debt while historical debt is burned down deliberately.
