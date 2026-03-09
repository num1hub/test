# N1 Automated Update Workflow

`./autoupdate` is the one-step iteration entrypoint for N1.

The idea is simple:

1. one invocation equals one bounded iteration
2. each iteration pulls the hottest actionable task from `TO-DO/HOT_QUEUE.md`
3. the workflow assembles a launch packet instead of improvising from cold chat memory
4. the workflow writes teamwork artifacts so the next agent can see what moved
5. future execution lanes can consume the same packet for deeper work, swarm routing, or real mutation

That packet should now be rich enough to carry:

- dependencies
- entry checklist
- implementation plan
- acceptance criteria
- verification
- evidence and artifact expectations
- queue update rule

## Current Contract

The current implementation is deliberately conservative.

One run now does four things:

- reads the hot queue and selects the first `READY` or `ACTIVE` task unless `--task` overrides it
- loads the matching task packet from `TO-DO/tasks/`
- writes fresh teamwork artifacts under `data/private/agents/n1/` and `reports/n1/automated-update/`
- refreshes a repo-sync artifact so N1 can load a compact project-state packet on the next cold start
- refreshes an orchestration artifact so N1 can see baton order, ready lanes, and the current conductor decision on the next cold start

This gives N1 a repeatable memory bridge:

- `data/private/agents/n1/teamwork.latest.json`
- `data/private/agents/n1/teamwork.history.jsonl`
- `data/private/agents/n1/repo-sync.latest.json`
- `data/private/agents/n1/repo-sync.history.jsonl`
- `data/private/agents/n1/orchestration.latest.json`
- `data/private/agents/n1/orchestration.history.jsonl`
- `reports/n1/automated-update/*.md`
- `reports/n1/repo-sync/*.md`
- `reports/n1/orchestration/*.md`

The human-readable queue side of that bridge is defined in:

- `TO-DO/DECOMPOSITION_LAW.md`
- `TO-DO/LANE_OWNERSHIP_MAP.md`
- `TO-DO/DEPENDENCY_MAP.md`
- `TO-DO/EXECUTION_PROTOCOL.md`
- `TO-DO/HOT_QUEUE.md`
- the selected task packet in `TO-DO/tasks/`

## Iteration Truth Rule

One automated update pass may prepare execution, refresh artifacts, or record blockers, but it must not pretend to have completed implementation work that did not happen.

Every serious iteration update should point to proof, such as:

- the selected task id
- the teamwork artifact path
- the report path
- the exact command run

If a pass only refreshed planning state, the output should say that plainly.

## Why This Exists

N1 should not have to start every session from zero. The workflow turns the hot queue into a machine-readable launch packet so future LLM calls, assistant turns, and swarm lanes can inherit:

- the selected task
- the exact files in scope
- the implementation plan
- the command pack
- the verification commands
- the stop conditions
- the repo dirtiness posture

## Command Surface

Primary shell entrypoint:

```bash
./autoupdate
```

Useful flags:

```bash
./autoupdate --json
./autoupdate --dry-run
./autoupdate --task TODO-001
./autoupdate sync
./autoupdate orchestrate
```

The same shell entrypoint can also scaffold repo-native skills:

```bash
./autoupdate skill create <name>
```

Package entrypoints:

```bash
npm run autoupdate
npm run n1:update:once
npm run n1:sync
npm run n1:orchestrate
```

## Current Safety Posture

- one run is one iteration, not an unbounded loop
- the workflow does not auto-commit when the repository is already dirty
- the workflow does not pretend to have executed code when it only refreshed the launch packet
- the workflow is compatible with later provider-backed execution lanes, but it does not hide them behind fake magic today

## Future Expansion

The next layers can build on top of the same iteration packet:

- provider-backed execution of the selected task
- swarm decomposition for tasks that require lane splitting
- verified micro-commit creation after a real bounded change succeeds
- bounded promotion into N-Infinity, Vault Steward, or capsule-native planning lanes
- richer skill scaffolding so new bounded lanes can be minted from the same host entrypoint
- scheduler-triggered repeated one-pass execution instead of an unsafe in-process endless loop
