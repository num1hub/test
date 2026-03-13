# N1 Feedback For Gemini Wave 01

Use this as the governing correction block for the next Gemini pass.

## Wave Verdict

- overall verdict: `APPROVE_WITH_COMPRESSION`
- reuse quality: `good but not approval-ready`
- best signal: `FZTM stage thresholds into Dream`
- main failure pattern: `insufficient evidence precision and over-broad claims about residue coverage`

## Approved Signal

### 1. FZTM Quantitative Thresholds

- source cluster: `SRC-01`
- target capsule: `capsule.project.from-zero-to-megabytes.v1@dream.json`
- branch: `Dream`
- N1 outcome: `APPROVE_AS_SIGNAL`
- rationale:
  The proposed FZTM stage ladder is the strongest migration candidate in the wave.
  It appears to add real structural value to the Dream version of the project capsule.
  Keep the work bounded to the explicit stage matrix and its operating implications.

### 2. Procedural Mining Rituals

- source cluster: `SRC-02`
- target capsule: `capsule.foundation.agent-skills-registry.v1@dream.json`
- branch: `Dream`
- N1 outcome: `APPROVE_WITH_COMPRESSION`
- rationale:
  This is plausible as procedural craft, but it is not yet proven strongly enough to mutate.
  The next wave must prove why these rituals belong in `agent-skills-registry` instead of `human-ai-symbiosis`, `planner`, or `tracker`.

## Rejected Or Compressed Material

### 1. Legacy Persona Claims

- outcome: `APPROVE_WITH_COMPRESSION`
- scope:
  - `MS_AI`
  - `N1_Bot`
- rationale:
  It is reasonable to treat these as legacy naming residue, but do not overstate closure.
  Keep only the narrow claim that they are superseded by stronger current architectural language.

### 2. Metaphor / Marketing Residue Claims

- outcome: `APPROVE_WITH_COMPRESSION`
- rationale:
  It is acceptable to classify large metaphor-heavy regions as likely low-value.
  But do not use broad phrases like "massive residue" unless the source slice is explicitly registered and measured.

### 3. Prompt Intent Mapping

- outcome: `REVISE_AND_RECHECK`
- target capsule:
  - `capsule.ai.prompt.v1@dream.json`
- rationale:
  The wave does not yet prove a real missing delta against the current prompt capsule.
  Do not carry this forward without a tighter comparison.

### 4. File Completion / Exhaustion Claims

- outcome: `REJECT_AS_NOISE`
- rationale:
  Do not claim that the file is fully processed, fully mapped, or ready for retirement after this wave.
  That is not yet supported by the evidence quality.

## Corrected Packet

- packet title: `FZTM Dream Stage Matrix`
- packet status: `accepted with correction`
- touch set:
  - `capsule.project.from-zero-to-megabytes.v1@dream.json`
- packet shape:
  - update only
  - no new capsules
  - no Real mutation
- allowed payload:
  - explicit stage names
  - explicit volumetric thresholds
  - explicit behavioral or capability transitions tied to those stages
- explicit non-goals:
  - no gamification badges
  - no XP systems
  - no legacy `MS_AI` terminology
  - no broad marketing framing
  - no reopening Real status questions in this packet

## Prompt Update Need

Update the next Gemini wave behavior using these corrections:

1. if you mention a capsule state, read `metadata.status` from the supplied branch JSON
2. do not talk about a twin capsule as if only one branch exists
3. do not say "weakly represented" unless you name the exact missing proposition or boundary
4. do not say the file is fully processed without explicit whole-body coverage registration
5. use narrower source slices and tighter evidence anchors in the next wave

## Next Wave

- next wave label: `wave-02-rituals-vs-skills`
- next source focus:
  only the ritual / cadence / review-loop portions of `data.txt`
- next capsule families:
  - `capsule.foundation.agent-skills-registry.v1`
  - `capsule.foundation.agent-skills-registry.v1@dream.json`
  - `capsule.foundation.human-ai-symbiosis.v1`
  - `capsule.foundation.human-ai-symbiosis.v1@dream.json`
  - optionally `planner` and `tracker` if the source slice clearly points there
- exact question for Gemini:
  "Which exact procedural loops from the source belong in Skills rather than Symbiosis, Planner, or Tracker, and what exact missing proposition do they add?"
- mandatory output corrections for next wave:
  - state whether line references are file-global or raw-body-relative
  - use stable semantic slice markers if exact lines are unavailable
  - distinguish `Real` from `Dream` explicitly
  - use `NO_ACTION_ALREADY_COVERED` where appropriate
  - propose one bounded packet only
