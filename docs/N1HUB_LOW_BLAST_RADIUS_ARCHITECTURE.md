<!-- @anchor doc:n1hub.low-blast-radius-architecture links=doc:n1hub.readme,doc:n1hub.agents,doc:n1hub.codex,doc:validator.reference,doc:a2c.reference,doc:symphony.reference,flow:a2c.workspace-recon,script:file.guardrails.audit note="Low-blast-radius architecture doctrine for AI-assisted engineering inside N1Hub." -->
# N1Hub Low-Blast-Radius Architecture

This document defines the N1Hub engineering doctrine for AI-assisted change. The goal is not small files for aesthetics. The goal is to keep the maximum accidental damage of any human or agent bounded, observable, and recoverable.

## Core Law

N1Hub should be built so an agent working with partial context cannot silently reshape the whole repository.

That requires:

- real domain capsules instead of soft folder conventions
- one public entrypoint per major domain
- explicit machine-readable contracts at domain boundaries
- owned storage namespaces instead of cross-domain direct writes
- one-direction dependency rules
- tests that describe boundary behavior
- file-size guardrails that force decomposition before context collapses
- evolutionary refactors instead of giant rewrites

## Domain Capsules

In N1Hub, the main runtime domains are already visible:

- `validator`
- `a2c`
- `symphony`
- `graph`
- `projects`
- `branching / diff`
- `agent runtime / vault stewardship`

Each domain should expose one public entry surface such as `lib/<domain>/index.ts` or an explicit route boundary. Callers should depend on that surface, not on private files deep inside the domain.

## Validator Sovereignty

Capsule-shaped data is constitutionally owned by the validator contract. Any runtime that emits, mutates, imports, repairs, or promotes capsule data should cross that boundary through validator-owned schemas, APIs, or helpers instead of rebuilding capsule correctness from memory.

This is especially important for:

- API routes
- A2C runtime stages
- branch diff and merge paths
- background agents
- future import and marketplace flows

## Storage Ownership

N1Hub is not a SQL-first system, so storage ownership should be defined by namespace rather than by table.

Examples:

- `data/capsules` belongs to vault and validator discipline
- `data/private/a2c` belongs to the A2C runtime
- `reports/a2c` belongs to A2C operational output
- `.symphony` and per-run workflow state belong to Symphony
- `data/private/agents` belongs to agent-runtime orchestration

One domain may read another domain's public artifact or contract, but it should not mutate or depend on the private on-disk shape of a foreign namespace.

## Contracts As Files

Every important cross-domain boundary should become a versioned file contract:

- OpenAPI for HTTP routes
- schema files for DTOs and payloads
- validator-owned capsule shapes
- workflow configuration contracts
- branch diff payload contracts

When the contract lives in a file, CI can challenge it. When the contract lives only in team memory, agents improvise.

## Dependency Rule

Dependencies should point inward toward stable public boundaries, not sideways into private internals. App routes and UI may depend on public domain APIs. Domains may depend on shared primitives and explicit contracts. Domains should not reach into each other's private implementation files just because TypeScript allows the import.

The current concrete enforcement step is the `Vault Steward` cluster boundary:

- external callers must use `@/lib/agents/vaultSteward`
- private imports under `@/lib/agents/vaultSteward/*` are lint-barred outside the domain
- deeper boundary tightening for validator, A2C, and Symphony should follow after cluster-specific refactors land

## Tests As Living Boundary Documentation

The most valuable tests in an agent-heavy repository are the ones that explain boundary behavior:

- validator API to validator core
- A2C to validator
- Symphony workflow and prompt surfaces to runtime
- graph projection to capsule DTO shape
- branch diff routes to merge-safe payload contracts

These tests are not only bug nets. They are machine-checkable statements of what one domain may expect from another.

## File-Size Guardrails

For `app/`, `lib/`, and `scripts/`, use these limits unless there is a justified exception:

- soft limit: `400` lines
- hard limit: `600` lines

Generated files, fixtures, large schemas, and similar artifacts can be allowlisted. The point is not ritual purity. The point is to keep high-signal files small enough that both humans and agents can keep the whole unit in working context.

## Golden Path

A new N1Hub domain should normally ship with:

- `lib/<domain>/index.ts`
- domain types and public DTOs
- runtime or service files behind the public surface
- tests that pin boundary behavior
- docs that explain the public contract
- anchor coverage on high-signal boundaries

If a new subsystem cannot explain its public entrypoint, owned storage, contracts, and tests, it is not ready to become a first-class runtime surface.

## Workspace Composition Boundary

`Workspace` is an operator-facing composition lens, not a mega-domain that owns the full semantics of Planner, Tracker, Dashboard, Personal AI Assistant, Chat to Capsules, AI Control Surface, Symphony, Background Agent Runtime, or Vault Stewardship.

The architectural rule is:

- Real keeps the canonical live module inventory and ownership boundaries for Workspace.
- Dream may explore future operator composition, visibility, and routing improvements.
- Promotion from Dream into Real should be selective. Do not overwrite stronger real-side inventory just because the Dream prose is sharper.

## Refactor Rule

Refactor by small reversible steps:

1. Extract one bounded piece.
2. Repoint callers.
3. Run the relevant checks.
4. Remove the old path only after behavior is pinned.

Large unmeasured rewrites increase blast radius faster than they increase elegance.

## Operationalization In N1Hub

This doctrine should be enforced gradually through:

- instruction surfaces such as `AGENTS.md` and `CODEX.md`
- A2C recon and readiness gates
- anchor governance on the relevant docs and boundaries
- contract tests
- dependency policy in CI
- targeted file-size audits for governed code surfaces

Current operational commands:

- `npm run audit:file-guardrails`
- `npm run check:file-guardrails:hard`

N1Hub should evolve toward an architecture where an agent can do deep work without being able to cause deep accidental damage.
