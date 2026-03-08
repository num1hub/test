# N1Hub Vault

N1Hub Vault is a Next.js App Router application for managing CapsuleOS knowledge capsules with branch workflows (real/dream), version history, import/export, and activity auditing.

## Universal Branching

N1Hub now supports sparse overlay branches on top of `real`:

- real capsules stay at `data/capsules/<id>.json`
- non-real branches materialize as `data/capsules/<id>@<branch>.json`
- branch tombstones live at `data/capsules/<id>@<branch>.tombstone.json`
- branch manifests live at `data/branches/<branch>.manifest.json`
- Dream keeps legacy `.dream.json` read compatibility until migration
- structured diff and merge APIs are available at `POST /api/diff` and `POST /api/diff/apply`

Architecture and API details: [`docs/real-dream-diff.md`](docs/real-dream-diff.md)

### Branch migration

```bash
npm run migrate:branches -- --dry-run
npm run migrate:branches
```

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Testing

```bash
npm test -- --run
npm run test:e2e
```

## Capsule Validation

The Capsule Validator is fully integrated into backend routes, editor workflows, imports, A2C ingest, CLI, audits, and CI.

- Technical reference: [`docs/validator.md`](docs/validator.md)
- OpenAPI spec: [`docs/openapi/validate.openapi.json`](docs/openapi/validate.openapi.json)

### CLI quick start

```bash
npm run validate -- --dir data/capsules --strict --report
npm run validate -- data/capsules/capsule.foundation.capsuleos.v1.json --fix
```

### API quick start

- `POST /api/validate`
- `POST /api/validate/batch`
- `POST /api/validate/fix`
- `GET /api/validate/stats`
- `GET /api/validate/gates`

Use `Authorization: Bearer <token>` headers matching current app auth.

## Automation

- Pre-commit staged-capsule validation: `npm run validate-staged`
- Background full-vault audit: `npm run audit:capsules`
- CI workflow: `.github/workflows/validate-capsules.yml`

## Symphony Automation

N1Hub now includes a repo-owned Symphony workflow contract at `WORKFLOW.md`.

Operational notes and trust posture: [`docs/symphony.md`](docs/symphony.md)

Required environment:

- `LINEAR_API_KEY`
- `LINEAR_PROJECT_SLUG`

Run the service from the repo root:

```bash
npm run symphony -- ./WORKFLOW.md
```

Optional local dashboard:

```bash
npm run symphony -- ./WORKFLOW.md --port 4310
```

The default N1Hub workflow provisions per-issue git worktree workspaces under `.symphony/workspaces/` and installs dependencies on first run inside each workspace.

Production and background-service instructions: [`docs/agents-operations.md`](docs/agents-operations.md)

## N-Infinity Night Shift

N1Hub also ships a dedicated N-Infinity background entrypoint backed by Symphony:

```bash
npm run ninfinity
```

It uses `NINFINITY_WORKFLOW.md`, the local `capsule_graph` tracker mode, and a nightly execution
window so capsule-oriented agents can work the vault autonomously during off-peak hours. Successful
runs are recorded so the same agent does not immediately re-dispatch again in the same night window
or during the cooldown period after success.

## AI Runtime and N-Infinity

N1Hub now includes a server-side AI provider runtime backed by the AI Wallet in Settings, plus a nightly N-Infinity capsule-agent workflow.

- AI providers are configured in Settings and stored server-side in encrypted form.
- Wallet sections are now split into `Subscriptions`, `API Providers`, and `Platform & Routing`.
- ChatGPT and Claude can now be configured in two separate ways:
  - `ChatGPT / Codex Subscription` and `Claude Subscription` for subscription-backed bridge/auth-key paths
  - `OpenAI API` and `Anthropic API` for standard API-key access
- `Gemini`, `GitHub Models`, `DeepSeek`, and `Grok` are available as direct API-provider slots.
- Gemini can be configured either in the AI Wallet or via server-side `GEMINI_API_KEY` for trusted local bring-up.
- GitHub Models can be configured either in the AI Wallet or via server-side `GITHUB_MODELS_TOKEN` or `GITHUB_TOKEN`.
- Manual provider-backed generation is available through `POST /api/ai/generate`.
- An OpenClaw-inspired control plane is available at `/ai`, combining provider status, DeepMine console, Symphony or N-Infinity lane telemetry, and a direct-provider `Vault Steward` autonomous agent.
- Provider availability is exposed through `GET /api/ai/providers`.
- Capsule-oriented N-Infinity agents run through Symphony using `NINFINITY_WORKFLOW.md`.
- `Vault Steward` is the first autonomous agent that can work directly from an AI Wallet provider without requiring Codex login. It reads the current vault, proposes bounded maintenance jobs, persists a queue under `data/private/agents`, and updates Dream-side operational capsules about its latest run.

Operational notes: [`docs/ninfinity.md`](docs/ninfinity.md)

Host bring-up and `systemd` installation: [`docs/agents-operations.md`](docs/agents-operations.md)

Gemini API key quickstart:

- docs: <https://ai.google.dev/gemini-api/docs/quickstart>
- keys: <https://aistudio.google.com/api-keys>

## OpenClaw-Inspired Agent Workspace

N1Hub now carries a manual, selective fork of the most useful OpenClaw workspace patterns:

- [`SOUL.md`](SOUL.md) for assistant identity and boundaries
- [`TOOLS.md`](TOOLS.md) for local runtime and API notes
- `skills/<name>/SKILL.md` for focused workspace-local agent skills
- research and mapping notes in [`docs/openclaw-fork.md`](docs/openclaw-fork.md)

This is intentionally additive. N1Hub keeps CapsuleOS, AI Wallet, DeepMine, Symphony, and
N-Infinity as the real architecture, while using OpenClaw-style workspace files to make local agent
behavior more stable and inspectable.

Run the nightly N-Infinity service from the repo root:

```bash
npm run ninfinity
```

Run the direct-provider autonomous vault agent manually:

```bash
npm run vault-steward -- --once
```

Optional local status surface:

```bash
npm run ninfinity -- --port 4311
```

## Projects - Organize Your Sovereign Work

The Projects tab provides a project-oriented projection of the capsule graph:

- project capsules are explicit (`metadata.type: "project"`, `subtype: "hub"`)
- hierarchy is modeled with `part_of` links (child -> parent)
- cycle prevention is enforced in both UI and API
- create/edit/link/re-parent flows use the same capsule APIs and validator pipeline

Read the full guide in [`docs/projects.md`](docs/projects.md).
