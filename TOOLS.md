# N1Hub Tool Notes

This file documents important local surfaces and conventions for agent work in this repository.

## AI Runtime

- AI Wallet UI: `components/AiWalletForm.tsx`
- Wallet API: `app/api/user/ai-wallet/route.ts`
- Provider runtime: `lib/ai/providerRuntime.ts`
- Manual generation API: `POST /api/ai/generate`
- Provider catalog API: `GET /api/ai/providers`

## Symphony and N-Infinity

- Linear lane: `npm run symphony -- ./WORKFLOW.md`
- N-Infinity lane: `npm run ninfinity`
- Optional status surfaces:
  - `http://127.0.0.1:4310/api/v1/state`
  - `http://127.0.0.1:4311/api/v1/state`
- Internal dynamic tools already exposed in Symphony:
  - `deepmine_generate`
  - `capsule_graph_snapshot`
  - `linear_graphql` when the tracker is Linear-backed

## Capsule and Validator Work

- Validate targeted capsule files:
  - `npx tsx scripts/validate-cli.ts data/capsules/<file>.json --fix`
  - `npx tsx scripts/validate-cli.ts data/capsules/<file>.json --strict --ids-file /tmp/n1hub-capsule-ids.json`
- Prefer targeted validation over whole-vault validation unless the change truly spans the graph.

## Workspace Conventions

- Treat `SOUL.md` as the personality and boundaries contract.
- Treat `AGENTS.md` as operating instructions.
- Treat `skills/` as workspace-local agent skills in the OpenClaw-compatible style.
- When a capability already exists as a repo API, runtime tool, or validated capsule path, use that instead of inventing a parallel mechanism.
