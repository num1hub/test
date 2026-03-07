---
name: deepmine-generate
description: Use DeepMine-backed generation through AI Wallet providers when external reasoning, transformation, or synthesis is useful.
---

# DeepMine Generate

Use this skill when the task benefits from an external model call but the answer still needs to stay grounded in N1Hub reality.

## When To Use It

- Summarizing or transforming large local findings after you already inspected the repo.
- Comparing alternative formulations or naming choices.
- Generating a first-pass synthesis before validating it against capsules, routes, or tests.

## How To Use It In N1Hub

- Prefer the `deepmine_generate` internal tool when you are inside Symphony or N-Infinity.
- Prefer `POST /api/ai/generate` when you are operating through the N1Hub web/API layer.
- Let AI Wallet choose the enabled provider or explicitly select one when needed.

## Rules

- Do not send raw secrets, private keys, or irrelevant file dumps.
- Treat output as draft intelligence, not final truth.
- Reconcile all important claims against repo and capsule evidence before finalizing.
