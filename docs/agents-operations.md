# N1Hub AI and Agent Operations

This is the practical bring-up path for running LLM-backed agents on N1Hub.com.

The model is intentionally split into two layers:

- the N1Hub web app manages AI Wallet secrets and protected API routes
- Symphony and N-Infinity are long-running background services that use the same repository, data
  directory, and wallet state

## What Must Be Running

For a complete operator setup, keep these pieces in mind:

1. The web app
   - Needed for the Settings UI and protected API routes such as `/api/ai/generate`.
2. Symphony
   - Linear-driven issue runner from `WORKFLOW.md`.
3. N-Infinity
   - Capsule-graph runner from `NINFINITY_WORKFLOW.md`.

For N-Infinity night shift specifically, the recommended model is:

- keep the service running `24/7`
- let the workflow night window control when jobs are actually dispatched

That is more reliable than repeatedly starting and stopping the process from cron.

## Required Environment

Copy the example file:

```bash
cp ops/env/n1hub-agents.env.example ops/env/n1hub-agents.env
```

Then set at minimum:

- `N1HUB_AUTH_TOKEN`
- `N1HUB_AI_WALLET_KEY`
- `LINEAR_API_KEY`
- `LINEAR_PROJECT_SLUG`

Notes:

- `N1HUB_AI_WALLET_KEY` is strongly recommended in production.
- Without it, N1Hub will generate a local key file under `data/private/ai-wallet.key`.
- The generated file works on the same host and repository path, but an explicit env key is a more
  stable production posture.

## LLM Provider Bring-Up

The current supported provider slots are:

- ChatGPT / Codex Subscription
- Claude Subscription
- OpenAI
- Anthropic
- Gemini
- DeepSeek
- Grok
- OpenRouter
- `n1_subscription`

Bring-up flow:

1. Start the N1Hub web app.
2. Sign in to the local operator session.
3. Open Settings and configure the AI Wallet provider.
4. Use the built-in `Test` button in the AI Wallet form.

Why this matters:

- the UI saves encrypted secrets server-side
- Symphony and N-Infinity use the same wallet state through `lib/ai/providerRuntime.ts`
- the background services do not need raw provider keys embedded into prompts or workflow files

Claude Subscription note:

- keep the regular `Anthropic` slot for official API-key usage
- use the `Claude Subscription` slot only for a compatible private or approved bridge endpoint
- provide the full bridge endpoint URL, because N1Hub posts to that URL directly
- this keeps subscription-backed routing separate from the public Anthropic API key path
- this separation is intentional: subscription-style Claude access and public Anthropic API access are not treated as the same runtime contract in N1Hub

Current bridge contract for the `Claude Subscription` slot:

- method: `POST`
- auth header: `Authorization: Bearer <auth-key>`
- request body:

```json
{
  "model": "claude-subscription/default",
  "prompt": "user prompt",
  "system": "optional system prompt",
  "temperature": 0.2,
  "max_tokens": 1024
}
```

- accepted response shapes:
  - `{ "text": "..." }`
  - Anthropic-style `content` arrays with `text`
  - OpenAI-style `choices[].message.content`

That gives N1Hub a stable runtime contract without pretending that the public Anthropic API and a
subscription-backed bridge are the same thing.

ChatGPT / Codex Subscription note:

- keep the regular `OpenAI API` slot for official API-key usage
- use the `ChatGPT / Codex Subscription` slot only for a compatible private or approved bridge endpoint
- provide the full bridge endpoint URL, because N1Hub posts to that URL directly
- this separation is intentional: subscription-backed Codex/ChatGPT usage and the OpenAI API are not treated as the same runtime contract in N1Hub

Optional API smoke tests after the app is running:

```bash
curl -s http://127.0.0.1:3000/api/ai/providers \
  -H "Authorization: Bearer $N1HUB_AUTH_TOKEN"
```

```bash
curl -s http://127.0.0.1:3000/api/ai/generate \
  -X POST \
  -H "Authorization: Bearer $N1HUB_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","prompt":"Reply with READY."}'
```

## Background Agent Bring-Up

### N-Infinity

`npm run ninfinity` starts the capsule-graph orchestration lane.

Key runtime facts:

- it reads `NINFINITY_WORKFLOW.md`
- it uses `tracker.kind: capsule_graph`
- it keeps running outside the night window, but dispatches jobs only during the configured hours
- it records successful runs so agents cool down instead of thrashing every poll cycle

Default local status endpoint:

- `http://127.0.0.1:4311/`
- `http://127.0.0.1:4311/api/v1/state`

### Symphony

`npm run symphony -- ./WORKFLOW.md` starts the Linear-backed orchestration lane.

Default local status endpoint:

- `http://127.0.0.1:4310/`
- `http://127.0.0.1:4310/api/v1/state`

## systemd Installation

The repository now includes ready-to-adapt unit files:

- `ops/systemd/n1hub-ninfinity.service`
- `ops/systemd/n1hub-symphony.service`

Install them like this:

```bash
sudo cp ops/systemd/n1hub-ninfinity.service /etc/systemd/system/
sudo cp ops/systemd/n1hub-symphony.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now n1hub-ninfinity.service
sudo systemctl enable --now n1hub-symphony.service
```

Important adjustments before production use:

- change `User=` and `Group=` if your deploy user is not `n1`
- confirm `WorkingDirectory=` matches the real repository path
- make sure Node, npm, git, and codex are available for the service user
- keep `ops/env/n1hub-agents.env` readable only by the service account

## Health Checks

Check service health:

```bash
systemctl status n1hub-ninfinity.service
systemctl status n1hub-symphony.service
```

Tail logs:

```bash
journalctl -u n1hub-ninfinity.service -f
```

```bash
journalctl -u n1hub-symphony.service -f
```

Check status surfaces:

```bash
curl -s http://127.0.0.1:4311/api/v1/state
```

```bash
curl -s http://127.0.0.1:4310/api/v1/state
```

## Recommended N1Hub Posture

For N1Hub specifically, the cleanest operating model now is:

- run the web app continuously
- run Symphony continuously for Linear work
- run N-Infinity continuously and let the workflow night window define the active shift
- keep AI Wallet secrets server-side and encrypted
- keep provider selection and model routing outside prompts and inside runtime config

That gives N1Hub a real path to autonomous nightly capsule work without turning the repository into
an ad hoc shell-script farm.
