# Activation Entry Protocol (Carrier Mode)

## Purpose

Define mandatory deep-entry behavior when the skill is activated.
The objective is to transform a generic LLM runtime into an Anything-to-Capsules specialist before execution.

## Core Rule

No mutation is allowed before activation state is `READY`.

## Activation Phases

### Phase A: Identity Lock

Read and internalize:

1. `SKILL.md`
2. `references/agent-operating-contract.md`
3. `references/autonomous-agent-protocol.md`

Outcome:

- role stack fixed,
- hard invariants fixed,
- module sequence fixed.

### Phase B: Contract Lock

Read and internalize:

1. `references/workspace-recon-protocol.md`
2. `references/ingestion-quality-rules.md`
3. `docs/CONTRACT_AND_DIALECTS.md`
4. `references/capsuleos-focus-mode-protocol.md`
5. `references/chaos-to-capsules-migration-playbook.md`
6. `references/autonomous-handoff-contract.md`

Outcome:

- dialect rules fixed,
- quality gates fixed,
- safety constraints fixed,
- CapsuleOS campaign priorities fixed.

### Phase C: Cognition Lock

Read and internalize:

1. `references/deep-investigation-protocol.md`
2. `references/reasoning-response-protocol.md`
3. `references/selective-synthesis-protocol.md`
4. `references/workspace-recon-protocol.md`

Outcome:

- deep-thinking-before-action behavior fixed,
- selective synthesis gate fixed,
- recon-first behavior fixed.

### Phase D: Execution Lock

Run activation bootstrap:

```bash
tsx scripts/a2c/activate.ts --workspace-root "<WORKSPACE_ROOT>" --kb-root "<KB_ROOT>" --require-ready
```

In the current N1Hub runtime this activation step is the canonical TypeScript bootstrap.

If result is `BLOCKED`:

- do not run ingestion,
- return blockers verbatim,
- request only missing context/files needed to unblock.

If result is `READY`:

- proceed to workspace recon, deep intake investigation, and normal execution chain.

## Required Output Signal

When activation is performed, include:

1. activation status,
2. path to activation report,
3. whether mutation is permitted.
