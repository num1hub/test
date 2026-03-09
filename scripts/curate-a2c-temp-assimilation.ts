#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';

import { validateCapsule } from '../lib/validator';
import type { CapsuleLink, CapsuleRoot } from '../lib/validator/types';
import { computeIntegrityHash, isRecordObject } from '../lib/validator/utils';

const CAPSULES_DIR = path.join(process.cwd(), 'data', 'capsules');
const NOW = new Date().toISOString();

type CapsuleAction = {
  name: string;
  intent: string;
  command?: string;
  hitl_required?: boolean;
};

type ExistingPatch = {
  version: string;
  source?: {
    uri: string;
    type: string;
    sha256?: string;
  };
  content: string;
  summary: string;
  keywords: string[];
  links?: CapsuleLink[];
  actions?: CapsuleAction[];
};

type NewCapsuleSpec = {
  metadata: CapsuleRoot['metadata'];
  core_payload: CapsuleRoot['core_payload'];
  neuro_concentrate: CapsuleRoot['neuro_concentrate'];
  recursive_layer: CapsuleRoot['recursive_layer'];
};

const EXISTING_PATCHES: Record<string, ExistingPatch> = {
  'capsule.foundation.a2c.v1': {
    version: '1.5.0',
    source: {
      uri: 'internal://docs/a2c',
      type: 'repository_contract',
    },
    content: `# A2C (Anything-to-Capsules): The Cognitive Refinery

## 1. Essence
A2C is the industrial-grade pipeline of the N1Hub ecosystem, acting as the structured refinery between raw digital material and graph-admissible capsules. It does not merely summarize files. It stages evidence, investigates risk, reasons under explicit prompt law, links candidates into the live graph, and only then attempts validation and emission.

## 2. The 9-Step Pipeline
1. **Ingest**: capture raw material and queue it with provenance.
2. **Normalize**: detect modality, apply semantic lenses, and sanitize payload shape.
3. **Segment**: split material without severing claim from evidence.
4. **Extract**: isolate entities, claims, and supporting spans.
5. **Synthesize**: assemble candidate capsules through Prompt Singularity and graph-aware reasoning.
6. **Link**: situate the candidate against the live graph with contradiction checks.
7. **Hash**: compute the provisional integrity seal over canonical geometry.
8. **Validate**: force the candidate through structural, epistemic, and seal gates.
9. **Emit**: publish accepted candidates or divert unsafe ones to quarantine.

## 3. Pre-Mutation Control Loop
The live repo-native runtime now treats mutation as a gated sequence:
- **Activation Readiness** verifies that the A2C skill surface is fully loaded and that mutation is even allowed.
- **Workspace Recon** classifies whether the repository is a governed N1Hub workspace or still unknown, then builds the repo-native SSOT ladder.
- **Deep Intake Investigation** scores duplicate, conflict, PII, volume, and governance risk before stage work begins.

This matters because the cheapest ingestion mistake is the one prevented before the first mutation.

## 4. Refinery Discipline
A2C treats each input as a proposed pull request against the graph rather than as a blind file upload. In practice that means deterministic routing into exact copy, increment, contradiction, resonance, or genuinely new material. It also means prompt behavior is compiled, not improvised: modality rules, anti-sycophancy directives, epistemic frontier context, and vault-backed few-shot examples are injected deliberately.

## 5. Institutional Meaning
Within the broader Mining Company frame, DeepMine discovers and hauls ore, but A2C decides whether that material can survive normalization, extraction, synthesis, linking, hashing, and validation strongly enough to become part of sovereign memory. It is the bridge between raw signal and trustworthy capsule state.
`,
    summary:
      'A2C is the refinery that turns raw material into graph-admissible capsule candidates, but the current runtime now begins with a stricter pre-mutation control loop. Activation readiness confirms the skill surface is loaded, workspace recon classifies the repository and its SSOT ladder, and deep intake investigation chooses a conservative, integration, or synthesis posture before stage work begins. After that, A2C still performs ingest, normalize, segment, extract, synthesize, link, hash, validate, and emit, but now under clearer prompt law and risk discipline. This makes the pipeline less like a file converter and more like a governed change-management system for sovereign memory.',
    keywords: [
      'a2c',
      'capsule-refinery',
      'pre-mutation-gates',
      'activation-readiness',
      'workspace-recon',
      'deep-investigation',
      'prompt-discipline',
      'graph-change-management',
      'candidate-validation',
      'sovereign-memory',
    ],
    links: [
      { target_id: 'capsule.foundation.agent-activation-readiness.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.workspace-recon.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.deep-intake-investigation.v1', relation_type: 'references' },
    ],
  },
  'capsule.foundation.a2c-ingest.v1': {
    version: '1.2.0',
    source: {
      uri: 'internal://scripts/a2c/investigate.ts',
      type: 'repository_implementation',
    },
    content: `# A2C Stage: Ingest

## 1. Definition and Essence
Ingest is the operational capture boundary of the repo-native A2C runtime. In N1Hub it is not only a watcher and queue entrypoint. It is the controlled handoff from arrival into investigated pipeline readiness, implemented across \`scripts/a2c/watch.ts\`, TypeScript ingestion helpers under \`lib/a2c\`, and the deeper risk pass in \`scripts/a2c/investigate.ts\`.

## 2. Runtime Responsibilities
- Probe incoming files for stability before mutation. The watcher waits for file size and mtime to stop changing instead of ingesting half-written artifacts.
- Archive raw intake before transformation so the original evidence survives later synthesis or repair.
- Stage work into deterministic queue artifacts with SHA-256 keyed filenames, sidecar metadata, staged timestamp, source hash, and attempt counters.
- Append queue-ledger events such as \`STAGED\`, \`STAGED_REUSED\`, \`ACTIVE\`, \`FAILED\`, and \`COMPLETE\` so the entry path can be reconstructed after the fact.
- Triage new material against the live vault for exact copy, increment, contradiction, resonance, or genuinely new state.

## 3. Investigation After Capture
Ingest now includes a stricter preflight analysis layer:
- classify source files as core, adjacent, or external to the current knowledge mission,
- compute duplicate, conflict, PII, volume, and cluster-governance risk,
- detect internal contradiction pairs inside the intake batch itself,
- choose a conservative, integration, or synthesis posture before deeper mutation,
- raise governance sensitivity when a strong docs/src/tests TypeScript triad exists in the workspace.

This makes ingest both evidence preservation and decision preparation.

## 4. Repo-Native Flow
The live N1Hub flow is:
dropzone -> raw archive -> queue artifact -> workspace recon -> deep intake investigation -> transmutation run.

That ordering prevents unstable files, dialect confusion, and shallow merge choices from leaking deeper into the pipeline.

## 5. Integration
- **Background Agent Runtime:** supplies watcher and scheduler discipline.
- **Workspace Recon:** classifies the repository before batch mutation.
- **Deep Intake Investigation:** converts intake pressure into explicit risk and scenario choice.
- **A2C Normalize:** receives stable, traced, and investigated inputs rather than arbitrary files.
`,
    summary:
      'A2C Stage: Ingest is the repo-native capture and staging boundary of the pipeline, but in the current runtime it also carries a real investigation layer. After watching files for stability, archiving raw evidence, and creating queue artifacts with sidecar metadata, ingest now classifies relevance, scores duplicate, conflict, PII, volume, and governance risk, and chooses a conservative, integration, or synthesis path before deeper mutation. This matters because many ingestion failures are not file-transfer failures at all; they are bad early decisions. Ingest therefore turns raw arrival into both auditable pipeline readiness and explicit preflight judgment.',
    keywords: [
      'a2c',
      'ingest',
      'queue-ledger',
      'raw-archive',
      'file-stability',
      'workspace-recon',
      'deep-investigation',
      'risk-triage',
      'source-routing',
      'preflight',
    ],
    links: [
      { target_id: 'capsule.foundation.workspace-recon.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.deep-intake-investigation.v1', relation_type: 'references' },
    ],
    actions: [
      {
        name: 'profile_workspace_contract',
        intent: 'Classify the workspace profile and SSOT ladder before staging a non-trivial intake batch.',
        command:
          'tsx scripts/a2c/recon.ts --workspace-root . --kb-root .',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.a2c-normalize.v1': {
    version: '1.2.0',
    source: {
      uri: 'internal://docs/a2c/protocols/prompt-pack.md',
      type: 'repository_implementation',
    },
    content: `# A2C Stage: Normalize

## 1. Definition and Essence
Normalize is the discipline that converts messy source material and loose capsule drafts into forms the rest of A2C can trust. In the live runtime this logic is concentrated around the prompt-pack protocols in \`docs/a2c\`, shared schema helpers, and TypeScript ingestion/query steps inside \`lib/a2c\`.

## 2. Runtime Responsibilities
- Detect modality from filename, content type, and text shape. The compiler distinguishes code, legal, chat, concept, and general prose.
- Apply modality-specific rules so code keeps signatures with implementations, chat keeps turn order, and prose keeps claim-predicate integrity.
- Derive semantic lenses dynamically. Adversarial, axiomatic, and temporal lenses are activated from source signals so the extractor does not treat every document with the same posture.
- Inject anti-sycophancy directives that explicitly challenge persuasive framing and unsupported certainty.
- Sanitize payload structure against the active schema, including metadata shape, vector fields, recursive geometry, and retrieval-facing surfaces.
- Redact PII from summaries, keywords, entities, and other retrieval layers before those fields become searchable.

## 3. Frontier-Aware Prompt Preparation
Normalize now also compiles higher-order context for later reasoning:
- load the current epistemic frontier from voids and question themes,
- attach frontier summary and bounty directives,
- build vault-backed few-shot examples from high-trust capsules,
- preserve ambiguity as warnings instead of silently smoothing it away.

This turns normalization into context-shaping as well as structure-shaping.

## 4. Why This Matters
Many failures that look semantic are actually normalization failures. If modality is misread, if PII survives into retrieval fields, or if the prompt surface lacks the right skeptical posture, then later synthesis inherits noise disguised as intelligence.
`,
    summary:
      'A2C Stage: Normalize is the runtime discipline that prepares both structure and prompt posture before the system starts acting smart. In the current stack it detects modality, applies code or prose specific rules, activates adversarial, axiomatic, and temporal lenses, injects anti-sycophancy directives, sanitizes payload shape against the active schema, and redacts PII from retrieval-facing fields. It also compiles frontier context and vault-backed few-shot examples so later reasoning begins with the right local and global posture. This matters because many downstream failures are upstream normalization failures wearing semantic clothing.',
    keywords: [
      'a2c',
      'normalize',
      'prompt-compiler',
      'modality-rules',
      'semantic-lenses',
      'anti-sycophancy',
      'frontier-context',
      'few-shot-examples',
      'schema-sanitization',
      'pii-redaction',
    ],
    links: [
      { target_id: 'capsule.ai.prompt.v1', relation_type: 'references' },
    ],
    actions: [
      {
        name: 'compile_prompt_directive',
        intent: 'Generate a modality-aware, frontier-aware directive packet before extraction or synthesis begins.',
        hitl_required: false,
      },
    ],
  },
  'capsule.foundation.a2c-synthesize.v1': {
    version: '1.2.0',
    source: {
      uri: 'internal://docs/a2c/protocols/prompt-pack.md',
      type: 'repository_contract',
    },
    content: `# A2C Stage: Synthesize

## 1. Definition and Essence
Synthesize is where the current A2C runtime stops being a formatter and becomes a governed reasoning system. In N1Hub this stage is powered by prompt-pack directives in \`docs/a2c\`, graph-aware retrieval in \`lib/a2c/query.ts\`, contradiction checks in \`lib/a2c/parliament.ts\`, and TypeScript validation/repair loops.

## 2. Prompt-Pack Composition
The runtime no longer relies on one monolithic synthesis instruction. It draws from a prompt pack with distinct operational roles:
- activation and full integration prompts for default runs,
- update-existing and dedup/conflict prompts when overlap is likely,
- decomposition, audit-only, and index-only prompts for narrower tasks,
- insufficient-context, selective-synthesis, and deep-investigation prompts when uncertainty or scope pressure is high.

The prompt compiler then layers on modality rules, semantic lenses, anti-sycophancy directives, epistemic frontier context, and vault-backed few-shot examples.

## 3. Runtime Composition
- Generate a fractal summary of the whole source before chunk-local work begins.
- Build Prompt Singularity packets with explicit schema contract, chain-of-verification, and ReAct tool instructions.
- Run the ReAct loop with \`query_graph\` and \`check_contradiction\` when uncertainty remains.
- Self-heal malformed JSON outputs and then pass them through the citation guillotine, which requires exact substring quotes for claims and entities.
- Escalate high-impact contradiction clusters to Parliament and inject the resulting resolution into the candidate capsule.
- Apply prompt-redesign discipline when a prompt family repeatedly fails or drifts.

## 4. Why This Matters
Without this stack, synthesis would be fancy summarization. With it, synthesis becomes governed assembly: context-rich, contradiction-aware, quote-anchored, and legible when it fails.
`,
    summary:
      'A2C Stage: Synthesize is the point where the runtime turns extraction into governed assembly rather than polished paraphrase, and the current stack now uses a clearer prompt-pack discipline to do it. Instead of one generic instruction, synthesis draws from activation, integration, update, conflict, decomposition, selective-synthesis, and deep-investigation prompts, then compiles those templates with modality rules, anti-sycophancy directives, epistemic frontier context, few-shot examples, ReAct graph checks, citation guillotines, and Parliament escalation. This matters because capsules need more than coherent prose: they need prompt law, graph awareness, and failure modes that remain inspectable when reasoning goes wrong.',
    keywords: [
      'a2c',
      'synthesize',
      'prompt-pack',
      'prompt-singularity',
      'compiled-directives',
      'react-oracle',
      'citation-guillotine',
      'selective-synthesis',
      'prompt-redesign',
      'parliament-escalation',
    ],
    links: [
      { target_id: 'capsule.ai.prompt.v1', relation_type: 'depends_on' },
      { target_id: 'capsule.foundation.deep-intake-investigation.v1', relation_type: 'references' },
    ],
  },
  'capsule.foundation.background-agent-runtime.v1': {
    version: '1.7.0',
    source: {
      uri: 'internal://scripts/a2c',
      type: 'repository_implementation',
    },
    content: `# Background Agent Runtime

## 1. Definition and Essence
Background Agent Runtime defines the durable operational harness that lets LLM-backed agents work continuously, safely, and observably inside N1Hub. It is not the model itself. It is the surrounding runtime that keeps daemon processes alive, schedules jobs, preserves state, routes tool access, and exposes enough control for operators to trust long-lived autonomy.

## 2. Core Responsibilities
- \`daemon_lifecycle\` keeps agent services alive under supervised host processes.
- \`dispatch_and_scheduling\` decides when background work should run, pause, cool down, or wake early.
- \`mode_shaping\` separates daytime co-pilot work, nighttime autonomy, planning-only runs, and Dream-safe execution runs.
- \`durable_state\` preserves checkpoints, summaries, run history, and resumable execution context.
- \`instruction_surfaces\` ensures agents enter through durable repo-owned rules and documentation before deeper loops begin.
- \`context_engineering\` assembles bounded context packs instead of dumping entire transcripts or vault snapshots into one run.
- \`subagent_orchestration\` allows scout, foreman, reviewer, and executor lanes to cooperate through explicit handoffs.
- \`operator_oversight\` feeds status, logs, and controls into accountable surfaces.

## 3. Pre-Mutation Runtime Gates
The runtime now has a clearer pre-mutation control loop:
- **Activation Readiness** confirms the skill surface is complete enough to allow mutation.
- **Workspace Recon** classifies the environment and its SSOT hierarchy.
- **Deep Intake Investigation** converts incoming pressure into explicit risk scores and a chosen execution posture.

This means long-lived automation is gated by environmental understanding, not only by daemon liveness.

## 4. Shift Entry and Ignition
The runtime also benefits from a morning ignition discipline. A good entry cycle can surface active voids, unresolved contradictions, and the operator's seed intent before starting deeper work. That gives day mode a cleaner handoff into queueing, planning, or ingestion and keeps autonomy aligned with current human direction.

## 5. Daemon and Queue Discipline
Watcher and scheduler behavior are part of the trust surface of autonomy. Background work should be partitioned by mode and time window, queues should expose visible state transitions such as quarantine, active, complete, and failed, and handoff between chat, queue, daemon, and review surfaces should preserve one coherent run identity.
`,
    summary:
      'Background Agent Runtime is the durable harness that keeps long-lived agent work safe, legible, and resumable inside N1Hub, and its operating model now has sharper pre-mutation gates. A healthy runtime does not begin with blind daemon activity alone; it starts with activation readiness, workspace recon, and deep intake investigation so the system knows whether it is permitted to mutate, what repository contract it is inside, and what risk posture the current batch demands. Combined with ignition rituals, queue discipline, and day-night mode shaping, this makes autonomy easier to trust because the host can explain not only what is running, but why it was allowed to begin.',
    keywords: [
      'background-agent-runtime',
      'activation-readiness',
      'workspace-recon',
      'deep-investigation',
      'daemon-lifecycle',
      'queue-discipline',
      'ignition-ritual',
      'day-night-modes',
      'operator-oversight',
      'stateful-autonomy',
    ],
    links: [
      { target_id: 'capsule.foundation.agent-activation-readiness.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.workspace-recon.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.deep-intake-investigation.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.ignition-ritual.v1', relation_type: 'references' },
    ],
  },
  'capsule.foundation.agent-instruction-surfaces.v1': {
    version: '1.2.0',
    source: {
      uri: 'internal://docs/a2c/protocols/activation-entry-protocol.md',
      type: 'repository_contract',
    },
    content: `# Agent Instruction Surfaces

## 1. Definition and Essence
Agent Instruction Surfaces defines the repo-owned, passive knowledge surfaces that agents can reliably consume before or alongside active tool use. In N1Hub this includes broad repo doctrine files, but it now also includes a stronger A2C activation surface that determines whether deep mutation is allowed at all.

## 2. Core Responsibilities
- \`repo_rules_surface\` exposes stable project instructions through files such as \`AGENTS.md\`, \`SOUL.md\`, \`TOOLS.md\`, workflow docs, and machine-readable markdown resources.
- \`docs_index_surface\` provides compact, high-signal indexes that orient an agent before it explores the whole repository.
- \`instruction_hierarchy\` separates identity, operating rules, tool notes, workflow policy, doctrine summaries, and skill-specific guidance instead of collapsing them into one prompt.
- \`versioned_truth\` keeps important agent law in reviewable git-tracked files instead of hidden UI toggles or one-off prompt residue.

## 3. A2C Activation Surface
The A2C stack now treats instruction surfaces as a four-layer preload:
- **Layer 1: identity** through \`SKILL.md\` and agent descriptors,
- **Layer 2: contracts** through governance and migration protocols,
- **Layer 3: cognition** through reasoning, investigation, and selective-synthesis rules,
- **Layer 4: execution** through prompt pack, redesign, and audit protocols.

Activation bootstrap verifies document presence, word budgets, prompt-pack completeness, structural markers, mandatory preload order, and then emits a fingerprint with a \`READY\` or \`BLOCKED\` verdict. Mutation is not supposed to begin before that gate is green.

## 4. Architectural Value
Instruction surfaces reduce prompt drift, improve framework literacy, and make repository-local truth easier for agents to discover. In the A2C case they now also provide explicit readiness law instead of assuming the skill is mentally loaded just because files exist nearby.
`,
    summary:
      'Agent Instruction Surfaces defines the passive, repo-owned knowledge layer that teaches an agent what world it is inside before deeper workflow logic begins, and in A2C this surface now includes a strict activation readiness contract. The runtime treats identity, contracts, cognition, and execution docs as four preload layers, then uses bootstrap checks to verify word budgets, prompt-pack completeness, structural markers, mandatory preload order, and a deterministic fingerprint before mutation is allowed. This matters because repeated doctrine should live in versioned files, not in lucky prompt residue, and because strong agent behavior depends on entering the repository with the right law already loaded.',
    keywords: [
      'agent-instruction-surfaces',
      'activation-readiness',
      'a2c-docs',
      'preload-layers',
      'repo-owned-law',
      'prompt-pack',
      'bootstrap-fingerprint',
      'ready-blocked-gate',
      'versioned-truth',
      'n1hub',
    ],
    links: [
      { target_id: 'capsule.foundation.agent-activation-readiness.v1', relation_type: 'references' },
    ],
  },
  'capsule.ai.prompt.v1': {
    version: '1.2.0',
    source: {
      uri: 'internal://docs/a2c/protocols/prompt-pack.md',
      type: 'repository_contract',
    },
    content: `# AI Prompt

## 1. Definition and Essence
AI Prompt captures reusable and compiled instruction payloads used by assistant and agent workflows. It defines intent framing, constraints, context-pack expectations, and expected output schema so model interactions remain deterministic, replayable, and auditable.

## 2. Prompt Asset Types
- \`template_prompts\` such as activation, full integration, update-existing, dedup/conflict, decomposition, audit-only, index-only, insufficient-context, selective-synthesis, and deep-investigation prompts.
- \`compiled_prompts\` produced at runtime when a base template is fused with modality rules, semantic lenses, anti-sycophancy directives, epistemic frontier context, and vault-backed few-shot examples.
- \`redesign_prompts\` used when a prompt family repeatedly fails quality gates and needs a governed redesign loop instead of random tweaking.
- \`evaluation_notes\` that connect prompt variants to traces, failure classes, or quality outcomes.

## 3. Runtime Composition
In the current A2C stack a good prompt is layered, not flat:
1. base template,
2. modality-aware rules,
3. semantic-lens directives,
4. skeptical anti-sycophancy posture,
5. frontier and void context,
6. few-shot examples from trusted live capsules,
7. explicit output contract.

That compiled shape lets one prompt family stay stable while still adapting to the actual source and graph state.

## 4. Integration
- **A2C Normalize:** compiles prompt directives from source signals.
- **A2C Synthesize:** uses the prompt pack and Prompt Singularity stack for governed assembly.
- **Agent Evals and Traces:** preserves which prompt layers produced useful or weak results.
- **Instruction Surfaces:** keep prompt law in repo-native files instead of hidden application code.
`,
    summary:
      'AI Prompt captures the instruction artifacts that shape model behavior across conversations, agents, and background automation, and the current A2C stack now distinguishes clearly between template prompts and compiled prompts. Base prompt-pack templates such as activation, full integration, conflict handling, decomposition, and deep investigation are fused at runtime with modality rules, semantic lenses, anti-sycophancy directives, epistemic frontier context, few-shot examples, and output contracts. This matters because prompt quality is not only about wording; it is about layered prompt composition that can be replayed, compared, redesigned, and tied back to actual traces instead of disappearing into opaque runtime code.',
    keywords: [
      'ai-prompt',
      'prompt-pack',
      'compiled-prompts',
      'template-prompts',
      'prompt-compiler',
      'prompt-redesign',
      'frontier-context',
      'few-shot-examples',
      'output-contracts',
      'traceable-instructions',
    ],
    links: [
      { target_id: 'capsule.foundation.a2c-normalize.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.a2c-synthesize.v1', relation_type: 'references' },
    ],
  },
  'capsule.foundation.agent-evals-and-traces.v1': {
    version: '1.2.0',
    source: {
      uri: 'internal://scripts/a2c/activate.ts',
      type: 'repository_implementation',
    },
    content: `# Agent Evals and Traces

## 1. Definition and Essence
Agent Evals and Traces defines the feedback layer that records what an agent did, why it did it, and whether the result was good enough. Traces preserve run lineage. Evals score or classify outcomes so the system can learn which patterns are useful, wasteful, unstable, or unsafe.

## 2. Core Responsibilities
- \`run_traces\` record handoffs, tool use, compact decisions, and outcome lineage across a swarm cycle.
- \`eval_loops\` score plans, reviews, capsule jobs, and execution outputs against explicit quality criteria.
- \`replay_and_diff\` lets operators compare runs and inspect what changed when a lane regressed or improved.
- \`review_gates\` give reviewer and validation lanes structured evidence before Dream or Real promotion.
- \`failure_clustering\` groups repeated breakdowns such as malformed JSON, timeout churn, or low-value duplicate jobs.

## 3. Preflight and Forensic Artifacts
The A2C runtime now produces several machine-readable artifacts that should be treated as first-class trace surfaces:
- activation bootstrap reports with readiness, blockers, and fingerprints,
- workspace recon reports with SSOT ladders and governance command readiness,
- deep investigation packets with risk scores, scenarios, and recommended actions,
- forensic black-box validation packets with gate verdicts, seal forensics, and recovery recommendations.

These artifacts make the system inspectable before, during, and after mutation.

## 4. Architectural Value
Evals and traces turn autonomy from a vibe into an inspectable engineering loop. They make cost, quality, failure, environmental context, and recovery posture visible at the same time.
`,
    summary:
      'Agent Evals and Traces defines the feedback and lineage layer for N1Hub agents, and the A2C runtime now contributes a richer set of preflight and forensic artifacts to that layer. Activation bootstrap reports, workspace recon packets, deep investigation decision records, and black-box validation packets all become replayable evidence about why a run was allowed to start, what risk posture it chose, and how it later passed, failed, or degraded. This matters because autonomous work cannot improve if only the final answer is visible. Trace quality therefore depends on preserving pre-mutation context and failure diagnostics alongside ordinary run lineage.',
    keywords: [
      'agent-evals',
      'agent-traces',
      'activation-report',
      'workspace-recon',
      'investigation-packet',
      'forensic-black-box',
      'replay',
      'failure-clustering',
      'run-lineage',
      'quality-loop',
    ],
    links: [
      { target_id: 'capsule.foundation.agent-activation-readiness.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.workspace-recon.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.deep-intake-investigation.v1', relation_type: 'references' },
    ],
  },
  'capsule.foundation.symphony-observability.v1': {
    version: '1.2.0',
    source: {
      uri: 'internal://lib/ai/controlSurface.ts',
      type: 'repository_implementation',
    },
    content: `# Symphony Observability

## 1. Definition and Essence
Symphony Observability defines how operators can see what the orchestration service is doing while multiple issue runs or background jobs are active. It covers structured logs, runtime snapshots, token accounting, rate-limit telemetry, recent events, assignment visibility, and human-readable status surfaces.

## 2. Core Attributes
- \`structured_logs\` with issue and session context.
- \`runtime_snapshot\` for running, retrying, token, and timing state.
- \`session_metrics\` including token totals, turn counts, and duration.
- \`assignment_projection\` so a human can tell which issue, request, or async assignment produced the current activity.
- \`status_surface\` for HTTP, dashboard, or terminal views.
- \`pipeline_step_projection\` that emits stage-by-stage status lines instead of forcing operators to infer progress from raw logs.
- \`vector_charts\` that display 6D confidence and health signals in a compact human-readable form.
- \`error_visibility\` so invalid workflow reloads, tracker failures, and degraded-lane fallbacks remain operator-visible.

## 3. Human-Readable Operator Surfaces
The A2C runtime includes a small but important terminal observability layer: pipeline step emission, verdict banners, and confidence-vector charts with rich-terminal support when available and plain stderr fallback when not. That matters because not every operator surface is a dashboard; many real interventions still begin in a terminal session.

## 4. N1Hub Alignment
Observability is what makes the service operable as a daemon rather than a blind script. It should bridge structured telemetry, terminal status, and user-facing control surfaces so autonomous work can be trusted, debugged, and interrupted before it drifts too far.
`,
    summary:
      'Symphony Observability defines the operator-facing evidence layer for orchestration, and it now includes a clearer human-readable terminal surface inspired by the A2C neuro-terminal helpers. Structured logs and snapshots remain essential, but stage-by-stage status lines, verdict banners, and compact 6D vector charts also matter because many real interventions still begin in a shell or daemon log stream rather than on a polished dashboard. This makes observability more useful during live runs: operators can see what is running, which stage it is in, how healthy its confidence profile looks, and whether the runtime is degrading or completing cleanly.',
    keywords: [
      'symphony-observability',
      'terminal-status',
      'vector-charts',
      'pipeline-steps',
      'verdict-banners',
      'structured-logs',
      'runtime-snapshot',
      'operator-surface',
      'daemon-telemetry',
      'stderr-fallback',
    ],
    links: [
      { target_id: 'capsule.foundation.agent-evals-and-traces.v1', relation_type: 'references' },
      { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
    ],
  },
};

const NEW_CAPSULES: Record<string, NewCapsuleSpec> = {
  'capsule.foundation.agent-activation-readiness.v1': {
    metadata: {
      capsule_id: 'capsule.foundation.agent-activation-readiness.v1',
      version: '1.0.0',
      status: 'active',
      type: 'foundation',
      subtype: 'atomic',
      author: 'Number One Projects',
      created_at: NOW,
      updated_at: NOW,
      name: 'Agent Activation Readiness',
      semantic_hash: 'agent-activation-readiness-preload-bootstrap-fingerprint-mutation-gate',
      source: {
        uri: 'internal://scripts/a2c/activate.ts',
        type: 'repository_implementation',
      },
      priority: 'high',
      progress: 34,
      estimatedHours: 90,
      actualHours: 22,
      dueDate: '2026-07-01',
      tier: 3,
    },
    core_payload: {
      content_type: 'markdown',
      content: `# Agent Activation Readiness

## 1. Definition and Essence
Agent Activation Readiness defines the gate that determines whether an A2C-capable agent is actually prepared to mutate the repository. It is not a vague reminder to "load the docs." It is a deterministic bootstrap procedure that checks whether the required identity, contract, cognition, and execution surfaces are present and coherent before deeper work begins.

## 2. Activation Layers
- **Layer 1: identity** through skill identity files and agent descriptors.
- **Layer 2: contracts** through governance, migration, and handoff protocols.
- **Layer 3: cognition** through reasoning, investigation, and selective-synthesis rules.
- **Layer 4: execution** through prompt pack, redesign, and audit protocols.

## 3. Readiness Gate
Bootstrap verifies:
- required files exist and are non-empty,
- each file clears minimum word budgets,
- layer totals clear minimum depth thresholds,
- the prompt pack contains the full prompt family,
- key structural markers exist in the skill doctrine,
- mandatory preload paths are present and in the correct order,
- an activation fingerprint can be computed from the loaded corpus.

The output is a machine-readable verdict: \`READY\` or \`BLOCKED\`, with blockers listed verbatim.

## 4. Why This Matters
Strong mutation should not begin from partially loaded doctrine. Activation readiness turns "did the agent really load the skill?" into an auditable precondition instead of a superstition.
`,
    },
    neuro_concentrate: {
      summary:
        'Agent Activation Readiness defines the deterministic bootstrap gate that decides whether an A2C-capable agent is allowed to mutate the repository at all. It checks that identity, contract, cognition, and execution surfaces are present, non-empty, deep enough, ordered correctly, and complete enough to compute a stable activation fingerprint. The runtime then emits a machine-readable READY or BLOCKED verdict with blockers instead of assuming the skill was mentally loaded. This matters because strong mutation should not start from half-read doctrine or missing prompt law. Activation therefore becomes an auditable precondition, not a hopeful ritual performed in private model memory.',
      keywords: [
        'activation-readiness',
        'bootstrap-gate',
        'preload-layers',
        'ready-blocked',
        'prompt-pack',
        'fingerprint',
        'mutation-permission',
        'instruction-surfaces',
        'a2c',
        'preflight',
      ],
      confidence_vector: {
        extraction: 1,
        synthesis: 1,
        linking: 1,
        provenance_coverage: 1,
        validation_score: 1,
        contradiction_pressure: 0,
      },
      semantic_hash: 'agent-activation-readiness-preload-bootstrap-fingerprint-mutation-gate',
    },
    recursive_layer: {
      links: [
        { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'part_of' },
        { target_id: 'capsule.foundation.agent-instruction-surfaces.v1', relation_type: 'supports' },
        { target_id: 'capsule.foundation.a2c.v1', relation_type: 'supports' },
        { target_id: 'capsule.foundation.workspace-recon.v1', relation_type: 'references' },
      ],
      actions: [
        {
          name: 'run_activation_bootstrap',
          intent: 'Validate that the A2C skill surface is fully loaded before any non-trivial mutation begins.',
          command: 'tsx scripts/a2c/activate.ts --require-ready',
          hitl_required: false,
        },
      ],
      epistemic_ledger: [],
    },
  },
  'capsule.foundation.workspace-recon.v1': {
    metadata: {
      capsule_id: 'capsule.foundation.workspace-recon.v1',
      version: '1.0.0',
      status: 'active',
      type: 'foundation',
      subtype: 'atomic',
      author: 'Number One Projects',
      created_at: NOW,
      updated_at: NOW,
      name: 'Workspace Recon',
      semantic_hash: 'workspace-recon-profile-ssot-governance-triad-mutation-gate',
      source: {
        uri: 'internal://scripts/a2c/recon.ts',
        type: 'repository_implementation',
      },
      priority: 'high',
      progress: 38,
      estimatedHours: 100,
      actualHours: 24,
      dueDate: '2026-07-04',
      tier: 3,
    },
    core_payload: {
      content_type: 'markdown',
      content: `# Workspace Recon

## 1. Definition and Essence
Workspace Recon defines the deterministic environmental understanding pass that should happen before an A2C-capable agent mutates a repository. Its job is to classify the workspace, discover the right source-of-truth ladder, detect governance command readiness, and surface project-native quality signals that change how risky mutation really is.

## 2. Recon Procedure
- inventory the top-level surface and identify large non-target zones such as caches, generated artifacts, or unrelated directories,
- detect whether the workspace is a governed N1Hub repository or still unknown,
- build the SSOT ladder that tells the agent which files and indexes outrank others,
- detect governance command readiness from \`package.json\`,
- emit a machine-readable report with blockers, confidence, and next deterministic actions.

## 3. TypeScript Triad Intelligence
When the repository includes docs, source, and tests in a TypeScript cluster triad, recon extracts:
- triad coverage and gap lists,
- exported API signals,
- test-title invariant signals,
- threshold hints and capability families.

These signals raise governance sensitivity and should influence later intake and synthesis posture.

## 4. Why This Matters
Mutation quality depends on knowing what repository the agent is actually standing in. Workspace recon turns that environmental question into a reportable artifact instead of a guess.
`,
    },
    neuro_concentrate: {
      summary:
        'Workspace Recon defines the deterministic environmental profiling pass that should happen before non-trivial A2C mutation. It inventories the workspace, classifies it as a governed N1Hub repository or unknown, builds a repo-native source-of-truth ladder, checks governance command readiness, and emits a machine-readable report with blockers, confidence, and next actions. When a docs/src/tests TypeScript triad exists, recon also extracts coverage, invariant, capability, and threshold signals that raise or lower later mutation confidence. This matters because repository mutation is only trustworthy when the agent first understands what environment it is in and which contracts outrank local assumptions.',
      keywords: [
        'workspace-recon',
        'ssot-ladder',
        'governance-readiness',
        'workspace-profile',
        'repo-profile-detection',
        'typescript-triad',
        'inventory-surface',
        'mutation-gate',
        'project-contracts',
        'environmental-understanding',
      ],
      confidence_vector: {
        extraction: 1,
        synthesis: 1,
        linking: 1,
        provenance_coverage: 1,
        validation_score: 1,
        contradiction_pressure: 0,
      },
      semantic_hash: 'workspace-recon-profile-ssot-governance-triad-mutation-gate',
    },
    recursive_layer: {
      links: [
        { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'part_of' },
        { target_id: 'capsule.foundation.workspace.v1', relation_type: 'supports' },
        { target_id: 'capsule.foundation.a2c.v1', relation_type: 'supports' },
        { target_id: 'capsule.foundation.agent-instruction-surfaces.v1', relation_type: 'depends_on' },
        { target_id: 'capsule.foundation.deep-intake-investigation.v1', relation_type: 'supports' },
      ],
      actions: [
        {
          name: 'run_workspace_recon',
          intent: 'Profile the workspace, build the SSOT ladder, and emit a deterministic recon report before mutation.',
          command: 'tsx scripts/a2c/recon.ts --workspace-root . --kb-root .',
          hitl_required: false,
        },
      ],
      epistemic_ledger: [],
    },
  },
  'capsule.foundation.deep-intake-investigation.v1': {
    metadata: {
      capsule_id: 'capsule.foundation.deep-intake-investigation.v1',
      version: '1.0.0',
      status: 'active',
      type: 'foundation',
      subtype: 'atomic',
      author: 'Number One Projects',
      created_at: NOW,
      updated_at: NOW,
      name: 'Deep Intake Investigation',
      semantic_hash: 'deep-intake-investigation-risk-scenarios-conflict-routing-analysis',
      source: {
        uri: 'internal://scripts/a2c/investigate.ts',
        type: 'repository_implementation',
      },
      priority: 'high',
      progress: 42,
      estimatedHours: 120,
      actualHours: 31,
      dueDate: '2026-07-07',
      tier: 3,
    },
    core_payload: {
      content_type: 'markdown',
      content: `# Deep Intake Investigation

## 1. Definition and Essence
Deep Intake Investigation is the structured analysis pass that happens after workspace recon and before non-trivial A2C mutation. Its purpose is to convert ambiguous or noisy intake into explicit execution intelligence instead of letting ingestion begin from a shallow first read.

## 2. Investigation Procedure
- assess scope: literal ask, underlying operational need, missing context, and required depth,
- extract a small set of evidence-grounded key insights,
- map observation -> inference -> implication,
- compare conservative, integration, and synthesis scenarios when ambiguity is material,
- choose one execution path and translate it into deterministic actions.

## 3. Risk Model
The runtime computes and reports pressure across:
- duplicate risk,
- conflict risk,
- PII risk,
- volume risk,
- cluster-governance risk.

It also detects internal contradiction pairs inside the intake batch itself and can exclude irrelevant external files when focus mode is active.

## 4. Dynamic Context Signals
Investigation expands relevance using live vault probes and, when present, the TypeScript triad context from docs, source, and tests. That lets the system reason about contract depth, threshold capital, and likely governance sensitivity instead of only about token overlap.

## 5. Why This Matters
Strong integration decisions require more than good extraction. They require a justified posture before extraction begins. Investigation turns that posture into an auditable artifact.
`,
    },
    neuro_concentrate: {
      summary:
        'Deep Intake Investigation is the structured pre-mutation analysis pass that converts ambiguous intake into explicit execution intelligence. It performs scope assessment, extracts key insights, maps observation to implication, compares conservative, integration, and synthesis scenarios when needed, and computes duplicate, conflict, PII, volume, and cluster-governance risk before a batch is allowed to proceed. It also uses live vault probes and TypeScript triad signals to expand relevance and detect internal contradiction pressure. This matters because many poor ingest outcomes are really poor early decisions. Investigation therefore gives A2C a justified posture before extraction, synthesis, or merge logic starts changing the graph.',
      keywords: [
        'deep-intake-investigation',
        'risk-scoring',
        'scenario-selection',
        'duplicate-risk',
        'conflict-risk',
        'pii-risk',
        'focus-mode',
        'vault-probes',
        'typescript-triad',
        'pre-mutation-analysis',
      ],
      confidence_vector: {
        extraction: 1,
        synthesis: 1,
        linking: 1,
        provenance_coverage: 1,
        validation_score: 1,
        contradiction_pressure: 0,
      },
      semantic_hash: 'deep-intake-investigation-risk-scenarios-conflict-routing-analysis',
    },
    recursive_layer: {
      links: [
        { target_id: 'capsule.foundation.a2c-ingest.v1', relation_type: 'part_of' },
        { target_id: 'capsule.foundation.workspace-recon.v1', relation_type: 'depends_on' },
        { target_id: 'capsule.foundation.capsule-librarian-agent.v1', relation_type: 'references' },
        { target_id: 'capsule.foundation.quarantine-buffer.v1', relation_type: 'references' },
        { target_id: 'capsule.foundation.a2c-normalize.v1', relation_type: 'supports' },
        { target_id: 'capsule.foundation.a2c-synthesize.v1', relation_type: 'supports' },
      ],
      actions: [
        {
          name: 'run_deep_intake_investigation',
          intent: 'Assess intake risk, scenarios, and next deterministic actions before non-trivial mutation.',
          command:
            'tsx scripts/a2c/investigate.ts --workspace-root . --kb-root . --input <path> --recursive',
          hitl_required: false,
        },
      ],
      epistemic_ledger: [],
    },
  },
  'capsule.foundation.ignition-ritual.v1': {
    metadata: {
      capsule_id: 'capsule.foundation.ignition-ritual.v1',
      version: '1.0.0',
      status: 'active',
      type: 'foundation',
      subtype: 'atomic',
      author: 'Number One Projects',
      created_at: NOW,
      updated_at: NOW,
      name: 'Ignition Ritual',
      semantic_hash: 'ignition-ritual-voids-contradictions-seed-intent-ingestion-loop',
      source: {
        uri: 'internal://docs/a2c/protocols/activation-entry-protocol.md',
        type: 'repository_implementation',
      },
      priority: 'medium',
      progress: 26,
      estimatedHours: 70,
      actualHours: 18,
      dueDate: '2026-07-10',
      tier: 3,
    },
    core_payload: {
      content_type: 'markdown',
      content: `# Ignition Ritual

## 1. Definition and Essence
Ignition Ritual defines the daily entry loop that turns a sleeping or idle knowledge runtime back into a directed cognitive workday. It is not only a greeting. It is a small operational ceremony that surfaces graph pressure, asks for present human intent, and then feeds that intent back into the intake pipeline in a controlled form.

## 2. Ritual Flow
- run the void mapper to identify the most pressing structural void,
- surface a short list of unresolved contradiction edges from the current graph,
- collect the operator's seed intent for the day,
- write that intent into a deterministic seed artifact inside the task area,
- optionally chain a dry-run ingest of the seed so the day begins with a concrete execution packet,
- emit a machine-readable ritual summary for later replay.

## 3. Integration
Ignition belongs at the seam between Personal AI Assistant, Background Agent Runtime, Workspace, and A2C Ingest. It gives the human a clean morning handoff into the current epistemic state of the system instead of forcing them to reconstruct pressure from scattered logs.

## 4. Why This Matters
If the runtime can work overnight, it also needs a disciplined way to begin the next day. Ignition gives that transition a repeatable structure.
`,
    },
    neuro_concentrate: {
      summary:
        'Ignition Ritual defines the daily entry loop that reconnects the human and the autonomous graph before deeper work begins. It runs the void mapper, surfaces unresolved contradiction edges, asks for a seed intent, writes that intent into a deterministic task artifact, optionally chains a dry-run ingest, and emits a machine-readable summary for replay. This matters because a system that can think overnight also needs a disciplined morning handoff. Ignition therefore turns the start of the day into a clean operational seam between current graph pressure, human direction, and the next queue of work rather than leaving that transition to scattered logs and memory.',
      keywords: [
        'ignition-ritual',
        'seed-intent',
        'void-mapper',
        'contradiction-review',
        'morning-handoff',
        'daily-entry-loop',
        'assistant-ritual',
        'task-seed',
        'a2c-ingest',
        'operational-transition',
      ],
      confidence_vector: {
        extraction: 1,
        synthesis: 1,
        linking: 1,
        provenance_coverage: 1,
        validation_score: 1,
        contradiction_pressure: 0,
      },
      semantic_hash: 'ignition-ritual-voids-contradictions-seed-intent-ingestion-loop',
    },
    recursive_layer: {
      links: [
        { target_id: 'capsule.foundation.personal-ai-assistant.v1', relation_type: 'part_of' },
        { target_id: 'capsule.foundation.background-agent-runtime.v1', relation_type: 'references' },
        { target_id: 'capsule.foundation.workspace.v1', relation_type: 'supports' },
        { target_id: 'capsule.foundation.a2c-ingest.v1', relation_type: 'references' },
        { target_id: 'capsule.foundation.n-infinity.gardener.v1', relation_type: 'references' },
        { target_id: 'capsule.foundation.capsule-graph-maintenance.v1', relation_type: 'references' },
      ],
      actions: [
        {
          name: 'run_ignition_ritual',
          intent: 'Surface active voids and contradictions, capture seed intent, and open the day with a deterministic intake packet.',
          command: 'tsx scripts/a2c/ingest.ts --kb-root . --dry-run',
          hitl_required: false,
        },
      ],
      epistemic_ledger: [],
    },
  },
};

function uniqueKeywords(keywords: string[]): string[] {
  const out: string[] = [];
  for (const keyword of keywords) {
    const value = keyword.trim();
    if (!value || out.includes(value)) continue;
    out.push(value);
  }
  return out;
}

function mergeLinks(existingValue: unknown, additions: CapsuleLink[] = []): CapsuleLink[] {
  const out: CapsuleLink[] = [];
  const seen = new Set<string>();

  const push = (row: CapsuleLink) => {
    const key = `${row.target_id}::${row.relation_type}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(row);
  };

  if (Array.isArray(existingValue)) {
    for (const row of existingValue) {
      if (!isRecordObject(row)) continue;
      const target_id = typeof row.target_id === 'string' ? row.target_id.trim() : '';
      const relation_type = typeof row.relation_type === 'string' ? row.relation_type.trim() : '';
      if (!target_id || !relation_type) continue;
      const normalized: CapsuleLink = { ...row, target_id, relation_type };
      push(normalized);
    }
  }

  for (const row of additions) {
    push(row);
  }

  return out;
}

function mergeActions(existingValue: unknown, additions: CapsuleAction[] = []): CapsuleAction[] {
  const out: CapsuleAction[] = [];
  const seen = new Set<string>();

  const push = (row: CapsuleAction) => {
    const key = row.name.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(row);
  };

  if (Array.isArray(existingValue)) {
    for (const row of existingValue) {
      if (!isRecordObject(row)) continue;
      if (typeof row.name !== 'string' || typeof row.intent !== 'string') continue;
      const normalized: CapsuleAction = {
        name: row.name,
        intent: row.intent,
      };
      if (typeof row.command === 'string') {
        normalized.command = row.command;
      }
      if (typeof row.hitl_required === 'boolean') {
        normalized.hitl_required = row.hitl_required;
      }
      push(normalized);
    }
  }

  for (const row of additions) {
    push(row);
  }

  return out;
}

async function loadCapsule(filePath: string): Promise<CapsuleRoot> {
  const raw = JSON.parse(await fs.readFile(filePath, 'utf8'));
  if (!isRecordObject(raw)) {
    throw new Error(`Capsule at ${filePath} is not a JSON object`);
  }
  return raw as unknown as CapsuleRoot;
}

async function writeCapsule(filePath: string, capsule: CapsuleRoot): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(capsule, null, 2)}\n`, 'utf8');
}

async function patchExistingCapsule(capsuleId: string, patch: ExistingPatch): Promise<void> {
  const filePath = path.join(CAPSULES_DIR, `${capsuleId}.json`);
  const capsule = await loadCapsule(filePath);

  if (!isRecordObject(capsule.metadata) || !isRecordObject(capsule.core_payload) || !isRecordObject(capsule.neuro_concentrate) || !isRecordObject(capsule.recursive_layer)) {
    throw new Error(`Capsule ${capsuleId} has invalid structure`);
  }

  capsule.metadata.version = patch.version;
  capsule.metadata.updated_at = NOW;
  if (patch.source) {
    capsule.metadata.source = patch.source;
  }

  capsule.core_payload.content_type = 'markdown';
  capsule.core_payload.content = patch.content;

  capsule.neuro_concentrate.summary = patch.summary;
  capsule.neuro_concentrate.keywords = uniqueKeywords(patch.keywords);
  capsule.neuro_concentrate.semantic_hash = capsule.metadata.semantic_hash;

  capsule.recursive_layer.links = mergeLinks(capsule.recursive_layer.links, patch.links);
  capsule.recursive_layer.actions = mergeActions(capsule.recursive_layer.actions, patch.actions);
  if (!Array.isArray(capsule.recursive_layer.epistemic_ledger)) {
    capsule.recursive_layer.epistemic_ledger = [];
  }

  capsule.integrity_sha3_512 = computeIntegrityHash(capsule);
  await writeCapsule(filePath, capsule);
}

function buildNewCapsule(spec: NewCapsuleSpec): CapsuleRoot {
  const capsule: CapsuleRoot = {
    metadata: spec.metadata,
    core_payload: spec.core_payload,
    neuro_concentrate: spec.neuro_concentrate,
    recursive_layer: spec.recursive_layer,
    integrity_sha3_512: '',
  };

  capsule.integrity_sha3_512 = computeIntegrityHash(capsule);
  return capsule;
}

async function collectExistingIds(): Promise<Set<string>> {
  const entries = await fs.readdir(CAPSULES_DIR);
  return new Set(
    entries
      .filter((entry) => entry.endsWith('.json'))
      .map((entry) => entry.replace(/\.json$/u, '')),
  );
}

async function main() {
  const touchedIds = new Set<string>();

  for (const [capsuleId, patch] of Object.entries(EXISTING_PATCHES)) {
    try {
      await patchExistingCapsule(capsuleId, patch);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown patch error';
      throw new Error(`Patch failed for ${capsuleId}: ${message}`);
    }
    touchedIds.add(capsuleId);
  }

  for (const [capsuleId, spec] of Object.entries(NEW_CAPSULES)) {
    const filePath = path.join(CAPSULES_DIR, `${capsuleId}.json`);
    try {
      const capsule = buildNewCapsule(spec);
      await writeCapsule(filePath, capsule);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown create error';
      throw new Error(`Create failed for ${capsuleId}: ${message}`);
    }
    touchedIds.add(capsuleId);
  }

  const existingIds = await collectExistingIds();

  for (const capsuleId of touchedIds) {
    const filePath = path.join(CAPSULES_DIR, `${capsuleId}.json`);
    const capsule = await loadCapsule(filePath);
    let result;
    try {
      result = await validateCapsule(capsule, { existingIds, cache: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      throw new Error(`Validation crashed for ${capsuleId}: ${message}`);
    }
    if (!result.valid) {
      throw new Error(
        `Validation failed for ${capsuleId}: ${result.errors
          .map((issue) => `${issue.gate} ${issue.path} ${issue.message}`)
          .join(' | ')}`,
      );
    }
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        touched: [...touchedIds].sort(),
        count: touchedIds.size,
        timestamp: NOW,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
