<!-- @anchor doc:a2c.reference links=doc:n1hub.readme,doc:n1hub.tools,doc:n1hub.low-blast-radius-architecture,arch:a2c.runtime,flow:a2c.workspace-recon note="Technical reference for the repo-native A2C runtime." -->
# A2C Runtime

The canonical `Anything-to-Capsules` runtime for N1Hub is implemented in TypeScript under [`lib/a2c`](/home/n1/n1hub.com/lib/a2c) and exposed through [`scripts/a2c`](/home/n1/n1hub.com/scripts/a2c).

## Runtime Layout

- Vault capsules: [`data/capsules`](/home/n1/n1hub.com/data/capsules)
- Runtime index: [`data/private/a2c/index.json`](/home/n1/n1hub.com/data/private/a2c/index.json)
- Tasks, queue state, manifests, staged inputs: [`data/private/a2c`](/home/n1/n1hub.com/data/private/a2c)
- Reports, scheduler state, daemon PIDs, autonomous run history: [`reports/a2c`](/home/n1/n1hub.com/reports/a2c)
- Protocol corpus and activation material: [`docs/a2c`](/home/n1/n1hub.com/docs/a2c)

## Architecture Doctrine

A2C is expected to operate inside the N1Hub low-blast-radius architecture:

- `a2c:recon` should confirm that the instruction stack and architecture doctrine are present before deeper mutation.
- `data/private/a2c` and `reports/a2c` remain A2C-owned namespaces.
- capsule-shaped outputs should cross back into trusted repository state through validator-owned contracts instead of ad hoc file-shape assumptions.

## Entry Points

- `npm run a2c:activate`
  Validates the A2C protocol corpus in [`docs/a2c`](/home/n1/n1hub.com/docs/a2c) and confirms readiness.

- `npm run a2c:recon`
  Produces a repo-aware workspace intelligence report against the current N1Hub root. Its cluster-context scan is now intentionally limited to `lib/a2c`, `__tests__/a2c`, and dedicated A2C docs under `docs/a2c*`.

- `npm run a2c:index`
  Rebuilds the TypeScript runtime graph index from [`data/capsules`](/home/n1/n1hub.com/data/capsules).

- `npm run a2c:status`
  Reports aggregate graph health, daemon state, void count, and merge pressure.

- `npm run a2c:query -- --query "<text>"`
  Returns ranked capsule matches in read-only mode by default. Pass `--synthesize-on-fly` only when you explicitly want a transient synthesis draft written under [`data/private/a2c`](/home/n1/n1hub.com/data/private/a2c).

- `npm run a2c:investigate -- --input <path>`
  Combines recon plus query context for a candidate input. Its query step stays read-only by default and accepts `--synthesize-on-fly` as the explicit transient-write opt-in.

- `POST /api/a2c/ingest`
  Accepts `operatorInput.text` plus optional source metadata, stages a raw artifact under [`data/private/a2c/intake/archive_raw`](/home/n1/n1hub.com/data/private/a2c/intake/archive_raw), and writes the normalized intake contract under [`data/private/a2c/intake/normalized`](/home/n1/n1hub.com/data/private/a2c/intake/normalized) for later packet building. The normalized contract now carries verification and stop-condition hints so packetization can preserve bounded proof and pause rules.

- `npx tsx scripts/a2c/packetize.ts --intake-id <id>`
  Consumes one normalized intake artifact, renders a candidate in the existing `TO-DO` task-template shape, and stages JSON plus markdown packet candidates under [`data/private/a2c/tasks/packet_candidates`](/home/n1/n1hub.com/data/private/a2c/tasks/packet_candidates). This does not auto-promote into [`TO-DO/tasks`](/home/n1/n1hub.com/TO-DO/tasks).

- `npm run a2c:voids`
  Runs structural void mapping and writes the frontier report into [`data/private/a2c/tasks`](/home/n1/n1hub.com/data/private/a2c/tasks).

- `npm run a2c:weave`
  Runs resonance clustering and proposed merge analysis.

- `npm run a2c:watch:once`
  Dry-runs the intake watcher against [`data/private/a2c/intake/dropzone`](/home/n1/n1hub.com/data/private/a2c/intake/dropzone).

- `npm run a2c:cron:once`
  Dry-runs the scheduler and shows the next frontier/weaver/apoptosis jobs.

- `npm run a2c:auto -- --input <path>`
  Runs the full autonomous chain in dry-run mode against the repo-native layout.

## Expected Workflow

1. `npm run a2c:activate`
2. `npm run a2c:recon`
3. `npm run a2c:index`
4. `npm run a2c:status`
5. Run `a2c:voids`, `a2c:weave`, or `a2c:auto` depending on intent.

## Validation Note

The authoritative gate for live N1Hub capsules remains the TypeScript validator and its API/CLI surfaces.

Audit freshness rule: A2C audit and autonomous dry-run paths now treat the runtime index as stale when index node ids drift from the live real-capsule geometry, not only when the index schema is invalid.

TypeScript-first workflow:

1. `npm run a2c:activate`
2. `npm run a2c:recon`
3. `npm run a2c:index`
4. `npm run a2c:status`
5. A2C runtime tasks (`voids`, `weave`, `auto`, `query`) through TypeScript scripts
6. Capsule governance and promotion through `npm run validate:all` and `npm run audit:capsules`
