# Prompt Redesign Protocol (Anything-to-Capsules)

## Purpose

Convert user-provided draft prompts into production-grade prompts for the `Anything-to-Capsules` agent.
This is a meta-engineering mode for improving system instructions, operation prompts, and skill-level protocols.

## When to Use

Activate this protocol when user intent is:

- "переработай промпт",
- "улучши системную инструкцию",
- "сделай глубокую адаптацию под Anything-to-Capsules",
- "сделай prompt engineering аудит и rewrite".

If user asks for ingestion execution only, do not run this protocol.

## Core Principle

Treat prompt redesign as an engineering task:

`Diagnose -> Redesign -> Self-Critique -> Integrate`

Do not produce cosmetic rewrites. Produce operationally stronger prompts.

## Phase 1: Diagnose

Score the input prompt on 1-5 for each dimension and list concrete weaknesses:

1. Clarity
2. Specificity
3. Reasoning Structure
4. Context Sufficiency
5. Edge Case Handling
6. Role & Expertise Framing
7. Evaluation Criteria
8. CapsuleOS Contract Alignment
9. Operational Safety (non-destructive, local-first, PII hygiene)
10. Determinism & Auditability

## Phase 2: Redesign

Rebuild the prompt from scratch with these required blocks:

1. Role (Anything-to-Capsules specific)
2. Objective
3. Input Contract
4. Reasoning Protocol (deep-first)
5. Decision Protocol (create/update/dedup/conflict/synthesis)
6. Constraints & Guardrails
7. Quality Gate
8. Output Contract

Mandatory inclusions:

- local-first context,
- repo-native capsule contract awareness (`recursive_layer` by default, legacy alternate contract only when explicitly requested),
- selective synthesis gate,
- no hallucinated facts,
- no destructive actions,
- deterministic outputs where possible.

## Phase 3: Self-Critique and Refine

After redesign:

1. Re-score all dimensions.
2. Identify weakest dimension.
3. Revise specifically for that weakness.
4. Run one more critique lens:
   - "Would a literal-minded model misread this?"
5. Apply final tightening pass.

## Integration Step (Skill-Aware)

If user asks integration into skill artifacts:

1. Update `SKILL.md` mode/intent mapping.
2. Update `references/prompt-pack.md` with reusable template.
3. Update related reference contracts only if needed.
4. Keep compatibility with existing workflow and guardrails.

## Output Format

Return in this structure:

1. `Diagnostic Summary` (table: dimension, original score, redesigned score, key fix)
2. `Redesigned Prompt` (copy-paste ready)
3. `Changelog` (high-impact changes and why they matter)
4. `Integration Notes` (where this prompt fits in Anything-to-Capsules workflow)

## Constraints

Never:

- keep weak structure "as is",
- produce shallow generic rewrites,
- drop critical constraints from the original without explicit reason,
- introduce instructions that conflict with CapsuleOS contracts.

Always:

- use user language for visible output,
- keep recommendations concrete,
- preserve non-conflicting useful intent from source prompt.
