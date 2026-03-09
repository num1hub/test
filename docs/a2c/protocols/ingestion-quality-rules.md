# Ingestion Quality Rules

## Objective

Convert incoming files into capsules that are useful immediately and safe for recursive refinement.

## Required Capsule Guarantees (Module A: Audit)

1. `metadata.semantic_hash` equals `neuro_concentrate.semantic_hash`.
2. `core_payload.content` contains the extracted source text or a clear binary-ingestion record.
3. `metadata.source.uri` references the local source file URI.
4. `metadata.source_sha256` captures deterministic provenance for deduplication/audit.
5. Every optional link has both target and relation fields.
6. Each capsule has either `recursive` or `recursive_layer` object.

## Distillation Rules

1. Build `summary` from source-first extraction, not speculative rewriting.
2. Keep `keywords` deterministic and deduplicated.
3. Keep `claims` grounded in source text snippets.
4. Keep `insights` as operational follow-up hints, not invented facts.
5. Keep output ordering deterministic for stable diffs and audits.

## Binary and Non-Text Inputs

When text extraction is not possible via standard library:

1. Record file metadata and SHA256 in payload.
2. Set truncation or extraction notes.
3. Ask for OCR/transcript for full semantic mining.

## Graph Integrity (Module C: Fact-Check)

1. Ensure every link target resolves to a known capsule ID.
2. Ensure index nodes include each vault capsule.
3. Flag non-canonical link relations for human review.

## Post-Run Validation

After ingestion:

1. Verify capsule file creation count.
2. Verify index nodes and edges updated.
3. Verify ingestion log appended.
4. If links were provided, verify link targets exist or flag unresolved edges.
5. Emit strict JSON summary with confidence and `human_review_required`.
