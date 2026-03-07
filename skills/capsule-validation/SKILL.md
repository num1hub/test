---
name: capsule-validation
description: Validate edited capsules early and narrowly with the N1Hub validator CLI.
---

# Capsule Validation

N1Hub capsule changes are not real until they pass validator truth.

## Standard Flow

1. Edit the smallest relevant capsule set.
2. Run `--fix` on the touched files when appropriate.
3. Run `--strict` on the same files with a complete IDs set.

## Commands

```bash
npx tsx scripts/validate-cli.ts data/capsules/<file>.json --fix
```

```bash
npx tsx scripts/validate-cli.ts data/capsules/<file>.json --strict --ids-file /tmp/n1hub-capsule-ids.json
```

## Rules

- Prefer targeted validation over full-vault runs.
- If a new capsule introduces links, make sure `known IDs` contains the graph you reference.
- Do not leave capsule edits unvalidated if the change touches architecture or graph links.
