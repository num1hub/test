import type { GateDefinition } from '@/lib/validator/types';

export const STANDARD_CONTENT_TYPES = new Set(['markdown', 'json', 'text']);

export const DEFAULT_TOKEN_LIMIT = 1000;

export const GATE_DEFINITIONS: GateDefinition[] = [
  {
    id: 'G01',
    name: 'Root Structure',
    description: 'Capsule must contain exactly the five 5-Element Law root keys with no extras.',
    autoFixAvailable: false,
  },
  {
    id: 'G02',
    name: 'Required Subfields',
    description: 'Required subfields for metadata, payload, concentrate, and recursive layer must exist.',
    autoFixAvailable: false,
  },
  {
    id: 'G03',
    name: 'Type Correctness',
    description: 'Enums, versions, and primitive field types must match canonical CapsuleOS schema.',
    autoFixAvailable: false,
  },
  {
    id: 'G04',
    name: 'Provenance Coverage',
    description: 'provenance_coverage must be >= 0.85 and require metadata.source.uri when below 1.0.',
    threshold: '>= 0.85',
    autoFixAvailable: false,
  },
  {
    id: 'G05',
    name: 'Content Type',
    description: 'content_type should be markdown|json|text. Non-standard values produce warnings.',
    autoFixAvailable: false,
  },
  {
    id: 'G06',
    name: 'Payload Integrity',
    description: 'Core payload fields must be structurally valid; truncation_note must be a string if present.',
    autoFixAvailable: false,
  },
  {
    id: 'G07',
    name: 'Summary Length',
    description: 'Summary must contain between 70 and 160 words.',
    threshold: '70-160 words',
    autoFixAvailable: false,
  },
  {
    id: 'G08',
    name: 'Keyword Count',
    description: 'Keywords array must contain 5 to 15 entries.',
    threshold: '5-15',
    autoFixAvailable: false,
  },
  {
    id: 'G09',
    name: 'Semantic Hash Format',
    description: 'Semantic hashes must use exactly eight lowercase alphanumeric hyphen-separated tokens.',
    autoFixAvailable: false,
  },
  {
    id: 'G10',
    name: 'Semantic Hash Parity',
    description: 'metadata.semantic_hash and neuro_concentrate.semantic_hash must match.',
    autoFixAvailable: true,
  },
  {
    id: 'G11',
    name: 'Canonical Relation Types',
    description: 'Links must use canonical relation types. refutes is deprecated and auto-fixable.',
    autoFixAvailable: true,
  },
  {
    id: 'G12',
    name: 'Target Existence',
    description: 'Each recursive_layer.links target_id must resolve to an existing capsule.',
    autoFixAvailable: false,
  },
  {
    id: 'G13',
    name: 'Link Requirement',
    description: 'Non-draft capsules must include at least one outbound link.',
    autoFixAvailable: false,
  },
  {
    id: 'G14',
    name: 'Cosmetic Coherence Trap',
    description:
      'When token count exceeds limit, contradiction_pressure must be > 0 unless sovereign foundation.',
    threshold: `token_count > ${DEFAULT_TOKEN_LIMIT}`,
    autoFixAvailable: false,
  },
  {
    id: 'G15',
    name: 'Confidence Vector',
    description: 'Confidence vector must have six dimensions in [0,1], object or six-item array.',
    autoFixAvailable: true,
  },
  {
    id: 'G16',
    name: 'Integrity Seal',
    description: 'integrity_sha3_512 must match SHA3-512 of JCS-canonicalized first four root keys.',
    autoFixAvailable: false,
  },
];
