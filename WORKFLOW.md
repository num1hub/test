---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: $LINEAR_PROJECT_SLUG
  active_states: Todo, In Progress
  terminal_states: Closed, Cancelled, Canceled, Duplicate, Done
polling:
  interval_ms: 30000
workspace:
  root: .symphony/workspaces
hooks:
  after_create: |
    base_ref="$(git -C "$SYMPHONY_PROJECT_ROOT" branch --show-current 2>/dev/null || printf 'main')"
    base_ref="${base_ref:-main}"
    raw_branch="${SYMPHONY_ISSUE_BRANCH_NAME:-$SYMPHONY_ISSUE_IDENTIFIER}"
    branch_slug="$(printf '%s' "$raw_branch" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')"
    branch_slug="${branch_slug:-issue-workspace}"
    git -C "$SYMPHONY_PROJECT_ROOT" worktree add --force -B "symphony/$branch_slug" "$SYMPHONY_WORKSPACE_PATH" "$base_ref"
  before_run: |
    if [ ! -f package.json ]; then
      echo "N1Hub workspace is missing package.json" >&2
      exit 1
    fi
    if [ ! -d node_modules ]; then
      npm ci --no-fund --no-audit
    fi
  before_remove: |
    git -C "$SYMPHONY_PROJECT_ROOT" worktree remove --force "$SYMPHONY_WORKSPACE_PATH" || true
  timeout_ms: 300000
agent:
  max_concurrent_agents: 3
  max_turns: 8
  max_retry_backoff_ms: 300000
  max_concurrent_agents_by_state:
    in progress: 2
    todo: 1
codex:
  command: codex app-server
  approval_policy: never
  thread_sandbox: workspace-write
  turn_sandbox_policy:
    type: workspaceWrite
    writableRoots: []
    networkAccess: false
  turn_timeout_ms: 3600000
  read_timeout_ms: 5000
  stall_timeout_ms: 300000
---
<!-- @anchor doc:workflow.issue-worker links=doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.codex,doc:n1hub.soul,doc:n1hub.tools,doc:governance.anchors-spec,doc:validator.reference,doc:projects.reference,doc:branching.real-dream-diff,arch:symphony.runtime,flow:symphony.prompt-render note="Repo-owned Symphony issue-worker contract for N1Hub." -->
# N1Hub Issue Worker

You are working inside an isolated N1Hub.com issue workspace created by Symphony.

## Project Context

- N1Hub is a Next.js App Router application for managing CapsuleOS knowledge capsules.
- N1Hub follows the "To Dig Deep in Capsules" approach: move from the issue or project surface down into the actual capsule, branch, validator, and API truth before deciding on a code change.
- Key project references live in `README.md`, `AGENTS.md`, `CODEX.md`, `SOUL.md`, `TOOLS.md`, `docs/ANCHORS_SPEC.md`, `docs/validator.md`, `docs/projects.md`, and `docs/real-dream-diff.md`.
- Capsule validation is a first-class concern. If you change validator logic or capsule data, run the smallest relevant validator checks before finishing.
- The app includes API routes, diff/merge flows, branch overlays, project hierarchy features, and validation tooling. Preserve those existing invariants.

## Issue

- Identifier: {{ issue.identifier }}
- Title: {{ issue.title }}
- Description: {{ issue.description }}
- State: {{ issue.state }}
- Priority: {{ issue.priority }}
- Branch hint: {{ issue.branch_name }}
- Attempt: {{ attempt }}

## Operating Rules

1. Read the issue and the relevant N1Hub code paths before editing.
2. To dig deep in capsules, trace the work from the visible issue down to the specific capsule records, validator rules, branch overlays, routes, and tests that define the real behavior.
3. Work only inside the current workspace.
4. Prefer targeted verification over broad full-suite runs unless the change is cross-cutting.
5. For UI or API behavior changes, run the narrowest meaningful Vitest coverage.
6. For capsule, branch, diff, or validator changes, run the validator CLI and/or the nearest validator tests.
7. Update nearby docs when you change externally visible behavior or project workflows.
8. If you change a governed anchor surface such as root docs, workflow docs, validator boundaries, A2C runtime, Symphony runtime, graph runtime, or anchor-governance scripts, run the relevant anchor checks (`npm run validate:anchors`, `npm run verify:root-docs`, `npm run test:anchors`, or `npm run check:anchors:full`).
9. Keep the workspace state coherent for follow-up turns; do not discard prior attempt work unless it is clearly wrong.
10. Finish when the implementation and verification are strong enough for human review.

## Useful N1Hub Commands

- `npm test -- --run`
- `npm run validate -- --dir data/capsules --strict --report`
- `npm run audit:capsules`
- `npm run test:e2e`

Start by locating the code paths most relevant to this issue, then implement the change, verify it, and summarize the outcome.
