---
name: adversarial-review
description: Run a cross-model adversarial review lane that challenges recent work from an opposite-model reviewer and returns a synthesized verdict without making edits.
---

# Adversarial Review

Use this skill after non-trivial code, docs, or governance changes when N1Hub needs a second hostile-but-useful pass from an opposite-model reviewer.

The point is not “more comments.” The point is to force a different reasoning engine to attack the work from another angle before humans trust it.

## Hard Constraint

The reviewer must run on the opposite model lane through an external CLI boundary.

- If the active implementation lane is Codex, the reviewer should run through `claude -p` or another approved Claude CLI boundary.
- If the active implementation lane is Claude, the reviewer should run through `codex exec` or another approved Codex CLI boundary.

Do not use same-model subagents as the adversarial reviewer. That is not adversarial review. That is self-review with extra steps.

If the opposite-model CLI is unavailable, stop and report the block explicitly. Do not fake a review on the same model.

## Read Order

1. `README.md`
2. `AGENTS.md`
3. `CODEX.md`
4. `CONTEXT.md`
5. `MEMORY.md`
6. `TO-DO/AGENT_OPERATING_MODES.md`
7. `TO-DO/EXECUTION_PROTOCOL.md`
8. the active task packet, plan, diff, or changed-file set

## Review Triggers

Use this skill when at least one of these is true:

- the change crosses multiple files or domains
- the change touches runtime contracts, validators, or governance surfaces
- the change is hard to reason about from one model alone
- the operator asks for a hostile second pass before considering the work done

## Reviewer Count

- Small change: 1 reviewer lens
  Less than `50` changed lines and `1-2` files
- Medium change: 2 reviewer lenses
  About `50-200` changed lines or `3-5` files
- Large change: 3 reviewer lenses
  More than `200` changed lines or more than `5` files

## Lenses

- `Skeptic`
  Hunt for concrete breakage, hidden assumptions, and false confidence.
- `Architect`
  Hunt for boundary violations, long-term maintenance risk, and drift from repo law.
- `Minimalist`
  Hunt for unnecessary complexity, excess churn, and changes that do too much.

## Default Loop

1. State the exact intent of the work under review.
2. Determine review size and choose the reviewer lenses.
3. Spawn opposite-model reviewers through the external CLI boundary.
4. Require proof that each reviewer actually ran:
   - output file path
   - command used
   - non-empty review artifact
5. Read all reviewer outputs.
6. Deduplicate overlapping findings.
7. Synthesize one verdict with severity ordering.
8. Apply lead judgment and reject false positives instead of blindly obeying every reviewer.

## Output Contract

Return one review document with these sections:

1. `Intent`
2. `Reviewer Setup`
   - active model lane
   - opposite reviewer CLI used
   - reviewer output paths
3. `Verdict`
   - `PASS`
   - `CONTESTED`
   - `REJECT`
4. `Findings`
   - numbered by severity
   - concrete file references
   - concrete failure scenario
   - lens name
   - recommended action
5. `What Went Well`
6. `Lead Judgment`
   - which findings are accepted
   - which findings are rejected as overreach or false positives

## Rules

- Do not edit the code in the reviewer lane.
- Do not mark the review complete without proof that the opposite-model process actually ran.
- Do not promote style nits above real correctness, contract, or blast-radius issues.
- Do not let the review become vague philosophy; every serious finding should map to a concrete repo surface.
- If the review is blocked because the opposite-model CLI is unavailable, say so explicitly and leave a machine-readable or task-readable blocker.
