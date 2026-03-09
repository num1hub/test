<!-- @anchor doc:todo.lane-ownership links=doc:todo.index,doc:todo.decomposition-law,doc:todo.hot-queue,doc:todo.agent-operating-modes,doc:n1hub.context,doc:n1hub.agents note="Ownership map for N1Hub agent lanes so hot tasks land on clear boundaries instead of vague agent personas." -->
# N1Hub Lane Ownership Map

Updated: 2026-03-09

This file maps queue lanes to the kinds of work they should own. The goal is not branding. The goal is to stop one lane from silently eating another lane’s boundary.

## Core Rule

Owner lane means responsibility center, not personality flavor.

Each hot task should have one owner lane that is credible for:

- the public boundary it touches
- the verification it must run
- the reports or artifacts it should leave behind

If two lanes both look equally responsible, the task is probably under-split.

## Primary Lanes

### Branch Audit Agent

- owns: branch census, field measurement, hotspot ranking, drift audits
- class fit: `Audit`
- preferred outputs: field briefs, ranked hotspot reports, follow-up ordering
- should not own: branch-policy decisions or merge implementation

### Branch Steward Agent

- owns: explicit branch decisions, triage matrices, promote/retain/rewrite classification
- class fit: `Decision`
- preferred outputs: decision matrices, split follow-up packets
- should not own: broad runtime rewrites or whole-vault audits

### Governance Sync Agent

- owns: branch-policy reconciliation, Real-first law treatment, policy alignment
- class fit: `Decision`, `Control Plane`
- preferred outputs: canonical-vs-overlay classifications, branch policy notes
- should not own: speculative Dream prose generation by default

### Vault Steward Agent

- owns: Vault Steward lifecycle law, Dream-side operational state, queue/runtime artifact interpretation
- class fit: `Audit`, `Decision`, `Implementation`
- preferred outputs: lifecycle classifications, bounded runtime follow-ups
- should not own: unrelated validator, Symphony, or A2C policy work

### A2C Runtime Agent

- owns: query, recon, watch, autonomous, ingest, and A2C runtime semantics
- class fit: `Implementation`
- preferred outputs: safer contracts, runtime behavior changes, docs and tests
- should not own: markdown queue redesign or broad orchestration doctrine

### A2C Test Agent

- owns: A2C contract tests and runtime drift proof
- class fit: `Test Net`
- preferred outputs: bounded tests, fixtures, runtime-semantic evidence
- should not own: new A2C features unless they are required to make the contract testable

### A2C Intake Agent

- owns: raw operator-input staging and normalized intake shape
- class fit: `Control Plane`
- preferred outputs: intake contracts, staging rules, normalized-field definitions
- should not own: final queue mutation or autonomous execution

### Task Packet Agent

- owns: mapping normalized intake into N1Hub task packets
- class fit: `Control Plane`, `Migration`
- preferred outputs: packet-builder rules, defer/reject posture, queue-insertion rules
- should not own: direct packet execution or lane routing doctrine

### N1 Routing Agent

- owns: user-input class routing into assistant, task, capsule, or defer lanes
- class fit: `Control Plane`
- preferred outputs: routing matrices, lane-selection rules, command packet alignment
- should not own: intake normalization or packet generation contracts by itself

### Diff Test Agent

- owns: branch route and merge/promotion test evidence
- class fit: `Test Net`
- preferred outputs: route-level contracts, auth/conflict/scoped-merge proof
- should not own: merge-engine redesign

### Cluster Refactor Agent

- owns: one bounded extraction step inside the active architecture cluster
- class fit: `Implementation`, `Migration`
- preferred outputs: one seam extraction, reduced blast radius, stronger tests
- should not own: cross-cluster opportunistic cleanup

### Validator Boundary Agent

- owns: validator CLI/API/OpenAPI parity and public contract coherence
- class fit: `Implementation`, `Test Net`
- preferred outputs: API/CLI parity, contract tests, refreshed OpenAPI
- should not own: capsule-content migration

### Symphony Contract Agent

- owns: Symphony workflow law, prompt rendering, tracker state, and orchestration seams
- class fit: `Implementation`, `Migration`
- preferred outputs: clearer module boundaries, workflow/code alignment
- should not own: unrelated N1 or A2C orchestration

### Architecture Steward Agent

- owns: architecture-pressure enforcement, changed-files guardrails, waiver discipline
- class fit: `Control Plane`
- preferred outputs: CI-safe enforcement rules, waiver notes, architecture-policy updates
- should not own: broad runtime refactors that belong to the current cluster lane

### Review Systems Agent

- owns: hostile second-pass review lanes and proof-bearing review artifacts
- class fit: `Control Plane`, `Test Net`
- preferred outputs: review contracts, verdict formats, blocked-state handling
- should not own: implementation mutation by the reviewer lane

### Autonomy Systems Agent

- owns: scheduler-facing one-pass iteration behavior and bounded automation loops
- class fit: `Control Plane`
- preferred outputs: run-budget rules, scheduler examples, bounded recurring invocation contracts
- should not own: hidden immortal daemons

### Context Systems Agent

- owns: hot/warm/cold load topology and routing clarity across context surfaces
- class fit: `Control Plane`
- preferred outputs: topology matrices, load rules, compression/retrieval criteria
- should not own: fashionable context sprawl without routing value

### Capsule Planning Agent

- owns: capsule-native execution design and mapping from markdown buffer to vault-native planning
- class fit: `Control Plane`, `Migration`
- preferred outputs: roadmap/goal/milestone/task control-plane design, follow-up slices
- should not own: immediate full-vault migration by default

## Lane Selection Heuristics

Choose the owner lane by asking:

1. Which public boundary is most at risk?
2. Which artifact type should come out of this pass?
3. Which verification block best matches the work?

If the answers point in different directions, split the task.

## Rule

Do not create a new lane just because a task sounds important. Create a new lane only when the current ownership map cannot explain the boundary cleanly.
