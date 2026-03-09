#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';

import { validateCapsule } from '../lib/validator';
import type { CapsuleLink, CapsuleRoot } from '../lib/validator/types';
import { computeIntegrityHash, isRecordObject } from '../lib/validator/utils';

const CAPSULES_DIR = path.join(process.cwd(), 'data', 'capsules');

type CapsuleAction = {
  name: string;
  intent: string;
  command?: string;
  hitl_required?: boolean;
};

type CapsulePatch = {
  version: string;
  content: string;
  summary: string;
  keywords: string[];
  links?: CapsuleLink[];
  actions?: CapsuleAction[];
};

const PATCHES: Record<string, CapsulePatch> = {
  'capsule.foundation.a2c-ingest.v1': {
    version: '1.1.0',
    content: `# A2C Stage: Ingest

## 1. Definition and Essence
Ingest is the operational capture boundary of the repo-native A2C runtime. In N1Hub it is no longer just a conceptual first step; it is the watcher, staging, and queue-entry discipline implemented by \`scripts/a2c/watch.ts\`, \`scripts/a2c/investigate.ts\`, and the TypeScript ingestion helpers under \`lib/a2c\`.

## 2. Runtime Responsibilities
- Probe incoming files for stability before mutation. The watcher waits for file size and mtime to stop changing instead of ingesting half-written artifacts.
- Archive raw intake before transformation. Repo-native runs preserve original dropzone material in the A2C intake archive rather than trusting only derived payloads.
- Stage work into deterministic queue artifacts. Each queued item receives a SHA-256 based filename, a sidecar \`.meta.json\`, staged timestamp, source hash, and attempt counter.
- Append queue-ledger events such as \`STAGED\`, \`STAGED_REUSED\`, and later state transitions so operators can reconstruct how an item entered the pipeline.
- Triage new material against the live vault before heavy mutation. The runtime already distinguishes exact copy, increment, contradiction, resonance, and genuinely new material.

## 3. Repo-Native Flow
The live N1Hub flow is:
dropzone -> raw archive -> pipeline quarantine/workspace -> investigation -> transmutation run.

That means ingest is both evidence preservation and execution preparation. It protects the pipeline from unstable files, duplicate chaos, and invisible queue drift before Normalize or Synthesize begin.

## 4. Integration
- **Background Agent Runtime:** supplies watcher and scheduler discipline.
- **Quarantine Buffer:** acts as the first holding area for staged artifacts before trust is earned.
- **A2C Normalize:** receives stable, traced, and triaged inputs rather than arbitrary files.
- **Epistemic Ledger:** can later explain why an intake item was treated as increment, contradiction, or resonance.

## 5. Philosophical Alignment
Ingest serves To Dig Deep by refusing shallow file transfer. It captures provenance, preserves raw evidence, and makes the first byte of knowledge traceable before any compression or interpretation happens.
`,
    summary:
      'A2C Stage: Ingest is the repo-native capture and staging boundary of the pipeline, not merely a conceptual first step. In the current runtime it watches intake lanes, waits for file stability, archives raw artifacts, creates SHA-256 keyed queue items with sidecar metadata, and writes queue-ledger events before deeper mutation begins. It also performs first-pass routing into exact copy, increment, contradiction, resonance, or new material. This matters because every later stage depends on trustworthy intake state rather than on half-written files, missing provenance, or invisible queue drift. Ingest therefore turns raw arrival into auditable pipeline readiness.',
    keywords: [
      'a2c',
      'ingest',
      'dropzone',
      'archive-raw',
      'queue-ledger',
      'stable-probe',
      'quarantine-stage',
      'source-triage',
      'run-manifest',
      'provenance',
    ],
    links: [
      { target_id: 'capsule.foundation.a2c.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.a2c-normalize.v1', relation_type: 'supports' },
      { target_id: 'capsule.foundation.capsuleos.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.foundation.to-dig-deep.v1', relation_type: 'implements' },
      { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.quarantine-buffer.v1', relation_type: 'references' },
    ],
    actions: [
      {
        name: 'watch_dropzone_once',
        intent: 'Run one repo-native watcher cycle and report which intake files are ready for staging.',
        command: 'tsx scripts/a2c/watch.ts --once --dry-run',
        hitl_required: false,
      },
      {
        name: 'investigate_intake_batch',
        intent: 'Classify an intake batch for risk, conflict, and recommended execution mode before mutation.',
        command:
          'tsx scripts/a2c/investigate.ts --workspace-root . --kb-root . --input <path> --dry-run',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.a2c-normalize.v1': {
    version: '1.1.0',
    content: `# A2C Stage: Normalize

## 1. Definition and Essence
Normalize is the discipline that converts messy source material and loose capsule drafts into forms the rest of A2C can trust. In the current runtime this logic is distributed across the prompt-pack protocols in \`docs/a2c\`, TypeScript ingestion/query helpers under \`lib/a2c\`, and shared schema utilities rather than existing as a decorative stage label.

## 2. Runtime Responsibilities
- Detect modality from filename, content type, and text shape. The current compiler distinguishes code, legal, chat, concept, and general prose.
- Derive semantic lenses dynamically. Adversarial, axiomatic, and temporal lenses are activated from source signals so the extractor does not treat every document with the same posture.
- Strip or harmonize unstable structure before downstream use. Payload sanitation aligns metadata, source objects, lists, enums, vector fields, and recursive geometry with the active schema contract.
- Preserve ambiguity as warnings instead of silently smoothing it away.
- Scan retrieval-facing fields for PII and redact when summaries, keywords, entities, or vector hints would otherwise leak sensitive data.

## 3. Why This Matters
Many failures that look semantic are actually normalization failures. If modality is misread, if PII survives into retrieval fields, or if payload structure drifts from the active schema, then later synthesis and validation inherit noise disguised as intelligence.

## 4. Integration
- **A2C Ingest:** supplies the unstable raw material.
- **A2C Segment / Extract:** consume normalized text, modality signals, and semantic-lens rules.
- **Agent Context Engineering:** benefits from cleaner prompt directives and bounded context.
- **CapsuleOS Schema:** remains the contract Normalize must prepare material to satisfy.

## 5. Philosophical Alignment
Normalize serves To Dig Deep by reducing noise without flattening evidence. It makes structure explicit, keeps ambiguity visible, and refuses to let formatting chaos masquerade as deep reasoning.
`,
    summary:
      'A2C Stage: Normalize is the runtime discipline that makes later reasoning trustworthy by cleaning structure before the system starts acting smart. In the current stack it detects modality, activates adversarial or temporal lenses, sanitizes payload shape against the active schema, and redacts PII from retrieval-facing fields such as summaries, keywords, entities, and vector hints. This matters because many downstream failures are upstream normalization failures wearing semantic clothing. By making canonicalization, lens selection, ambiguity handling, and privacy hygiene explicit, Normalize gives Segment, Extract, and Validate a substrate they can compute over without inheriting avoidable noise.',
    keywords: [
      'a2c',
      'normalize',
      'modality-detection',
      'semantic-lenses',
      'schema-sanitization',
      'pii-redaction',
      'dialect-normalization',
      'canonicalization',
      'ambiguity-handling',
      'prompt-compiler',
    ],
    links: [
      { target_id: 'capsule.foundation.a2c.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.a2c-ingest.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.a2c-segment.v1', relation_type: 'supports' },
      { target_id: 'capsule.foundation.capsuleos.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.foundation.agent-context-engineering.v1', relation_type: 'references' },
    ],
    actions: [
      {
        name: 'detect_modality_profile',
        intent: 'Classify an input as code, legal, chat, concept, or prose and attach the right semantic lenses.',
        hitl_required: false,
      },
      {
        name: 'sanitize_payload_for_schema',
        intent: 'Normalize metadata, vector fields, lists, and recursive structure to the active schema before sealing.',
        hitl_required: false,
      },
      {
        name: 'redact_pii_from_retrieval_fields',
        intent: 'Remove sensitive data from summary, keyword, entity, and vector-hint surfaces.',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.a2c-synthesize.v1': {
    version: '1.1.0',
    content: `# A2C Stage: Synthesize

## 1. Definition and Essence
Synthesize is where the current A2C runtime stops being a formatter and becomes a reasoning system. In N1Hub this stage is powered by the prompt-pack stack in \`docs/a2c\`, graph-aware retrieval in \`lib/a2c/query.ts\`, contradiction checks in \`lib/a2c/parliament.ts\`, and TypeScript validation/repair loops.

## 2. Runtime Composition
- Generate a fractal summary of the whole source before chunk-local work begins. Every local unit carries Tweet / Brief / Axiom context rather than being processed in isolation.
- Build Prompt Singularity packets with explicit schema contract, chain-of-verification, anti-sycophancy rules, and ReAct tool instructions.
- Use dynamic few-shot examples and vault-backed few-shots so synthesis reflects real graph patterns instead of only generic prompt lore.
- Run the ReAct loop with \`query_graph\` and \`check_contradiction\` when uncertainty remains.
- Self-heal malformed JSON outputs and then pass them through the citation guillotine, which requires exact substring quotes for claims and entities.
- Escalate high-impact contradiction clusters to Parliament and inject the resulting resolution into the candidate capsule.

## 3. Why This Matters
Without this stack, synthesis would be fancy summarization. With it, synthesis becomes governed assembly: context-rich, contradiction-aware, quote-anchored, and legible when it fails.

## 4. Integration
- **A2C Extract:** provides the raw claims and entities.
- **A2C Link:** receives graph-situated candidates instead of isolated drafts.
- **Epistemic Parliament:** arbitrates conflict-heavy cases.
- **Agent Context Engineering:** supplies bounded context-pack discipline.

## 5. Philosophical Alignment
Synthesize serves To Dig Deep by forcing integration to remain evidence-bound. It rewards coherent assembly, but only after the source survives verification, contradiction checks, and exact-anchor discipline.
`,
    summary:
      'A2C Stage: Synthesize is the point where the runtime turns extraction into governed assembly rather than into polished paraphrase. The live stack generates fractal source summaries, builds Prompt Singularity context packs, runs ReAct graph checks, self-heals malformed JSON, verifies exact citation anchors, and escalates serious contradiction clusters to Parliament before a candidate is trusted. This matters because capsules need more than coherence: they need quote-backed claims, graph-aware context, and failure modes that remain inspectable when reasoning goes wrong. Synthesize therefore functions as the evidence-bound composition layer of A2C, not merely as its prose-generation layer.',
    keywords: [
      'a2c',
      'synthesize',
      'prompt-singularity',
      'fractal-summary',
      'react-oracle',
      'citation-guillotine',
      'chain-of-verification',
      'few-shots',
      'parliament-escalation',
      'capsule-draft',
    ],
    links: [
      { target_id: 'capsule.foundation.a2c.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.a2c-extract.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.a2c-link.v1', relation_type: 'supports' },
      { target_id: 'capsule.foundation.capsuleos-schema.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.foundation.agent-context-engineering.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.n-infinity.parliament.v1', relation_type: 'references' },
    ],
    actions: [
      {
        name: 'run_autonomous_dry',
        intent: 'Execute the full repo-native autonomous pipeline in dry-run mode to inspect synthesized candidate behavior.',
        command:
          'tsx scripts/a2c/autonomous.ts --workspace-root . --kb-root . --input <path> --dry-run',
        hitl_required: false,
      },
      {
        name: 'query_context_before_synthesis',
        intent: 'Retrieve ranked vault neighborhoods before composing a candidate capsule.',
        command: 'tsx scripts/a2c/query.ts --kb-root . --query "<concept>" --synthesize-on-fly',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.a2c-link.v1': {
    version: '1.1.0',
    content: `# A2C Stage: Link

## 1. Definition and Essence
Link is the graph-situating stage of the A2C runtime. In N1Hub it is not a naive nearest-neighbor add-on. It uses the ReAct Graph Oracle, contradiction checks, and confidence calibration to decide whether a candidate should connect, conflict, merge, or stay sparse.

## 2. Runtime Responsibilities
- Build a query index from live graph nodes using titles, summaries, keywords, entities, and validation metadata.
- Use \`query_graph\` to rank relevant capsules by token overlap plus validation and provenance strength.
- Use \`check_contradiction\` to test claim tension. When evidence rows exist, the runtime can ask Parliament for a stronger verdict; otherwise it falls back to conservative lexical contradiction heuristics.
- Calibrate confidence upward only when graph evidence was actually consulted. Complex claims without graph verification are explicitly capped.
- Preserve conflict instead of silently overwriting it. If contradiction targets exist, increment mode is blocked and the new claim must branch or wait for governance.
- Deduplicate links and keep topology sparse enough to stay meaningful.

## 3. Why This Matters
The graph becomes unusable when linking is either timid or promiscuous. Link protects the middle path: enough topology to compute and navigate, not enough noise to destroy trust.

## 4. Integration
- **A2C Synthesize:** provides the candidate capsule.
- **Epistemic Ledger:** records claim collisions and unresolved tension.
- **N-Infinity Parliament:** becomes the escalation lane for difficult contradiction clusters.
- **A2C Hash:** seals only after topology and graph evidence are in place.

## 5. Philosophical Alignment
Link serves To Dig Deep by connecting ideas with proof-sensitive discipline. It prefers explainable structure over dense but shallow graph decoration.
`,
    summary:
      'A2C Stage: Link is the graph-discipline layer that decides whether a candidate capsule should connect, collide, merge, or remain sparse. In the current runtime it queries the live graph, ranks targets by lexical overlap plus provenance and validation strength, checks contradictions through Parliament-aware tooling, and only raises confidence for complex claims when graph evidence was actually consulted. It also blocks silent overwrite: contradiction targets disable naive increment mode and force branching or review. This matters because graph quality collapses under both under-linking and over-linking. Link therefore keeps topology computable, meaningful, and auditable before the seal is applied.',
    keywords: [
      'a2c',
      'link',
      'react-graph-oracle',
      'query-graph',
      'check-contradiction',
      'confidence-calibration',
      'target-resolution',
      'duplicate-detection',
      'conflict-routing',
      'graph-topology',
    ],
    links: [
      { target_id: 'capsule.foundation.a2c.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.a2c-synthesize.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.a2c-hash.v1', relation_type: 'supports' },
      { target_id: 'capsule.foundation.capsuleos.relation-types.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.foundation.epistemic-ledger.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.n-infinity.parliament.v1', relation_type: 'references' },
    ],
    actions: [
      {
        name: 'query_vault_for_targets',
        intent: 'Search the graph for likely target capsules before a relation is minted.',
        command: 'tsx scripts/a2c/query.ts --kb-root . --query "<concept>"',
        hitl_required: false,
      },
      {
        name: 'run_parliament_resolution',
        intent: 'Ask the triad debate engine to arbitrate a contradiction-heavy linking decision.',
        command:
          'tsx scripts/a2c/parliament.ts --kb-root . --question "<question>" --claim-a "<claim-a>" --claim-b "<claim-b>" --dry-run',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.a2c-hash.v1': {
    version: '1.1.0',
    content: `# A2C Stage: Hash

## 1. Definition and Essence
Hash is the identity and seal discipline of the A2C runtime. The live system does not treat sealing as a decorative checksum. The repo-native A2C stack and the application validator recompute integrity from the same four-root geometry: metadata, core_payload, neuro_concentrate, and recursive_layer.

## 2. Runtime Responsibilities
- Keep semantic-hash parity between metadata and neuro_concentrate.
- Recompute \`integrity_sha3_512\` after payload sanitation or any graph / neuro mutation via the shared canonical JSON geometry.
- Surface integrity mismatch as a hard failure rather than an informational warning.
- Preserve deterministic identity across merge, salvage, transient synthesis, Parliament resolution, and decay workflows.
- Make seal generation inspectable enough that later validators can explain both expected and actual hash state.

## 3. Cross-Stack Reality
The repo-native A2C runtime recomputes seals during staging, repair, synthesis, and recovery flows. The application validator uses \`computeIntegrityHash\` as the live admission check for N1Hub. That shared geometry is what keeps repo-native A2C work aligned with the current application truth.

## 4. Integration
- **A2C Link:** must finish topology before hashing.
- **A2C Validate:** treats any mismatch or malformed digest as immediate failure.
- **CapsuleOS Semantic Hash:** governs compact semantic identity.
- **Core Constitution:** gives sealing its non-negotiable legal force.

## 5. Philosophical Alignment
Hash serves To Dig Deep by making identity reproducible. It prevents a capsule from claiming one thing while physically storing another.
`,
    summary:
      'A2C Stage: Hash is the shared identity discipline that keeps repo-native A2C aligned with the current N1Hub validator. The runtime recomputes seals after sanitation, salvage, synthesis, Parliament output, and decay, while the application validator rechecks the same four-root canonical geometry before a capsule is trusted. This matters because integrity cannot be a best-effort checksum: it is the exact line between a stable artifact and silent drift. Hash therefore protects both semantic parity and cryptographic parity, ensuring that what a capsule claims to be, what the runtime wrote, and what the application validates are all the same object.',
    keywords: [
      'a2c',
      'hash',
      'sha3-512',
      'canonical-json',
      'semantic-hash-parity',
      'refresh-payload-integrity',
      'g16',
      'seal',
      'validator',
      'capsule-identity',
    ],
    links: [
      { target_id: 'capsule.foundation.a2c.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.a2c-link.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.a2c-validate.v1', relation_type: 'supports' },
      { target_id: 'capsule.foundation.capsuleos.semantic-hash.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.core.constitution.v1', relation_type: 'references' },
    ],
    actions: [
      {
        name: 'recompute_integrity_seal',
        intent: 'Refresh semantic and cryptographic identity after candidate mutation or recovery.',
        hitl_required: false,
      },
      {
        name: 'validate_live_seal',
        intent: 'Confirm that the stored SHA3-512 seal matches the application validator computation.',
        command: 'npm run validate -- data/capsules/<capsule-file>.json --ids-file <ids-file>',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.a2c-validate.v1': {
    version: '1.2.0',
    content: `# A2C Stage: Validate

## 1. Definition and Essence
Validate is the trust boundary where an A2C candidate either earns graph admission or gets stopped with enough forensic detail to understand why. In the repo-native stack this work spans TypeScript draft validation inside \`lib/a2c/ingest.ts\`, runtime auditing through \`scripts/a2c/audit.ts\`, and the TypeScript validator that remains the final admission authority for N1Hub.

## 2. Runtime Responsibilities
- Execute structural, link, provenance, vector, contradiction, and seal checks against candidate payloads.
- Build a forensic black-box packet with gate results, integrity forensics, fatal error data, and recovery recommendation when a serious failure occurs.
- Attempt conservative salvage when failures are recoverable.
- Apply the narrow architect-override path only for explicitly eligible failure classes and always with auditable rationale.
- Route unrecoverable candidates to quarantine instead of letting malformed knowledge leak into live state.

## 3. Cross-Stack Reality
Repo-native A2C validation is where the pipeline explains itself during ingestion and refinement. The application validator is the live N1Hub promotion gate. Deep integration means the layers should complement each other: runtime validation for pipeline forensics and recovery, application validation for final capsule law.

## 4. Integration
- **A2C Hash:** supplies sealed candidates.
- **Quarantine Buffer:** stores failed or disputed artifacts with diagnostics.
- **Audit Log / Epistemic Ledger:** preserve why a candidate passed, failed, or was forced through override.
- **A2C Emit:** may only publish candidates that survive the trust boundary.

## 5. Philosophical Alignment
Validate serves To Dig Deep by making failure useful. It refuses quiet corruption, produces evidence-rich diagnostics, and treats admission as earned rather than presumed.
`,
    summary:
      'A2C Stage: Validate is the trust boundary where the repo-native pipeline explains why a candidate deserves admission, not just whether it passed. The current stack combines runtime checks, forensic black-box packets, salvage attempts, architect-override discipline, repo-native audit surfaces, and the application validator that remains the final promotion gate in N1Hub. This matters because reliable pipelines need visible failure semantics, not only green outcomes. Validate therefore acts as both law and observability layer: it blocks malformed knowledge, records exactly where the break occurred, and preserves a deterministic path toward retry, quarantine, override, or rejection.',
    keywords: [
      'a2c',
      'validate',
      '16-gates',
      'forensic-black-box',
      'salvage-run',
      'architect-override',
      'ts-validator',
      'runtime-auditor',
      'quarantine-routing',
      'seal-verification',
    ],
    links: [
      { target_id: 'capsule.foundation.a2c.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.a2c-hash.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.a2c-emit.v1', relation_type: 'supports' },
      { target_id: 'capsule.foundation.capsuleos.16-gates.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.foundation.quarantine-buffer.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.audit-log.v1', relation_type: 'references' },
    ],
    actions: [
      {
        name: 'audit_vault_runtime',
        intent: 'Run the TypeScript A2C runtime audit for dialect, seal, and governance diagnostics.',
        command: 'tsx scripts/a2c/audit.ts --kb-root . --expected-dialect n1hub',
        hitl_required: false,
      },
      {
        name: 'validate_real_capsule',
        intent: 'Run the live N1Hub validator on a capsule file with the full existing-ID set.',
        command: 'npm run validate -- data/capsules/<capsule-file>.json --ids-file <ids-file>',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.a2c-emit.v1': {
    version: '1.1.0',
    content: `# A2C Stage: Emit

## 1. Definition and Essence
Emit is the publication discipline that turns a validated candidate into durable repo-native state. In N1Hub this is not just a file write. It includes persistence into \`data/capsules\`, queue cleanup, manifest updates, and index handoff so the rest of the runtime can immediately reason over the result.

## 2. Runtime Responsibilities
- Write accepted capsules to the live vault path used by the application.
- Preserve run manifest and queue-ledger context so publication can be reconstructed after the fact.
- Keep failed queue items recoverable through quarantine and exhausted retry items visible through failed-retention lanes instead of deleting them.
- Trigger index rebuild semantics so the graph reflects new reality after publication.
- Distinguish accepted publication from rejected or deferred artifacts rather than mixing them in one storage surface.

## 3. Repo-Native Routing
The current runtime maps accepted capsules into \`data/capsules\`, pipeline state into \`data/private/a2c/ingest_pipeline\`, task manifests into \`data/private/a2c/tasks\`, and operational telemetry into \`reports/a2c\`. Emit is the stage that makes those boundaries coherent.

## 4. Integration
- **A2C Validate:** is the only safe upstream source.
- **Quarantine Buffer:** receives unsafe or disputed artifacts.
- **Background Agent Runtime:** supplies durable run identity and scheduler context.
- **Index Rebuild:** turns publication into graph-visible state.

## 5. Philosophical Alignment
Emit serves To Dig Deep by making acceptance accountable. Knowledge is not real because it was generated; it is real because it was validated, published cleanly, and made legible to the rest of the system.
`,
    summary:
      'A2C Stage: Emit is the repo-native publication boundary where a validated candidate becomes durable system state rather than remaining a promising internal object. The current runtime writes accepted capsules into the live vault, preserves run manifests and queue-ledger traces, keeps failed items visible through quarantine or failed-retention lanes, and hands publication off to index rebuild logic so the graph reflects new reality. This matters because acceptance without disciplined persistence is not trustworthy state. Emit therefore separates published knowledge from staged, failed, or recoverable artifacts and makes the transition into live graph presence operationally legible.',
    keywords: [
      'a2c',
      'emit',
      'data-capsules',
      'run-manifest',
      'failed-retention',
      'index-handoff',
      'idempotent-write',
      'queue-cleanup',
      'reports-a2c',
      'publication',
    ],
    links: [
      { target_id: 'capsule.foundation.a2c.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.a2c-validate.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.workspace.v1', relation_type: 'supports' },
      { target_id: 'capsule.foundation.capsuleos.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.foundation.quarantine-buffer.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
    ],
    actions: [
      {
        name: 'rebuild_runtime_index',
        intent: 'Refresh the repo-native graph index after successful publication.',
        command: 'tsx scripts/a2c/index.ts --kb-root .',
        hitl_required: false,
      },
      {
        name: 'inspect_publication_status',
        intent: 'Inspect vault, queue, and daemon health after emit or recovery work.',
        command: 'tsx scripts/a2c/status.ts --kb-root . --json',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.n-infinity.weaver.v1': {
    version: '1.2.0',
    content: `# N-Infinity Weaver

## 1. Definition
Weaver is the graph-resonance scanner of the runtime. In the current code it is no longer imagined as a vague soft-link muse; \`scripts/a2c/weave.ts\` and \`lib/a2c/weaver.ts\` compute Jaccard similarity over live graph tokens, form resonance clusters, block unsafe merge pairs, and emit a reviewable merge report.

## 2. Runtime Mechanics
- Build token sets from title, summary, keywords, entities, and tags.
- Scan pairwise similarity with posting budgets and per-node pair limits so graph maintenance stays bounded.
- Skip merge pairs already protected by \`duplicates\` or \`derived_from\` relations.
- Turn high-similarity pairs into resonance clusters with average similarity and pair-count metrics.
- Choose primary merge candidates and emit explicit merge commands in Markdown instead of mutating the graph silently.
- Surface unresolved contradiction edges alongside merge proposals so relational cleanup never hides epistemic tension.

## 3. Why This Matters
Weaver is about compaction without erasure. It looks for places where the vault is saying the same thing many times, but it keeps governance in the loop instead of auto-collapsing history.

## 4. Integration
- **Capsule Graph Maintenance:** uses Weaver outputs as reviewable work orders.
- **Epistemic Parliament:** remains the lane for contradiction-heavy clusters.
- **A2C Link / Merge Capsules:** inherit the merge candidates Weaver identifies.

## 5. Philosophical Alignment
Weaver serves To Dig Deep by compressing redundant structure only after the system can explain why those nodes resonate and which edges must stay visible.
`,
    summary:
      'N-Infinity Weaver is the repo-native resonance scanner that looks for merge-worthy duplication without silently rewriting graph history. The current implementation computes Jaccard similarity across node titles, summaries, keywords, entities, and tags, applies posting and pair budgets to stay bounded, skips pairs already guarded by duplicates or derived_from relations, and emits a Markdown merge-PR report with explicit commands rather than mutating the graph directly. It also lists unresolved contradiction edges beside resonance clusters so compaction does not hide tension. Weaver therefore acts as reviewable graph compression logic, not as a speculative soft-link generator detached from governance.',
    keywords: [
      'n-infinity',
      'weaver',
      'jaccard-resonance',
      'merge-pr',
      'duplicate-blocklist',
      'derived-from-blocklist',
      'contradiction-report',
      'cluster-detection',
      'autonomous-weaver',
      'graph-maintenance',
    ],
    links: [
      { target_id: 'capsule.foundation.n-infinity.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.capsule-graph-maintenance.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.capsule-job.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.night-shift-autonomy.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.capsuleos.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.foundation.capsuleos.relation-types.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.n-infinity.parliament.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.a2c-link.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.n1hub.v1', relation_type: 'supports' },
    ],
    actions: [
      {
        name: 'scan_resonance_clusters',
        intent: 'Generate merge-worthy resonance clusters and a reviewable merge PR report.',
        command: 'tsx scripts/a2c/weave.ts --kb-root . --dry-run',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.n-infinity.parliament.v1': {
    version: '1.4.0',
    content: `# N-Infinity Parliament

## 1. Definition
Parliament is the contradiction-arbitration engine of the runtime. In code it is a triad debate system implemented through \`scripts/a2c/parliament.ts\` and \`lib/a2c/parliament.ts\`: proposer, critic, and synthesizer stances are compared, evidence is ranked, and a governed resolution packet is emitted with a gate report.

## 2. Runtime Mechanics
- Gather evidence from the live index using question tokens, context IDs, contradiction neighbors, provenance, and validation strength.
- Build three role prompts through Prompt Singularity so each role reasons under the same structural contract.
- Compare proposer strength and critic strength from evidence-weighted formulas rather than from opaque sentiment.
- Emit a transcript, role prompts, monologue diagnostics, and a draft resolution capsule with explicit evidence links.
- Run a local gate verdict over the resolution capsule, including G14, G15, and G16 checks.
- Return resolution text, verdict, transcript, and candidate capsule for human or pipeline use.

## 3. Why This Matters
Parliament does not pretend contradictions disappear because a model produced fluent prose. It records who argued what, why the system leaned one way, and when a middle path must preserve tension rather than collapsing it.

## 4. Integration
- **A2C Link / Synthesize:** escalate conflict-heavy cases into Parliament.
- **Epistemic Ledger:** keeps the durable record of the dispute.
- **Quarantine Buffer:** receives cases that remain unsafe after debate.

## 5. Philosophical Alignment
Parliament serves To Dig Deep by treating disagreement as structured deliberation. It upgrades conflict from hidden noise into auditable reasoning work.
`,
    summary:
      'N-Infinity Parliament is the triad arbitration engine that turns contradiction handling into a reproducible debate instead of into private model intuition. The current runtime gathers evidence from the live index, builds proposer, critic, and synthesizer prompts through Prompt Singularity, computes verdict strength from provenance, validation, and contradiction signals, and emits a draft resolution capsule with transcript, diagnostics, and local gate report. This matters because sovereign graphs need a formal way to argue with themselves without erasing tension. Parliament therefore makes disagreement auditable, preserves middle-path outcomes when evidence is mixed, and gives A2C a disciplined escalation lane for hard conflicts.',
    keywords: [
      'n-infinity',
      'parliament',
      'triad-debate',
      'evidence-weighting',
      'resolution-capsule',
      'gate-verdict',
      'contradiction-arbitration',
      'prompt-singularity',
      'human-review',
      'governance',
    ],
    links: [
      { target_id: 'capsule.foundation.n-infinity.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.capsule-graph-maintenance.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.capsule-job.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.deepmine.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.night-shift-autonomy.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.capsuleos.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.foundation.capsuleos.confidence-vector.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.capsuleos.status-quarantined.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.epistemic-ledger.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.a2c-synthesize.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.a2c-link.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.n1hub.v1', relation_type: 'supports' },
    ],
    actions: [
      {
        name: 'run_parliament_dry',
        intent: 'Generate a draft triad resolution packet without mutating the live vault.',
        command:
          'tsx scripts/a2c/parliament.ts --kb-root . --question "<question>" --claim-a "<claim-a>" --claim-b "<claim-b>" --dry-run',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.n-infinity.gardener.v1': {
    version: '1.2.0',
    content: `# N-Infinity Gardener

## 1. Definition
Gardener is the stale-structure maintenance worker of the runtime. In code it is materially expressed by \`scripts/a2c/sweep.ts\` and \`lib/a2c/sweeper.ts\`, which scan for orphaned draft or archived capsules, measure age, recommend decay or deep archive, and can optionally apply confidence decay in place.

## 2. Runtime Mechanics
- Measure capsule age from \`updated_at\`, \`created_at\`, or file mtime.
- Restrict maintenance candidates to draft / archived capsules with zero incoming edges so the sweeper does not attack live, connected knowledge.
- Use a default stale threshold of 45 days and a deep-archive threshold of 180 days.
- Compute decay factors that lower most confidence metrics while slightly increasing contradiction pressure for stale objects.
- Write a human-review report instead of deleting anything.
- When decay is enabled, stamp a structured \`decay_note\` and recompute the integrity seal.

## 3. Why This Matters
Graphs accumulate dead matter unless someone tends them. Gardener keeps entropy visible, but it does so through reviewable state transitions rather than through destructive cleanup.

## 4. Integration
- **Capsule Graph Maintenance:** receives the stale-orphan reports.
- **Archive Policy:** uses deep-archive recommendations for longer retention decisions.
- **Night-Shift Autonomy:** is the natural execution window for hygiene sweeps.

## 5. Philosophical Alignment
Gardener serves To Dig Deep by protecting continuity. It lets knowledge age honestly and visibly instead of disappearing without lineage.
`,
    summary:
      'N-Infinity Gardener is the stale-structure maintenance worker that keeps long-lived graph matter from quietly rotting. The current runtime scans for orphaned draft or archived capsules with zero incoming edges, measures age from timestamps or file metadata, applies a 45-day stale threshold and 180-day deep-archive threshold, and can optionally decay confidence while writing a structured decay note and new integrity seal. This matters because graph health degrades through neglect long before it fails dramatically. Gardener therefore turns entropy into reviewable maintenance signals, preserving lineage and archive discipline instead of relying on silent cleanup or periodic human guesswork.',
    keywords: [
      'n-infinity',
      'gardener',
      'apoptosis-sweeper',
      'stale-orphan',
      'deep-archive',
      'confidence-decay',
      '45-day',
      '180-day',
      'graph-ecology',
      'maintenance-report',
    ],
    links: [
      { target_id: 'capsule.foundation.n-infinity.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.capsule-graph-maintenance.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.capsule-job.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.night-shift-autonomy.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.capsuleos.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.foundation.capsuleos.status-archived.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.tracker.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.n-infinity.suggestion-agent.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.n1hub.v1', relation_type: 'supports' },
    ],
    actions: [
      {
        name: 'run_apoptosis_dry',
        intent: 'Generate a stale-orphan report without mutating the live vault.',
        command: 'tsx scripts/a2c/sweep.ts --kb-root . --dry-run',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.epistemic-ledger.v1': {
    version: '1.1.0',
    content: `# Epistemic Ledger

## 1. Definition and Essence
Epistemic Ledger is the contradiction and reasoning memory of the repo-native A2C stack. In current code it is not just a place for vague uncertainty notes. Parliament, validation forensics, overrides, and contradiction-aware synthesis all expect ledger objects with explicit identity, anchors, impact, and remediation intent.

## 2. Runtime Shape
A strong ledger entry now tends to carry:
- \`entry_id\` or an equivalent stable event identity,
- a contradiction or missing-signal type,
- dual anchors such as \`primary\` and \`conflicting\`,
- impact classification,
- remediation path such as retry, quarantine, augment, or human review.

## 3. Runtime Usage
- Parliament emits contradiction-centered ledger entries when debate remains material.
- Forensic validation packets preserve epistemic tension alongside seal and gate diagnostics.
- A2C synthesis can keep contradiction pressure visible instead of hiding it under polished summaries.
- Override and recovery flows gain historical memory instead of acting as opaque exceptions.

## 4. Why This Matters
Without the ledger, the graph can store conflicting state but cannot explain how it got there. The ledger turns difficult reasoning into reconstructable governance history.

## 5. Philosophical Alignment
Epistemic Ledger serves To Dig Deep by making disagreement and recovery auditable. It preserves the path of truth-seeking, not only the current surface answer.
`,
    summary:
      'Epistemic Ledger is the governed reasoning memory that makes contradiction, override, and recovery history reconstructable across the repo-native A2C stack. In current practice it carries dual anchors, impact level, remediation intent, and event identity so Parliament, validation forensics, and contradiction-aware synthesis can describe not only what went wrong, but exactly which claims or sources were in tension. This matters because sovereign knowledge requires more than current state snapshots: it requires a durable trail of why a claim was delayed, challenged, repaired, forced through override, or sent to quarantine. The ledger therefore turns epistemic difficulty into inspectable system memory.',
    keywords: [
      'epistemic-ledger',
      'dual-anchors',
      'contradiction-history',
      'forensic-packets',
      'resolution-state',
      'parliament',
      'validator',
      'remediation',
      'evidence-trail',
      'governance-memory',
    ],
    links: [
      { target_id: 'capsule.foundation.n-infinity.parliament.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.capsuleos-schema.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.foundation.architect-override.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.to-dig-deep.v1', relation_type: 'implements' },
      { target_id: 'capsule.foundation.capsuleos.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.a2c-validate.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.quarantine-buffer.v1', relation_type: 'references' },
    ],
    actions: [
      {
        name: 'record_contradiction_entry',
        intent: 'Append a contradiction object with dual anchors, impact, and remediation instead of hiding tension.',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.quarantine-buffer.v1': {
    version: '1.3.0',
    content: `# Quarantine Buffer

## 1. Definition and Essence
Quarantine Buffer is the controlled isolation boundary for repo-native A2C work. The runtime already distinguishes several failure surfaces here: queue staging quarantine, validator quarantine, and exhausted retry retention. Treating them as one blob would erase important operational meaning.

## 2. Runtime Layers
- **Pipeline quarantine:** staged source artifacts enter the ingest pipeline through \`buffer_quarantine\` with SHA-keyed filenames and \`.meta.json\` sidecars carrying original path, staged time, source hash, and attempt count.
- **Validation quarantine:** candidates that fail hard trust checks remain isolated with forensic diagnostics instead of leaking into the live vault.
- **Failed retention:** queue items that exhaust retry policy are retained in a visible failure lane rather than disappearing.

## 3. Runtime Responsibilities
- Preserve the artifact that failed.
- Preserve why it failed through black-box diagnostics and ledger references.
- Preserve how many times the system tried to recover it.
- Allow salvage, override, or human review to release the item through controlled re-entry rather than ad hoc copying.

## 4. Why This Matters
Quarantine is not deletion. It is a governed waiting room where unstable or broken knowledge remains inspectable, recoverable, and historically visible.

## 5. Philosophical Alignment
Quarantine Buffer serves To Dig Deep by refusing silent failure. It keeps broken state accountable until the system either repairs it or archives it with evidence intact.
`,
    summary:
      'Quarantine Buffer is the isolation system that separates staged uncertainty from trusted publication without throwing evidence away. In the repo-native runtime it includes pipeline quarantine with sidecar metadata and attempt counts, validator quarantine with forensic diagnostics, and failed-retention lanes for items that exhaust retry policy. This matters because failures do not all mean the same thing: some inputs are merely waiting for salvage, some need governance review, and some should remain historically visible as exhausted attempts. Quarantine Buffer therefore protects the live graph while preserving raw artifacts, recovery context, and release conditions instead of reducing every failure to silent deletion or one opaque error flag.',
    keywords: [
      'quarantine-buffer',
      'buffer-quarantine',
      'failed-retention',
      'retry-lifecycle',
      'meta-json',
      'attempt-count',
      'salvage-run',
      'architect-override',
      'isolation-boundary',
      'queue-ledger',
    ],
    links: [
      { target_id: 'capsule.foundation.capsuleos.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.foundation.n-infinity.parliament.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.a2c-validate.v1', relation_type: 'supports' },
      { target_id: 'capsule.foundation.capsuleos-spec.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.audit-log.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.security.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.validation-gatekeeper-agent.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.branch-steward-agent.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.vault-update-agent.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.architect-override.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.epistemic-ledger.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
    ],
    actions: [
      {
        name: 'inspect_quarantine_status',
        intent: 'Inspect staged, quarantined, and exhausted items before deciding on salvage or archive.',
        command: 'tsx scripts/a2c/status.ts --kb-root . --json',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.capsule-librarian-agent.v1': {
    version: '1.2.0',
    content: `# Capsule Librarian Agent

## 1. Definition and Essence
Capsule Librarian Agent is the retrieval spine that lets N1Hub and A2C read the existing vault before creating new state. In current code this role is concretely embodied by \`scripts/a2c/query.ts\` and \`lib/a2c/query.ts\`, which rank live capsules with confidence-aware scoring and can synthesize a transient query capsule when enough strong evidence is present.

## 2. Runtime Responsibilities
- Tokenize titles, summaries, keywords, entities, and tags for graph-aware retrieval.
- Weight results using validation, provenance, extraction, synthesis, linking, and contradiction balance rather than plain keyword overlap alone.
- Hydrate candidates from payload files when index metadata is thin.
- Apply minimum provenance and validation thresholds so retrieval favors trustworthy nodes.
- Optionally include archived capsules for deeper historical reading.
- Build a transient synthesis capsule on the fly when enough ranked sources support a query, then gate-check that transient object before returning it.

## 3. Why This Matters
The strongest way to prevent duplicate capsules and shallow reasoning is to read the vault well before acting. Librarian is the component that makes that possible.

## 4. Integration
- **Personal AI Assistant:** uses Librarian for grounded answers.
- **A2C Link / Synthesize:** benefit from ranked graph context before new capsule creation.
- **Vault Stewardship Swarm:** relies on Librarian to know what already exists.

## 5. Philosophical Alignment
Capsule Librarian Agent serves To Dig Deep by insisting that new work begins with deep retrieval from sovereign memory rather than with generic model improvisation.
`,
    summary:
      'Capsule Librarian Agent is the retrieval spine that helps both users and A2C read the vault before they create more graph state. The live implementation ranks capsules with a 6D confidence-aware weighting formula, hydrates thin index rows from payload files when needed, filters by provenance and validation thresholds, and can build a transient synthesis capsule when several strong sources converge on the same query. This matters because duplicate creation and shallow reasoning usually begin with weak retrieval. Librarian therefore turns the vault into active working memory, giving the assistant, A2C, and stewardship agents a disciplined way to consult sovereign memory before they speak or mutate.',
    keywords: [
      'capsule-librarian-agent',
      'query-vault',
      'vector-weighting',
      'transient-synthesis',
      'vault-navigation',
      'retrieval-spine',
      'ranked-evidence',
      'thresholds',
      'assistant-grounding',
      'graph-memory',
    ],
    links: [
      { target_id: 'capsule.foundation.personal-ai-assistant.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.workspace.v1', relation_type: 'part_of' },
      { target_id: 'capsule.foundation.chat-to-capsules.v1', relation_type: 'supports' },
      { target_id: 'capsule.ai.conversation.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.archive.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.capsuleos.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.capsule-graph-maintenance.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.n-infinity.weaver.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.vault-update-agent.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.vault-stewardship-swarm.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.a2c.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.to-dig-deep.v1', relation_type: 'implements' },
    ],
    actions: [
      {
        name: 'query_vault',
        intent: 'Retrieve ranked capsule neighborhoods and optional transient synthesis for a query.',
        command: 'tsx scripts/a2c/query.ts --kb-root . --query "<concept>" --synthesize-on-fly',
        hitl_required: false,
      },
    ],
  },
};

function dedupeLinks(links: CapsuleLink[]): CapsuleLink[] {
  const seen = new Set<string>();
  const output: CapsuleLink[] = [];

  for (const link of links) {
    const targetId = typeof link.target_id === 'string' ? link.target_id.trim() : '';
    const relationType = typeof link.relation_type === 'string' ? link.relation_type.trim() : '';
    if (!targetId || !relationType) continue;
    const key = `${targetId}::${relationType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...link, target_id: targetId, relation_type: relationType });
  }

  return output;
}

async function loadCapsules(): Promise<Map<string, { filePath: string; capsule: CapsuleRoot }>> {
  const files = (await fs.readdir(CAPSULES_DIR))
    .filter((file) => file.endsWith('.json') && !file.includes('@'))
    .sort();

  const map = new Map<string, { filePath: string; capsule: CapsuleRoot }>();

  for (const file of files) {
    const filePath = path.join(CAPSULES_DIR, file);
    const raw = await fs.readFile(filePath, 'utf-8');
    const capsule = JSON.parse(raw) as unknown;
    if (!isRecordObject(capsule)) continue;
    const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
    const capsuleId = metadata && typeof metadata.capsule_id === 'string' ? metadata.capsule_id : '';
    if (!capsuleId) continue;
    map.set(capsuleId, { filePath, capsule: capsule as unknown as CapsuleRoot });
  }

  return map;
}

function applyPatch(capsule: CapsuleRoot, patch: CapsulePatch, now: string): CapsuleRoot {
  const metadata: Record<string, unknown> = isRecordObject(capsule.metadata) ? capsule.metadata : {};
  const corePayload: Record<string, unknown> = isRecordObject(capsule.core_payload) ? capsule.core_payload : {};
  const neuro: Record<string, unknown> = isRecordObject(capsule.neuro_concentrate) ? capsule.neuro_concentrate : {};
  const recursiveLayer: Record<string, unknown> = isRecordObject(capsule.recursive_layer) ? capsule.recursive_layer : {};

  metadata.version = patch.version;
  metadata.updated_at = now;

  corePayload.content = patch.content.trimEnd() + '\n';

  neuro.summary = patch.summary;
  neuro.keywords = [...patch.keywords];

  if (patch.links) {
    recursiveLayer.links = dedupeLinks(patch.links);
  }

  if (patch.actions) {
    recursiveLayer.actions = patch.actions.map((action) => ({ ...action }));
  }

  const next: CapsuleRoot = {
    ...capsule,
    metadata: metadata as CapsuleRoot['metadata'],
    core_payload: corePayload as CapsuleRoot['core_payload'],
    neuro_concentrate: neuro as CapsuleRoot['neuro_concentrate'],
    recursive_layer: recursiveLayer as CapsuleRoot['recursive_layer'],
    integrity_sha3_512: '',
  };

  next.integrity_sha3_512 = computeIntegrityHash(next);
  return next;
}

async function main(): Promise<void> {
  const now = new Date().toISOString();
  const capsules = await loadCapsules();
  const existingIds = new Set<string>(capsules.keys());
  const updated: string[] = [];

  for (const [capsuleId, patch] of Object.entries(PATCHES)) {
    const row = capsules.get(capsuleId);
    if (!row) {
      throw new Error(`Missing capsule for patch: ${capsuleId}`);
    }

    const next = applyPatch(row.capsule, patch, now);
    const validation = await validateCapsule(next, { existingIds });
    if (!validation.valid) {
      const details = validation.errors
        .map((issue) => `${issue.gate} ${issue.path} ${issue.message}`)
        .join('\n');
      throw new Error(`Validation failed for ${capsuleId}\n${details}`);
    }

    await fs.writeFile(row.filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf-8');
    updated.push(capsuleId);
  }

  process.stdout.write(`Updated ${updated.length} capsules\n`);
  for (const capsuleId of updated) {
    process.stdout.write(`- ${capsuleId}\n`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'A2C runtime curation failed';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
