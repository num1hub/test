<!-- @anchor doc:n1hub.codex links=doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.context,doc:n1hub.soul,doc:n1hub.memory,doc:n1hub.tools,doc:todo.index,doc:todo.hot-queue,doc:todo.agent-operating-modes,doc:workflow.issue-worker,doc:workflow.ninfinity-night-shift,doc:governance.anchors-spec,doc:governance.terminology,doc:governance.naming-grammar,doc:governance.patterns,doc:governance.risk-register,doc:n1hub.low-blast-radius-architecture,interface:validator.public-api,script:verify.root-docs,script:file.guardrails.audit note="Execution charter for deterministic implementation and verification inside N1Hub." -->
# N1Hub Execution Charter

This charter defines how implementation work is executed inside `n1hub.com`. `AGENTS.md` says what is allowed. This file says how to carry the work through without widening accidental damage.

## Required References

Read the relevant subset of these before editing:

- `README.md`
- `AGENTS.md`
- `SOUL.md`
- `CONTEXT.md`
- `MEMORY.md`
- `TO-DO/README.md`
- `TO-DO/AGENT_OPERATING_MODES.md`
- `TO-DO/HOT_QUEUE.md`
- `TOOLS.md`
- `WORKFLOW.md`
- `NINFINITY_WORKFLOW.md`
- `docs/ANCHORS_SPEC.md`
- `docs/TERMINOLOGY.md`
- `docs/ANCHOR_NAMING_GRAMMAR.md`
- `docs/ANCHOR_GOVERNANCE_PATTERNS.md`
- `docs/ANCHOR_RISK_REGISTER.md`
- `docs/N1HUB_LOW_BLAST_RADIUS_ARCHITECTURE.md`
- `docs/validator.md`
- `docs/a2c.md`
- `docs/symphony.md`

## Execution Principles

Every serious change should follow these principles:

1. Discover real repo truth before proposing structure.
2. Choose the smallest boundary that solves the actual problem.
3. Make public contracts and public entrypoints explicit before deeper implementation movement.
4. Prefer bounded extraction over sweeping rewrites.
5. Run the narrowest sufficient verification, then report concrete evidence.

## Standard Execution Flow

Use this default sequence unless the task is trivially small:

1. Check `TO-DO/HOT_QUEUE.md` and the linked task file if the user has not already overridden priority.
2. Check `CONTEXT.md` and `TO-DO/AGENT_OPERATING_MODES.md` when the task needs assistant, executor, or swarm-mode guidance.
3. Identify the target domain and whether the work is docs, runtime, contract, capsule-state, or planning-control-plane work.
4. Identify the public boundary that should own the change.
5. Check whether the task touches an active cluster.
6. Update docs, contracts, schemas, or public entry surfaces first when they are part of the change.
7. Apply one bounded implementation step.
8. Update `MEMORY.md` if the step created durable cross-session truth that future agents should not have to rediscover.
9. Update `TO-DO/` if the step changed task status, execution band, acceptance criteria, or command packets.
10. Regenerate governed artifacts if the changed surface requires them.
11. Run the relevant gates.
12. Report results with changed surfaces, command evidence, and residual risk.

## Hot Queue Intake

When `TO-DO/` exists, use this intake protocol:

1. Read `TO-DO/README.md`.
2. Read `TO-DO/AGENT_OPERATING_MODES.md` when the execution mode is not already obvious.
3. Read `TO-DO/HOT_QUEUE.md`.
4. Open the highest-priority relevant task file in `TO-DO/tasks/`.
5. Confirm scope, execution band, non-goals, execution packet, and verification before editing.
6. Do not silently widen the task beyond its acceptance criteria.

## Root-Doc Update Flow

Use this when the work changes `README.md`, `AGENTS.md`, `SOUL.md`, `CONTEXT.md`, `MEMORY.md`, or `CODEX.md`:

1. Identify which document actually owns the change.
2. State whether the change is about repository map, repo law, assistant identity, deep mode context, durable memory, or execution protocol.
3. Apply the smallest edit that restores coherence across the instruction stack.
4. If the change came from an external article, conversation, or design note, adapt it to N1Hub reality before treating it as policy.
5. Re-run the root-doc and anchor gates.
6. Report which instruction surfaces changed and why.

## Change Profiles

Choose the lightest profile that still proves the change is real.

### Root Docs and Governance Docs

Use when touching `README.md`, `AGENTS.md`, `CODEX.md`, or anchor-governance docs.

Required gates:

- `npm run extract:anchors`
- `npm run validate:anchors`
- `npm run verify:root-docs`
- `npm run test:anchors`
- `npm run check:anchors`

### Runtime Boundary Changes

Use when touching validator, A2C, Symphony, graph, or agent-runtime boundaries.

Required gates:

- all root-doc and anchor gates above when governed surfaces moved
- `npm run typecheck`
- `npm run audit:file-guardrails`
- one or more narrow runtime checks chosen from below

Narrow runtime checks:

- `npm test -- --run`
- `npm run validate -- --dir data/capsules --strict --report`
- `npm run docs:openapi`

### Cluster Refactors

Use when changing active architectural clusters such as `Vault Steward Runtime`.

Required additional discipline:

1. State the cluster.
2. State the public boundary.
3. Keep the step reversible.
4. Do not mix boundary redesign with unrelated cleanups.
5. Leave the next agent enough evidence to continue without rediscovering the architecture.

## Cluster Protocol

Current sequence:

- `#1 Vault Steward Runtime`
  - public surface: `@/lib/agents/vaultSteward`
  - priority: reduce pressure in `vaultSteward.ts`, `queue-planning.ts`, and `prompting.ts`
- `#2 Validator/API boundary package`
- `#3 Symphony orchestration contracts`

Cluster cadence is fixed:

1. define the cluster and boundary
2. expose or tighten the contract
3. move one bounded implementation seam
4. verify
5. record evidence
6. stop

Do not skip from cluster discovery to broad rewrite.

## Architecture Discipline

- Prefer public entrypoints over private cross-domain imports.
- Keep storage ownership explicit by namespace.
- Treat validator contracts, route schemas, prompt packs, and workflow files as first-class boundaries.
- Use file-size pressure as a signal to extract responsibilities, not as a reason to shuffle code arbitrarily.
- If a refactor changes too many reasons-to-break at once, the step is too large.
- Prefer repo-owned golden paths over improvised one-off workflows.
- Treat `MEMORY.md` as compact durable context, not as a substitute for contracts or validation.

## Hard Gates

These are the default hard gates for governed work:

```bash
npm run extract:anchors
npm run validate:anchors
npm run verify:root-docs
npm run test:anchors
npm run typecheck
npm run check:anchors:full
```

Use these additional gates when required:

```bash
npm test -- --run
npm run validate -- --dir data/capsules --strict --report
npm run docs:openapi
npm run audit:file-guardrails
```

## Failure Policy

Do not mark work complete if any of the following are true:

- anchor artifacts are stale
- root-doc triad drifted from the instruction stack
- `scorecard.passed` is false
- a public boundary was bypassed by convenience imports
- file-size pressure increased without explanation during architecture work
- validator, A2C, Symphony, N-Infinity, or graph contracts were weakened just to make governance easier

## Close-Out Format

For non-trivial work, the close-out must include:

1. what changed
2. why that boundary was chosen
3. which important files changed
4. which commands ran and whether they passed
5. what remains risky, deferred, or intentionally not done

If root docs changed, say that explicitly.

If cluster work changed public boundaries, say that explicitly.
