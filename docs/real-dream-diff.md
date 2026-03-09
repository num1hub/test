<!-- @anchor doc:branching.real-dream-diff links=doc:n1hub.readme,doc:projects.reference,arch:graph.runtime note="Reference for real/dream overlay branching and diff behavior in N1Hub." -->
# Real Dream Diff

## Overview

N1Hub treats `real` as the immutable baseline branch and every non-real branch as a sparse overlay on top of that baseline. Capsules keep the existing five-root validator shape:

- `metadata`
- `core_payload`
- `neuro_concentrate`
- `recursive_layer`
- `integrity_sha3_512`

Branch lineage, base snapshots, manifests, and tombstones therefore live outside capsule JSON.

## Branch Model

- Real capsule: `data/capsules/<capsuleId>.json`
- Non-real capsule: `data/capsules/<capsuleId>@<branch>.json`
- Legacy Dream read path: `data/capsules/<capsuleId>.dream.json`
- Tombstone: `data/capsules/<capsuleId>@<branch>.tombstone.json`
- Manifest: `data/branches/<branch>.manifest.json`
- Base snapshot: `data/branches/<branch>/<capsuleId>.base.json`

Branch names accept lowercase letters, digits, dots, underscores, and hyphens:

```txt
^[a-z0-9][a-z0-9._-]{0,63}$
```

`real` is reserved and never gets a manifest.

## Overlay Resolution

For `(capsuleId, branch)` reads the loader resolves in this order:

1. `real` reads `data/capsules/<capsuleId>.json`.
2. Non-real branches check for a tombstone first.
3. Canonical `@branch` files override `real`.
4. `dream` falls back to legacy `.dream.json` if no canonical `@dream` file exists.
5. Otherwise the branch inherits the real capsule.

That keeps non-real branches sparse and avoids copying the entire vault for every branch.

## Diff Result

`DiffResult` contains:

- `added`
- `removed`
- `modified`
- `linkChanges`
- `semanticEvents`
- `metrics`
- `actionPlan`
- optional `conflicts`

The field diff engine:

- ignores `$.metadata.updated_at` and `$.integrity_sha3_512` by default
- normalizes confidence vectors before comparison
- treats keywords as an order-insensitive set
- compares arrays as sets or multisets depending on shape
- keeps link comparison outside ordinary field recursion

## Merge Behavior

`POST /api/diff/apply` performs a three-way merge:

- source overlay capsule
- target overlay capsule
- source branch base snapshot when present

Conflict types include:

- `field`
- `link`
- `delete-vs-modify`
- `modify-vs-delete`
- `add-collision`
- `type-mismatch`
- `missing-common-ancestor`

Every applied write:

- preserves `metadata.capsule_id`
- updates `metadata.updated_at`
- recomputes `integrity_sha3_512`
- validates through the existing validator
- writes branch-aware version history

## API

### `POST /api/branches`

```json
{
  "sourceCapsuleId": "capsule.test.v1",
  "sourceBranch": "real",
  "newBranchName": "experimental-1",
  "recursive": false
}
```

### `GET /api/branches`

Returns:

```json
{
  "branches": [
    {
      "name": "real",
      "sourceBranch": "real",
      "sourceProjectId": null,
      "capsuleIds": [],
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z",
      "isDefault": true,
      "materialized": 136,
      "tombstoned": 0
    }
  ]
}
```

### `GET /api/branches/[branchName]/capsules`

Use `projectId`, `capsuleIds`, and `recursive=true` to fetch a scoped overlay view.

### `GET /api/capsules/[id]/diff`

Example:

```txt
/api/capsules/capsule.test.v1/diff?branchA=real&branchB=dream
```

### `POST /api/diff`

```json
{
  "branchA": "real",
  "branchB": "experimental-1",
  "scopeType": "project",
  "scopeRootId": "capsule.project.alpha.v1",
  "recursive": true
}
```

### `POST /api/diff/apply`

```json
{
  "sourceBranch": "experimental-1",
  "targetBranch": "real",
  "scopeType": "capsule",
  "scopeRootId": "capsule.test.v1",
  "conflictResolution": "source-wins"
}
```

All branch, diff, and merge routes require bearer-token auth through `lib/apiSecurity.ts`.

## Action Plan

Generated task kinds:

- `create-capsule`
- `remove-capsule`
- `update-field`
- `add-link`
- `remove-link`
- `resolve-conflict`

These tasks are advisory DTOs only. They are never written back as vault capsules.

## Semantic Events

Semantic events are emitted for:

- status changes
- priority changes
- due-date changes
- progress changes
- effort changes
- content changes
- confidence-vector changes
- link changes
- capsule additions and removals

## Extensibility

The core engine exposes three registration seams:

- `registerFieldComparator(...)`
- `registerMetricsInterpreter(...)`
- `registerActionPlanAdapter(...)`

Example `physical_object` field comparator:

```ts
registerFieldComparator({
  id: 'physical-object-geometry',
  matches: (ctx) =>
    ctx.capsuleType === 'physical_object' &&
    ctx.pathString.startsWith('$.core_payload.geometry'),
  compare: () => [],
});
```

That is the intended TileSims extension seam. Core diff orchestration does not ship a TileSims-specific geometry comparator.

## Migration

Legacy Dream files can be migrated with:

```bash
npm run migrate:branches -- --dry-run
npm run migrate:branches
```

The migration script:

- backs up `data/capsules` and `data/branches`
- renames `*.dream.json` to `*@dream.json`
- updates `data/branches/dream.manifest.json`
- seeds approximate base snapshots for migrated Dream capsules

## Integration Notes

- Planner integrations should consume `diff.actionPlan`.
- Tracker integrations should subscribe to `diff.semanticEvents`.
- N-Infinity agents can call `/api/diff` and `/api/diff/apply` directly.
