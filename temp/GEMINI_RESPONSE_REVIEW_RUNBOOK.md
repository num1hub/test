# N1 Review Runbook for Gemini Migration Responses

This file defines how N1Hub should receive, review, compress, approve, reject, and carry forward Gemini responses generated from:

- `temp/GEMINI_N1_SYSTEM_INSTRUCTIONS.md`
- `temp/GEMINI_N1_DEEPMINE_PROMPT.md`

The purpose is continuity.
Gemini produces a wave response.
The operator brings that response back into N1Hub.
N1 then evaluates it as candidate migration intelligence, not as automatic truth.

This file exists so each wave can be reviewed quickly and consistently.

## 1. Operating Principle

Gemini output is:

- candidate extraction intelligence,
- candidate migration planning,
- candidate capsule delta,
- and candidate discard reasoning.

Gemini output is **not** automatically:

- canonical capsule truth,
- approved branch placement,
- approved mutation plan,
- final capsule JSON,
- or final doctrine.

N1 review is mandatory.

## 2. What The Operator Should Bring Back

For best review quality, bring back:

1. Gemini full answer for the wave
2. the active `data.txt` slice or line range used
3. any files or capsule families you gave Gemini
4. the exact wave label, if Gemini included one

If `data.txt` used raw-content sentinels:

- `=== BEGIN RAW ===`
- `=== END RAW ===`

also preserve whether Gemini's line references are:

- file-global,
- or raw-body-relative.

If possible, paste Gemini output as one fenced block or attach it as a temporary file under `temp/`.

Recommended naming:

- `temp/gemini-wave-01-response.md`
- `temp/gemini-wave-02-response.md`

For the cleanest intake, use:

- [GEMINI_WAVE_INTAKE_TEMPLATE.md](/home/n1/n1hub.com/temp/GEMINI_WAVE_INTAKE_TEMPLATE.md)

## 3. Minimum Acceptable Gemini Response Shape

A wave response is easiest to review if it contains:

- `Wave Scope`
- `Corpus Coverage Map`
- `Data.txt Theme Map`
- `Migration Delta Ledger`
- `Existing Capsule Mapping`
- `New Capsule Candidates`
- `Discard Ledger`
- `Proposed Migration Packet`
- `Open Questions`
- `Continuation Handoff Block`

If Gemini omits some sections, N1 can still review it, but confidence and reuse quality go down.

## 4. N1 Review Outcomes

Every material Gemini item should be classified into one of these review outcomes:

- `APPROVE_AS_SIGNAL`
  The item is worth preserving for further capsule work.
- `APPROVE_WITH_COMPRESSION`
  The item is useful, but too verbose, too duplicated, or too weakly phrased; preserve the core only.
- `REVISE_AND_RECHECK`
  The item may be useful but needs sharper mapping, branch placement, or evidence.
- `DEFER_FOR_MORE_CORPUS`
  The item may matter, but the current wave cannot prove enough.
- `REJECT_AS_DUPLICATE`
  The corpus already covers it strongly.
- `REJECT_AS_NOISE`
  Marketing residue, weak rhetoric, or low-value carryover.
- `REVIEW_GATED_SENSITIVE`
  The item touches protected surfaces or high-risk doctrine.

These outcomes are stricter than Gemini's own wording.
N1 is the reviewer of consequence, not a passive recorder.

## 5. N1 Review Checklist

For each serious Gemini item, N1 should test:

1. Is the source slice explicit?
2. Is the line reference convention explicit?
3. Is the source cluster identifiable?
4. Is the claimed corpus gap real, or merely stylistic?
5. Is the target capsule/family plausible?
6. Is the branch placement lawful?
7. Is the item truly durable?
8. Is the language stronger than the current corpus, or just different?
9. Does it belong in:
   - existing capsule,
   - new capsule,
   - archive,
   - or nowhere?
10. Does it touch a protected surface?
11. Is it the right next packet, or should it be deferred?

## 6. N1 Compression Rule

Gemini may over-explain.
N1 should compress without losing meaning.

Compression targets:

- repeated justification
- duplicate theme labels
- overlong rationale
- speculative capsule candidates
- redundant restatement of already-covered themes

Preserve:

- the actual missing value
- the lawful target branch
- the best capsule mapping
- the real uncertainty
- the next bounded packet

## 7. Review Output Format To Use In Chat

When the operator pastes a Gemini answer back into N1Hub, N1 should respond in this structure:

### A. Wave Verdict

- wave label
- overall quality
- whether the wave is reusable

### B. Approved Signal

List items worth carrying forward.

For each:

- source cluster ID
- short name
- target capsule/family
- branch
- N1 outcome
- short rationale

### C. Rejected or Compressed Material

List:

- duplicates
- noise
- weak phrasing
- overclaims
- already-covered items

### D. Packet Decision

State:

- whether Gemini's proposed packet is accepted
- if not, what the corrected N1 packet is
- explicit non-goals

### E. Prompt Update Need

State whether the Gemini prompt/system needs updating before the next wave.

### F. Next Wave

- next source slice
- next capsule families
- carry-forward notes

## 8. Storage Rule

If a Gemini response contains genuinely useful migration intelligence, preserve it in one of these forms:

- temporary review note in `temp/`
- compressed review memo
- direct translation into a new packet/task
- or direct capsule work if N1 explicitly approves execution

Do not preserve giant raw Gemini prose unless it still carries unresolved value.

## 9. Prompt Maintenance Rule

After each Gemini wave, N1 should decide whether the prompt or system instruction needs adjustment.

Typical reasons to update the prompt:

- Gemini keeps over-summarizing
- Gemini misses branch placement
- Gemini proposes too many speculative capsules
- Gemini quotes too much source
- Gemini fails to distinguish `NO_ACTION_ALREADY_COVERED`
- Gemini ignores protected-surface caution
- Gemini produces weak continuation handoff blocks

If none of those happened, leave the prompt stable.
Do not churn the prompt just to feel active.

## 9A. Known Gemini Failure Patterns

From observed waves, N1 should watch especially for:

- claiming a capsule is `archived` or `active` without actually reading `metadata.status`,
- talking about one branch as if the twin branch does not exist,
- calling a theme "weakly represented" without naming the exact missing proposition,
- declaring the file "fully processed" after only one broad wave,
- using percentages like "80% obsolete" without measured cluster coverage,
- over-promoting elegant historical language that the live corpus already expresses more strongly,
- and proposing closure before the raw body has been registered with enough granularity.

If one of these appears, default toward:

- `REVISE_AND_RECHECK`
- or `APPROVE_WITH_COMPRESSION`

Also watch for these newer failure patterns:

- mixing `procedure`, `schedule`, and `posture` as if they were one migration class,
- proposing one packet that spans `skills + prompt` or `planner + symbiosis` without an exact cross-family proposition,
- calling a target family "thin" without naming the exact missing playbook, taxonomy, ritual, or mechanism,
- and letting elegant interaction examples drift into `prompt` law when the actual durable value is procedural skill structure.

rather than full approval.

## 10. Fast Review Heuristic

If time is short, N1 should still answer these four questions:

1. What did Gemini correctly notice that the corpus still needs?
2. What did Gemini incorrectly treat as missing?
3. What is the one best next packet?
4. What should the next wave read next?
5. What exact missing proposition, if any, was actually proven?

## 11. Protected Surface Rule During Review

If Gemini points toward:

- `capsuleos*`
- validator law
- constitutional surfaces
- 16-gates
- branch trust boundaries

N1 must not auto-approve mutation.
Those items should be explicitly marked `REVIEW_GATED_SENSITIVE` unless lawful authority is already clear.

## 12. Ready State

N1 is considered ready to receive a Gemini wave when:

- the two Gemini control files in `temp/` are current,
- this runbook exists,
- the operator knows which wave is being reviewed,
- and Gemini output can be pasted or attached.

At that point, the next action is simple:

1. operator runs Gemini
2. operator brings back Gemini output
3. N1 reviews, compresses, and decides
4. N1 updates prompt only if needed
5. next wave begins
