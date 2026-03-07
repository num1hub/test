# N-Infinity Runtime

N1Hub now uses the same Symphony runtime foundation for two different automation lanes:

- `WORKFLOW.md` for Linear-driven repository issue execution
- `NINFINITY_WORKFLOW.md` for local capsule-graph background agents

## What Exists Now

The current implementation adds four concrete pieces:

1. `AI Wallet -> provider runtime`
   - API keys and authorization keys are stored server-side in encrypted form.
   - Provider-backed text generation is available in:
     - `lib/ai/providerRuntime.ts`
     - `POST /api/ai/generate`
     - `GET /api/ai/providers`

2. `Symphony dynamic tools`
   - Symphony agent sessions now expose:
     - `deepmine_generate`
     - `capsule_graph_snapshot`
   - This lets background agents work with external LLM reasoning and current graph summaries without hard-coding secrets into prompts.

3. `capsule_graph tracker mode`
   - Symphony now supports `tracker.kind: capsule_graph`.
   - This generates local N-Infinity jobs from configured agent capsules instead of reading Linear issues.

4. `nightly N-Infinity workflow`
   - `NINFINITY_WORKFLOW.md` defines a nightly capsule-agent shift.
   - `scripts/ninfinity.ts` launches the long-running service.
   - `npm run ninfinity` is the default entrypoint.

## Current N-Infinity Focus

The default nightly workflow targets these capsule agents:

- `capsule.foundation.n-infinity.weaver.v1`
- `capsule.foundation.n-infinity.gardener.v1`
- `capsule.foundation.n-infinity.parliament.v1`
- `capsule.foundation.n-infinity.innovator.v1`

These jobs are generated locally from the capsule graph and executed in isolated worktree-backed workspaces under `.symphony/ninfinity/`.

## Night Shift Behavior

By default the service is designed to be left running continuously, while actual dispatch is limited to the configured night window in `NINFINITY_WORKFLOW.md`.

Default window:

- timezone: `America/Los_Angeles`
- start: `01:00`
- end: `05:00`

Inside that window the service creates N-Infinity capsule jobs and runs them through Symphony. Outside that window the service stays idle and only keeps its orchestration loop and workflow watch active.

## AI Provider Notes

Current provider runtime support:

- ChatGPT / Codex Subscription
- OpenAI
- Anthropic
- Claude Subscription
- Gemini
- DeepSeek
- Grok
- OpenRouter
- `n1_subscription` as an auth-key based endpoint slot

The runtime is intentionally server-side. Raw secrets are never returned to the browser after save.

## Practical Limits

This is now a working background execution foundation, but not yet a full multi-tenant production swarm platform.

Current limits:

- auth is still single-token operator mode
- there is no Redis/BullMQ-style durable distributed queue
- there is no PostgreSQL/Neo4j runtime graph backend yet
- N-Infinity jobs are generated from the file-backed capsule graph, not from a separate scheduler DB

That said, N1Hub now has the missing core bridge:

`AI Wallet -> provider runtime -> Symphony tools -> N-Infinity nightly capsule agents`

## Operations

For actual host bring-up, `24/7` runtime, and systemd deployment instructions, use:

- [`docs/agents-operations.md`](docs/agents-operations.md)
- `ops/systemd/n1hub-ninfinity.service`
- `ops/env/n1hub-agents.env.example`
