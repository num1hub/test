<!-- @anchor doc:projects.reference links=doc:n1hub.readme,arch:graph.runtime,doc:branching.real-dream-diff note="Reference for project capsules and project graph behavior in N1Hub." -->
# Projects in N1Hub

## Overview
Projects are a projection of the same sovereign capsule graph used everywhere else in N1Hub. They do not use a separate datastore. A project is represented as a capsule with:

- `metadata.type: "project"`
- `metadata.subtype: "hub"`

Project hierarchy is modeled with directed `part_of` links from child to parent. This creates a project DAG that supports nested execution structures while preserving capsule-level sovereignty and traceability.

## Philosophy Alignment
The Projects tab expresses the "To Dig Deep" approach by letting you traverse from macro intent to atomic work:

1. Start at a root project (vision-level hub).
2. Drill into sub-projects (structured decomposition).
3. Reach atomic capsules (operational truth).

This keeps strategic and tactical layers coherent without introducing duplicate knowledge structures.

## Routes
- `/projects`: dashboard with grid/tree projections.
- `/projects/[id]`: project detail with children, links, and neighborhood graph.
- `/projects/new`: create project capsule.
- `/projects/[id]/edit`: edit existing project capsule.

All routes require authentication; unauthenticated access redirects to `/login`.

## Creating a Project
Use **Projects → New Project** and provide:

- name (`metadata.name`)
- optional capsule ID (auto-generated if omitted)
- summary (70–160 words)
- status
- author
- optional parent project
- keywords (5–15)

The form creates a full 5-element capsule and saves through `POST /api/capsules`.

## Parent/Child Semantics
Parent-child relationships use:

```json
{ "target_id": "<parent_project_id>", "relation_type": "part_of" }
```

Children can be projects or non-project capsules. Projects without a valid parent are treated as roots.

## Re-parenting and Cycle Safety
Re-parenting is done by editing the `part_of` relationship.

Cycle prevention is enforced in two layers:

1. UI: `wouldCreateCycle()` warns and disables save.
2. API: `PUT /api/capsules/[id]` returns `409 Conflict` if the update would create a cycle.

## Absorption and Independence
Absorption is expressed semantically, not physically:

- To absorb project B into project A, set B `part_of -> A`.
- Independent projects remain roots (no parent link).

This supports N1 ecosystem projects and external sovereign projects in one graph.

## Linking Existing Capsules
On a project detail page, **Link Existing Capsule** adds a `part_of` link from a selected capsule to the current project.

## Bulk Operations
In dashboard grid view, select multiple project cards and use batch actions:

- export selected
- delete selected

Uses the same batch infrastructure as the Vault view.

## API Enhancements
### `GET /api/capsules?type=project`
Server-side filter by `metadata.type`.

### `POST /api/capsules`
Accepts optional `parentId` convenience parameter. If provided, API validates parent project existence and injects `part_of` link before validation.

### `PUT /api/capsules/[id]`
Enforces project cycle checks when `part_of` links change.

### Optional hierarchy endpoint
`GET /api/projects/[id]/hierarchy?depth=<n>` returns subtree rooted at project ID.

## Migration
Run once to migrate convention-based project capsules:

```bash
npm run migrate:projects
```

The migration script:

1. Creates a backup copy of `data/capsules/`.
2. Converts project-like capsules to `type: "project"`, `subtype: "hub"`.
3. Populates `metadata.name` when missing.
4. Updates `metadata.updated_at` and recomputes integrity hash.

## Extensibility Notes
Future enhancements:

- drag-and-drop tree re-parenting (`@dnd-kit/sortable`)
- server-side hierarchy pagination for very large vaults
- project-level graph analytics (depth, critical path, orphan detectors)
