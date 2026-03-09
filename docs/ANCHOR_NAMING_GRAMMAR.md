<!-- @anchor doc:governance.naming-grammar links=doc:governance.anchors-spec,doc:governance.patterns,doc:governance.risk-register,doc:governance.terminology note="Anchor naming grammar and category intent for N1Hub." -->
# Anchor Naming Grammar

This document defines the practical naming rules for anchor IDs in `n1hub.com`.

## ID Shape

`<category>:<name>`

- `category`: `^[a-z][a-z0-9_-]*$`
- `name`: `^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$`

## Category Intent

- `arch`: architecture backbone and subsystem boundaries
- `interface`: public API or import surface
- `invariant`: non-negotiable rule that must hold
- `flow`: ordered process path
- `script`: CLI or automation entrypoint
- `doc`: policy, onboarding, or reference document node
- `test`: verification contract

## Naming Rules

1. Use nouns and stable semantics, not temporary implementation details.
2. Use hyphens for lexical units and dots for hierarchy.
3. Keep depth readable, usually 2 to 4 segments in `name`.
4. Rename IDs only when semantics change, not when files move.
5. Keep category intent strict; do not mix runtime and policy semantics.

## N1Hub Examples

- `arch:repo.entrypoint`
- `arch:validator.engine`
- `arch:a2c.runtime`
- `arch:symphony.runtime`
- `arch:graph.runtime`
- `interface:validator.public-api`
- `flow:a2c.workspace-recon`
- `script:validator.cli`
- `script:anchors.scorecard`
- `doc:workflow.ninfinity-night-shift`
