# TODO-013 Cross-Model Adversarial Review Lane

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `BLOCKED`
- Owner Lane: `Review Systems Agent`
- Cluster: `Engineering quality`

## Goal

Introduce a repo-native adversarial review lane for N1Hub where post-change review is performed by the opposite model family through an external CLI boundary. The result should be a synthesized verdict, not silent same-model self-congratulation.

## Why Now

N1Hub is already moving toward more autonomous coding lanes. That increases throughput, but it also increases the chance that one model keeps missing the same class of mistakes. Cross-model adversarial review is one of the highest-leverage quality upgrades available before broader always-on autonomy.

## Scope

- `skills/adversarial-review/SKILL.md`
- `TO-DO/AUTOMATED_UPDATE_WORKFLOW.md`
- `TO-DO/AGENT_OPERATING_MODES.md`
- `scripts/n1-automated-update.ts`
- `lib/agents/n1/automated-update.ts`
- `docs/agents-operations.md`
- `__tests__/agents/*`

## Non-Goals

- no fake same-model reviewer masquerading as adversarial review
- no broad PR bot platform buildout in this task
- no automatic code edits by the reviewer lane

## Deliverables

- one repo-native adversarial-review skill
- explicit launch contract for opposite-model reviewer invocation
- proof contract for reviewer execution artifacts
- verdict format with severity, lens, and lead judgment
- bounded tests for reviewer-lane selection and blocked-state handling where practical

## Context Snapshot

- the opposite-model review idea is high-signal for N1Hub because current autonomous throughput is rising faster than structured review capacity
- the live N1 host already has a one-step iteration entrypoint through `./autoupdate`
- reviewer integrity matters more than reviewer theatrics; if the opposite CLI is unavailable, the lane must fail honestly

## Source Signals

- external adversarial-review patterns are worth adopting only in a clean-room, repo-native form
- same-model fallback is the main anti-pattern to avoid
- review value comes from hostile second-pass reasoning, not from additional polite summaries

## Dependencies

- soft: keep the review lane aligned with the current N1 automated update and orchestration surfaces
- hard: if opposite-model execution cannot be proven on the current host, this task must fail honestly into BLOCKED

## Entry Checklist

- inspect the current N1 automated-update flow and teamwork artifacts
- confirm which opposite-model CLI boundaries are realistically available in the target host
- confirm how review results should be stored without pretending they are implementation artifacts

## Implementation Plan

1. Define the cross-model review contract and proof requirements.
2. Add the repo-native adversarial-review skill and lane semantics.
3. Wire a bounded invocation path into the N1 workflow or a sibling review command.
4. Add tests or blocked-state handling that prove same-model fallback is not allowed.

## Mode and Skill

- Primary mode: `TO-DO Executor`
- Optional skill: `skills/adversarial-review/SKILL.md`

## System Prompt Slice

```text
You are the Review Systems Agent. Build a cross-model adversarial review lane for N1Hub that requires an opposite-model external reviewer, records proof of execution, and returns a synthesized verdict without making code changes.
```

## Operator Command Pack

- `Take TODO-013 and build the cross-model adversarial review lane for N1Hub.`
- `Work as Review Systems Agent and wire opposite-model review into the N1 workflow without allowing same-model fallback.`

## Acceptance Criteria

- same-model subagent review is explicitly disallowed for this lane
- opposite-model reviewer invocation is part of the contract, not an optional note
- reviewer output requires proof artifacts or explicit blocked-state reporting
- the final verdict format is deterministic and repo-native

## Verification

- `npx vitest run __tests__/agents/*.test.ts`
- `npm run typecheck`
- `npm run check:anchors:full`

## Evidence and Artifacts

- update the relevant skill, workflow, and task packet surfaces
- leave a clear example of review artifact or blocked-state artifact location
- update teamwork or command surfaces if the review lane changes how N1 operates

## Latest Pass

- Date: `2026-03-10`
- Outcome:
  - inspected the host for an opposite-model external CLI boundary
  - confirmed the current host exposes `codex` only
  - did not implement a fake same-model adversarial-review lane
  - moved this packet to `BLOCKED` because the hard stop condition is real on this machine
- Verification:
  - `for bin in claude codex gemini opencode aider; do if command -v "$bin" >/dev/null 2>&1; then printf "%s %s\n" "$bin" "$(command -v "$bin")"; fi; done` -> passed and reported only `codex /home/n1/.nvm/versions/node/v24.14.0/bin/codex`
  - `rg -n "adversarial-review|opposite-model|Claude|Gemini|Codex|opencode|review lane|reviewer" skills TO-DO docs lib scripts --glob '!node_modules'` -> confirmed task intent and repo references, but did not surface a second installed opposite-model CLI contract
  - blocker: same-model fallback is explicitly disallowed by this packet, so `codex` alone is insufficient proof

## Risks

- opposite-model CLI availability may vary by host
- review lanes can become noisy if they over-index on style instead of concrete risk

## Stop Conditions

- the implementation can only work by using same-model reviewers
- the environment cannot prove an opposite-model invocation path

## Queue Update Rule

- keep the task `ACTIVE` if the skill exists but the invocation path still needs proof discipline
- mark it `BLOCKED` if opposite-model execution is impossible on the current host
- mark it `DONE` only when the review contract, proof rules, and output format are all explicit and verified

## Handoff Note

This task is blocked on host capability, not repo structure. Resume when the current machine can prove an opposite-model external reviewer CLI such as a non-Codex model family. Do not unblock it by wrapping `codex` in a second prompt or by using same-model subagents.
