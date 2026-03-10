<!-- @anchor doc:n1hub.tools links=doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.codex,doc:n1hub.context,doc:n1hub.soul,doc:n1hub.memory,doc:todo.agent-operating-modes,doc:governance.anchors-spec,doc:validator.reference,doc:a2c.reference,doc:symphony.reference,script:validator.cli note="Stable tool and runtime notes for N1Hub operators and agents." -->
# N1Hub Tool Notes

This file documents important local surfaces and conventions for agent work in this repository.

## Instruction Stack

- `README.md` is the repo entrypoint.
- `AGENTS.md` defines contributor and agent rules.
- `CODEX.md` defines execution and verification gates.
- `CONTEXT.md` defines deep mode context, prompt assembly, and delegation posture.
- `SOUL.md` defines assistant identity and boundaries.
- `MEMORY.md` defines durable cross-session memory and long-lived continuity.
- `TO-DO/AGENT_OPERATING_MODES.md` defines reusable mode cards and command packs for assistant, executor, and swarm work.
- `WORKFLOW.md` and `NINFINITY_WORKFLOW.md` define long-running agent prompts.
- `docs/ANCHORS_SPEC.md` defines the anchor-governance contract.

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
- For Real/Dream retain-dream sync passes, use this proof chain:
  - `npm run validate -- --fix data/capsules/<real-file>.json --ids-file /tmp/n1hub-capsule-ids.json`
  - `npm run validate -- --fix data/capsules/<dream-file>.json --ids-file /tmp/n1hub-capsule-ids.json`
  - `npx tsx scripts/curate-vault-real-dream.ts --dry-run`
  - `npm run n1:update:once -- --task <next-hot-task>`

## Workspace Conventions

- Treat `SOUL.md` as the personality and boundaries contract.
- Treat `CONTEXT.md` as the deep role and mode context surface.
- Treat `MEMORY.md` as the compact durable memory surface.
- Treat `AGENTS.md` as operating instructions.
- Treat `CODEX.md` as the execution charter and verification bar.
- Treat `skills/` as workspace-local agent skills in the OpenClaw-compatible style.
- Primary local skills now include `personal-ai-assistant`, `todo-executor`, and `swarm-orchestrator`.
- When a capability already exists as a repo API, runtime tool, or validated capsule path, use that instead of inventing a parallel mechanism.
