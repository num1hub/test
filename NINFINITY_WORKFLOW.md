---
tracker:
  kind: capsule_graph
  branch: real
  agent_capsules:
    - capsule.foundation.n-infinity.weaver.v1
    - capsule.foundation.n-infinity.gardener.v1
    - capsule.foundation.n-infinity.parliament.v1
    - capsule.foundation.n-infinity.innovator.v1
    - capsule.foundation.n-infinity.suggestion-agent.v1
  mode: nightly
  night_start_hour: 1
  night_end_hour: 5
  timezone: America/Los_Angeles
  cooldown_hours: 20
  active_states: Night Shift
  terminal_states: Completed
polling:
  interval_ms: 30000
workspace:
  root: .symphony/ninfinity
hooks:
  after_create: |
    base_ref="$(git -C "$SYMPHONY_PROJECT_ROOT" branch --show-current 2>/dev/null || printf 'main')"
    base_ref="${base_ref:-main}"
    raw_branch="${SYMPHONY_ISSUE_IDENTIFIER:-n-infinity-agent}"
    branch_slug="$(printf '%s' "$raw_branch" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')"
    branch_slug="${branch_slug:-n-infinity-agent}"
    git -C "$SYMPHONY_PROJECT_ROOT" worktree add --force -B "ninfinity/$branch_slug" "$SYMPHONY_WORKSPACE_PATH" "$base_ref"
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
  max_concurrent_agents: 2
  max_turns: 6
  max_retry_backoff_ms: 300000
  continue_after_success: false
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
# N-Infinity Capsule Night Shift

You are working inside an isolated N1Hub.com workspace created by Symphony for an N-Infinity capsule graph task.

## Runtime Role

- This workflow is for autonomous capsule maintenance and graph evolution.
- The current task originates from an N-Infinity agent capsule, not from Linear.
- Your job is to improve the capsule graph conservatively, with validator truth and graph integrity as the authority.

## Project Context

- N1Hub is a Next.js App Router application centered on CapsuleOS.
- The canonical capsule store lives under `data/capsules`.
- Validation rules are first-class and must remain intact.
- The graph reality is defined by capsule files, branch overlays, validators, and capsule APIs, not by architectural slogans alone.

## N-Infinity Operating Rules

1. Dig deep in capsules before editing anything.
2. Work from the current graph reality: `data/capsules`, validator logic, branch overlay behavior, and related API routes.
3. Prefer small, validated improvements over broad speculative rewrites.
4. Keep changes auditable and conservative.
5. If you introduce or update capsules, validate the smallest relevant set before finishing.
6. If you cannot safely change graph structure, leave precise improvement artifacts in docs or capsule comments rather than inventing uncertain edits.

## Available Internal Tools

- `deepmine_generate`
  Use this when you need external model reasoning via the configured AI Wallet providers.
- `capsule_graph_snapshot`
  Use this to get a compact snapshot of the current capsule graph before choosing a target area.

## Task

- Identifier: {{ issue.identifier }}
- Title: {{ issue.title }}
- Description: {{ issue.description }}
- State: {{ issue.state }}
- Branch hint: {{ issue.branch_name }}
- Attempt: {{ attempt }}

## Target Outcomes

- Improve capsule graph quality, consistency, or navigability.
- Preserve CapsuleOS validation invariants.
- Leave the workspace in a state suitable for human review.

Start by identifying the exact capsule files, validator rules, and graph relationships that matter for this task.
