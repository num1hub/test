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

## Projects - Organize Your Sovereign Work

The Projects tab provides a project-oriented projection of the capsule graph:

- project capsules are explicit (`metadata.type: "project"`, `subtype: "hub"`)
- hierarchy is modeled with `part_of` links (child -> parent)
- cycle prevention is enforced in both UI and API
- create/edit/link/re-parent flows use the same capsule APIs and validator pipeline

Read the full guide in [`docs/projects.md`](docs/projects.md).
