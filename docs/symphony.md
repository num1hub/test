# Symphony for N1Hub

## Purpose

Symphony is the long-running issue runner for this repository. It polls Linear, creates one
workspace per issue, and launches a Codex app-server session inside that workspace using the
repo-owned `WORKFLOW.md`.

Primary entrypoints:

- `WORKFLOW.md`
- `NINFINITY_WORKFLOW.md`
- `scripts/symphony.ts`
- `scripts/ninfinity.ts`
- `lib/symphony/`

## Required Environment

- `LINEAR_API_KEY`
- `LINEAR_PROJECT_SLUG`

Run from the repository root:

```bash
npm run symphony -- ./WORKFLOW.md
```

Optional status server:

```bash
npm run symphony -- ./WORKFLOW.md --port 4310
```

Run the N-Infinity night shift:

```bash
npm run ninfinity
```

## N1Hub Workspace Strategy

N1Hub uses per-issue git worktrees under `.symphony/workspaces/`.

The default workflow hooks do the following:

1. `after_create`
   - creates a git worktree from the current repo into the issue workspace
   - creates or resets a per-issue branch named `symphony/<issue-slug>`
2. `before_run`
   - ensures dependencies are installed with `npm ci` on first run
3. `before_remove`
   - deregisters the git worktree before deleting the directory

This keeps agent execution isolated while still giving each issue a real N1Hub checkout.

## Trust And Safety Posture

Current N1Hub defaults are a medium-trust local operator posture:

- `approval_policy: never`
  - the service auto-resolves Codex approval requests rather than pausing for operator input
- `thread_sandbox: workspace-write`
- `turn_sandbox_policy.type: workspaceWrite`
- `turn_sandbox_policy.networkAccess: false`
  - Codex turns are expected to run without network access by default
- workspace hooks are fully trusted
  - they execute local shell scripts from `WORKFLOW.md`
  - for N1Hub, those hooks call `git` and `npm` on the host
- the orchestrator is tracker-read-only
  - ticket writes are still expected to happen through agent tooling, not orchestrator business logic

Important implication:

- the service assumes the repository, `WORKFLOW.md`, and operator-supplied environment are trusted
- if that assumption is not acceptable, tighten the Codex approval/sandbox settings and reduce what
  the hooks can do before using Symphony in a less-trusted environment

## Project-Specific Validation Expectations

N1Hub issue work should follow the same philosophy described in `docs/projects.md`: to dig deep in
capsules. In practice that means moving from the issue summary down into the concrete capsule data,
branch overlays, validator rules, API contracts, and tests that actually define behavior.

Agents working on N1Hub should prefer focused checks:

- UI/API changes: targeted `npm test -- --run ...`
- validator or capsule-data changes: `npm run validate -- --dir data/capsules --strict --report`
- broader audits when needed: `npm run audit:capsules`
- end-to-end checks only when warranted: `npm run test:e2e`

Relevant project references:

- `README.md`
- `docs/validator.md`
- `docs/projects.md`
- `docs/real-dream-diff.md`

## Capsule Graph Integration

Symphony is also represented inside the N1Hub capsule vault so the service, its workflow contract,
and its implementation lineage are discoverable from the same graph the agents are expected to
navigate.

Current Symphony capsules:

- `capsule.foundation.symphony.v1`
- `capsule.foundation.symphony-workflow.v1`
- `capsule.project.symphony.v1`
- `capsule.foundation.symphony-agent-session.v1`
- `capsule.foundation.symphony-run-attempt.v1`
- `capsule.foundation.symphony-retry-entry.v1`
- `capsule.foundation.symphony-approval-sandbox-policy.v1`
- `capsule.foundation.symphony-observability.v1`

These capsules formalize a specific N1Hub rule: Symphony should not stop at issue summaries. It
must dig into the actual capsules, validator rules, branch overlays, routes, tests, and repository
contracts that define reality in this codebase.

## Capsule Graph Mode

N1Hub extends Symphony with a local `capsule_graph` tracker mode for N-Infinity work.

That mode:

- synthesizes work items from configured N-Infinity agent capsule IDs
- lets those work items run through the same Symphony workspace, retry, and observability pipeline
- supports `nightly` execution windows with timezone-aware activation
- records successful runs to a local run-history file so agents cool down after success instead of
  thrashing on every poll
- exposes `deepmine_generate` and `capsule_graph_snapshot` as internal tools for agent sessions

This is the current N1Hub path to background capsule-graph agents that can work autonomously during
night windows while still staying inside repo-owned workflow policy.

## Current Scope

This implementation includes:

- workflow loading and reload
- typed config parsing
- Linear polling client
- per-issue workspace lifecycle hooks
- Codex app-server session management
- orchestrator retries and reconciliation
- optional HTTP status endpoints

Recommended before production use:

- run the service against a real Linear project with valid credentials
- verify git worktree hooks on the target host
- verify the configured Codex approval and sandbox settings match the actual risk profile

## Operations

For host-level deployment, environment layout, and `systemd` service installation:

- [`docs/agents-operations.md`](docs/agents-operations.md)
- `ops/systemd/n1hub-symphony.service`
- `ops/env/n1hub-agents.env.example`
