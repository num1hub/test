<!-- @anchor doc:governance.patterns links=doc:governance.anchors-spec,doc:governance.naming-grammar,doc:governance.risk-register,doc:n1hub.readme,script:extract.anchors,script:validate.anchors note="Operational patterns that keep N1Hub anchor governance deliberate and maintainable." -->
# Anchor Governance Patterns

This document captures the patterns that keep anchor governance useful inside N1Hub.

## High-Signal Placement

Anchor only boundaries that matter operationally:

- root docs and governance docs
- public runtime barrels and API boundaries
- critical flows across validator, A2C, Symphony, and graph runtime
- governance scripts and verification contracts

Avoid anchor spam in low-level helpers.

## Spine-First Orientation

Keep a short, explicit architecture spine and enforce chain continuity.

In N1Hub the spine bridges:

1. repository entry
2. governance spec
3. app root
4. validator API boundary
5. validator engine
6. A2C runtime
7. Symphony runtime
8. graph runtime

## Scoped Rollout

N1Hub is not a greenfield anchor-only repository.

Use governed targets and explicit lint scope so anchor governance lands cleanly in the live architecture without forcing mass edits across `data/capsules/` or historical docs.

## Cross-Subsystem Bridges

Maintain explicit links across:

- docs to enforcement scripts
- validator docs to runtime and CLI surfaces
- workflow docs to Symphony runtime and prompt rendering
- A2C docs to runtime and recon flow
- graph docs to graph runtime
- tests to the interfaces and scripts they defend

Bridge quality matters more than raw anchor count.

## Deterministic Governance Loop

Use the same loop on every anchor-governance change:

1. `npm run extract:anchors`
2. `npm run validate:anchors`
3. `npm run verify:root-docs`
4. `npm run test:anchors`
5. `npm run check:anchors:full`
