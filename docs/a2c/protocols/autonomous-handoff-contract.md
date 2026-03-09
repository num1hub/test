# Autonomous Handoff Contract

## Purpose

Fix the operating boundary between user and agent for Anything-to-Capsules.

User intent:

- enable skill,
- provide input,
- receive results.

Agent responsibility:

- execute full deterministic chain autonomously.

## User/Agent Boundary

### User does

1. activate skill,
2. provide source input and objective.

### Agent does

1. activation entry gate,
2. workspace recon,
3. ingestion and integration,
4. vault audit,
5. index rebuild,
6. final run report with next step.

## No-Micromanagement Rule

Do not ask routine step-by-step confirmations for non-destructive operations.
Pause only for blocking conditions:

1. activation state `BLOCKED`,
2. unknown workspace profile (unless explicitly allowed),
3. hard failures (`FATAL`/`ERROR`) that require human decision.

## Reliability Rule

Autonomous execution must remain:

1. deterministic,
2. auditable (machine-readable reports),
3. non-destructive by default,
4. lineage-preserving.
