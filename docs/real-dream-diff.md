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

## Field Audit Snapshot

Measured on `2026-03-12` against the live vault.

Verified census:

- total files in `data/capsules`: `489`
- real files: `257`
- dream overlays: `232`
- paired `real/dream` ids: `227`
- dream-only ids: `5`
- real-only ids: `30`
- legacy `*.dream.json` count: `0`
- non-dream overlay branch count in `data/capsules`: `0`

Current dream-only ids:

- `capsule.operations.vault-steward.archive.v1`
- `capsule.operations.vault-steward.archive.vault-steward-1773020624098.v1`
- `capsule.operations.vault-steward.latest.v1`
- `capsule.operations.vault-steward.plan.v1`
- `capsule.operations.vault-steward.queue.v1`

Current real-only ids:

- `capsule.foundation.agent-activation-readiness.v1`
- `capsule.foundation.ai-friendly-engineering.v1`
- `capsule.foundation.background-agent-runtime.control-plane.v1`
- `capsule.foundation.background-agent-runtime.daemon-lifecycle.v1`
- `capsule.foundation.background-agent-runtime.mutation-gates.v1`
- `capsule.foundation.background-agent-runtime.work-orchestration.v1`
- `capsule.foundation.contract-governed-boundaries.v1`
- `capsule.foundation.deep-intake-investigation.v1`
- `capsule.foundation.domain-capsule-boundaries.v1`
- `capsule.foundation.golden-path-engineering.v1`
- `capsule.foundation.ignition-ritual.v1`
- `capsule.foundation.key-agents.governance-lane.v1`
- `capsule.foundation.key-agents.mining-lane.v1`
- `capsule.foundation.key-agents.planning-lane.v1`
- `capsule.foundation.key-agents.stewardship-lane.v1`
- `capsule.foundation.key-agents.swarm-lane.v1`
- `capsule.foundation.key-agents.user-lane.v1`
- `capsule.foundation.low-blast-radius-architecture.v1`
- `capsule.foundation.n-infinity.governance-metrics.v1`
- `capsule.foundation.n-infinity.runtime-fabric.v1`
- `capsule.foundation.n-infinity.signal-fabric.v1`
- `capsule.foundation.n-infinity.swarm-roster.v1`
- `capsule.foundation.sovereign-refactor.v1`
- `capsule.foundation.workspace-recon.v1`
- `capsule.foundation.workspace.assistant-control.v1`
- `capsule.foundation.workspace.execution-loop.v1`
- `capsule.foundation.workspace.identity-access.v1`
- `capsule.foundation.workspace.operator-surfaces.v1`
- `capsule.foundation.workspace.runtime-lanes.v1`
- `capsule.project.n1hub-sovereign-refactor.v1`

Current parity classification note:

- the `background-agent-runtime` decomposition family is now explicitly classified as `real-first canonical`
- the Dream parent `capsule.foundation.background-agent-runtime.v1@dream` already routes through `control-plane`, `daemon-lifecycle`, `mutation-gates`, and `work-orchestration`
- those four real-only sub-hubs therefore act as live decomposition surfaces rather than missing Dream mirrors
- the `key-agents` decomposition family is now explicitly classified as `real-first canonical`
- the Dream parent `capsule.foundation.key-agents.v1@dream` already routes through `user-lane`, `mining-lane`, `planning-lane`, `stewardship-lane`, `governance-lane`, and `swarm-lane`
- those six real-only lane hubs therefore act as live decomposition surfaces rather than missing Dream mirrors
- the `workspace` decomposition family is now explicitly classified as `real-first canonical`
- the Dream parent `capsule.foundation.workspace.v1@dream` already routes through `assistant-control`, `execution-loop`, `identity-access`, `operator-surfaces`, and `runtime-lanes`
- those five real-only workspace sub-hubs therefore act as live decomposition surfaces rather than missing Dream mirrors
- the `n-infinity` decomposition family is now explicitly classified as `real-first canonical`
- the Dream parent `capsule.foundation.n-infinity.v1@dream` already routes through `runtime-fabric`, `swarm-roster`, `signal-fabric`, and `governance-metrics`
- those four real-only N-Infinity sub-hubs therefore act as live decomposition surfaces rather than missing Dream mirrors
- the sovereign-refactor planning family is now explicitly classified as `real-first canonical`
- `capsule.foundation.sovereign-refactor.v1` and `capsule.project.n1hub-sovereign-refactor.v1` are live operator-directed real-only planning surfaces rather than missing Dream mirrors
- `capsule.foundation.n1hub-gold-master.v1` is not an unresolved parity gap: its Real/Dream pair is already lawful, with Real carrying the current constitutional charter and Dream carrying the next-horizon constitutional extension
- the CapsuleOS branch frontier is now materially contained: the paired `capsuleos*` law surfaces are already lawful branch pairs, the protected Dream `16-gates` micro-packet is repaired, and the Dream-wide `G16` finalization wave is complete
- the original engineering-law set plus the measured decomposition/planning families are now explicitly classified; remaining branch-sensitive work is no longer live parity or validator debt and should reopen only through a deliberate protected-law governance decision

Measured hub ranking method:

- start from paired capsules whose real-side metadata advertises `subtype: "hub"`
- run `computeDiff('real', 'dream', { scopeType: 'capsule', capsuleIds: [id] })` for each hub id
- rank with `score = modifiedPaths * 5 + linkChanges * 8 + semanticEvents + actionPlanTasks`

Current top measured hub drift set:

- `capsule.foundation.background-agent-runtime.v1`
  score `239` · `12` modified paths · `16` link changes · `23` semantic events · `28` action-plan tasks
- `capsule.foundation.personal-ai-assistant.v1`
  score `197` · `10` modified paths · `13` link changes · `20` semantic events · `23` action-plan tasks
- `capsule.foundation.workspace.v1`
  score `173` · `8` modified paths · `12` link changes · `17` semantic events · `20` action-plan tasks
- `capsule.foundation.vault-stewardship-swarm.v1`
  score `156` · `13` modified paths · `7` link changes · `15` semantic events · `20` action-plan tasks
- `capsule.foundation.key-agents.v1`
  score `129` · `12` modified paths · `5` link changes · `12` semantic events · `17` action-plan tasks
- `capsule.foundation.n1hub.v1`
  score `123` · `8` modified paths · `7` link changes · `12` semantic events · `15` action-plan tasks
- `capsule.foundation.tracker.v1`
  score `114` · `8` modified paths · `6` link changes · `12` semantic events · `14` action-plan tasks
- `capsule.foundation.capsuleos.v1`
  score `113` · `8` modified paths · `6` link changes · `11` semantic events · `14` action-plan tasks
- `capsule.foundation.n-infinity.v1`
  score `110` · `9` modified paths · `5` link changes · `11` semantic events · `14` action-plan tasks
- `capsule.project.n-infinity.v1`
  score `108` · `7` modified paths · `6` link changes · `12` semantic events · `13` action-plan tasks

Operational consequence:

- `TODO-008` should start from the measured top drift hubs instead of stale intuition lists
- `TODO-009` is now bound to five Dream-only Vault Steward operational and archive capsules
- `TODO-010` must account for thirty real-only ids, including the original engineering-law set and the newer decomposition families
