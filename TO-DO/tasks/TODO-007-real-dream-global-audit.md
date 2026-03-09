# TODO-007 Real Dream Global Audit

- Priority: `P0`
- Execution Band: `NOW`
- Status: `DONE`
- Owner Lane: `Branch Audit Agent`
- Cluster: `Real/Dream governance`

## Goal

Freeze the current Real/Dream field into one deterministic audit so future agents stop reasoning from branch folklore. The audit must quantify paired overlays, dream-only outliers, real-only gaps, and the highest-drift capsule hubs.

## Why Now

`data/capsules` is already near-parity between Real and Dream. Without one shared audit, agents will keep touching overlays opportunistically and will miss where Dream is actually fighting live system law.

## Scope

- `data/capsules/*`
- `docs/real-dream-diff.md`
- `lib/diff/branch-manager.ts`
- `lib/diff/diff-engine.ts`
- `scripts/curate-vault-real-dream.ts`
- `app/api/diff/route.ts`
- `app/api/branches/route.ts`

## Non-Goals

- no mass promotion of Dream into Real
- no broad editorial rewrite of capsule content
- no new branch families beyond the current Real/Dream lane

## Deliverables

- one repo-native Real/Dream audit report with exact counts and hotspot ranking
- classification of every outlier into `paired`, `dream-only`, or `real-only`
- ranked list of the highest-drift paired hubs
- recommended execution order for the next Real/Dream tasks

## Context Snapshot

- live corpus facts: `192` real, `186` dream, `183` paired, `9` real-only, `3` dream-only
- the only dream-only outliers are Vault Steward operational capsules
- the measured hub drift front is led by `background-agent-runtime`, `personal-ai-assistant`, `workspace`, `vault-stewardship-swarm`, and `key-agents`
- hub ranking was reproduced from live diff payloads using `modifiedPaths`, `linkChanges`, `semanticEvents`, and `actionPlanTasks`, not from prose-only judgement

## Dependencies

- hard: live capsule corpus must still reproduce the current Real/Dream census
- output: this task should emit the trusted field brief that TODO-008, TODO-009, and TODO-010 consume

## Source Signals

- TO-DO/REAL_DREAM_FRONT.md
- scripts/curate-vault-real-dream.ts --dry-run

## Entry Checklist

- read `TO-DO/REAL_DREAM_FRONT.md` and confirm the current corpus facts before touching the queue
- inspect `docs/real-dream-diff.md`, `scripts/curate-vault-real-dream.ts`, and the diff tests so the audit stays tied to live runtime behavior
- confirm whether any newer capsule census has already changed the `192 / 186 / 183 / 9 / 3` picture

## Implementation Plan

1. Reproduce the current corpus counts from live files.
2. Rank paired hub overlays by measured diff pressure instead of intuition lists.
3. Write the verified census and hotspot ranking into repo-native branch docs.
4. Update queue truth so the next unfinished `P0` item becomes the real frontier.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/capsule-graph-snapshot/SKILL.md`

## System Prompt Slice

```text
You are the Branch Audit Agent. Measure the live Real/Dream field, classify outliers, rank drift hotspots, and write one deterministic audit that future agents can use as shared branch reality.
```

## Operator Command Pack

- `Take TODO-007 and freeze the Real/Dream field into one deterministic audit.`
- `Act as TO-DO Executor on the Real/Dream audit. Reproduce the live counts, rank hotspots, and write the field brief.`

## Acceptance Criteria

- the audit reproduces the live corpus facts: `192` real, `186` dream, `183` paired, `9` real-only, `3` dream-only
- the three dream-only Vault Steward IDs are called out explicitly
- the nine real-only engineering law capsules are called out explicitly
- the audit names the top high-drift hubs and ties them to specific follow-up work

## Verification

- `npm run validate -- --dir data/capsules --strict --report`
- `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
- `npx vitest run __tests__/lib/diff/*.test.ts __tests__/api/diff.test.ts __tests__/api/diff-apply.test.ts __tests__/api/branches.test.ts`

## Evidence and Artifacts

- update `TO-DO/REAL_DREAM_FRONT.md` if the verified field facts or hotspot ranking changed
- update this task packet with fresh `Context Snapshot`, `Risks`, and `Handoff Note`
- update `TO-DO/HOT_QUEUE.md` if the audit changes the order of the next branch tasks
- refresh teamwork artifacts under `data/private/agents/n1/` when the current host lane supports them

## Risks

- agents may confuse raw textual divergence with architectural priority
- an audit without explicit follow-up tasks may become a dead report
- `TODO-008` still carries a pre-audit candidate hub set and should refresh its target list from the measured ranking before deep triage

## Stop Conditions

- the corpus counts do not reproduce from live files
- the task starts drifting into promotion decisions instead of audit truth

## Queue Update Rule

- if counts are verified but hotspot ranking or handoff still needs more work, mark this task `ACTIVE`
- if the live corpus facts do not reproduce, mark this task `BLOCKED` with the exact mismatch and the command that exposed it
- if the audit and next-step ranking are complete, mark this task `DONE` and keep `TODO-008` at the top of the remaining branch wave

## Handoff Note

The field census is now frozen at `192 / 186 / 183 / 9 / 3` in `TO-DO/REAL_DREAM_FRONT.md` and `docs/real-dream-diff.md`.
The next pass should open `TODO-008`, refresh its hub target set from the measured top drift list, and then classify those hubs into `promote`, `retain-dream`, or `rewrite` without rerunning the full census first.
