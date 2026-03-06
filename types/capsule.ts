export type CapsuleType =
  | 'foundation'
  | 'concept'
  | 'operations'
  | 'physical_object'
  | 'project';
export type CapsuleSubtype = 'hub' | 'atomic';
export type CapsuleTier = 1 | 2 | 3 | 4;
export type CapsuleStatus =
  | 'draft'
  | 'active'
  | 'sovereign'
  | 'frozen'
  | 'archived'
  | 'quarantined'
  | 'legacy';

export interface CapsuleMetadata {
  capsule_id: string;
  type?: CapsuleType;
  subtype?: CapsuleSubtype;
  tier?: CapsuleTier;
  status?: CapsuleStatus;
  version?: string | number;
  author?: string;
  created_at?: string;
  updated_at?: string;
  name?: string;
  dueDate?: string;
  priority?: string | number;
  progress?: number;
  estimatedHours?: number;
  actualHours?: number;
  estimatedCost?: number;
  cost?: number;
  semantic_hash?: string;
  source?: {
    uri?: string;
    sha256?: string;
    type?: string;
  };
  architect_override?: {
    reason: string;
    timestamp: string;
    signature: string;
  };
  [key: string]: unknown;
}

export type ConfidenceVector = number[] | Record<string, number>;

export interface SovereignCapsule {
  metadata: CapsuleMetadata;
  core_payload: {
    content_type?: string;
    content?: string;
    estimatedHours?: number;
    actualHours?: number;
    estimatedCost?: number;
    cost?: number;
    [key: string]: unknown;
  };
  neuro_concentrate: {
    summary?: string;
    confidence_vector?: ConfidenceVector;
    keywords?: string[];
    [key: string]: unknown;
  };
  recursive_layer: {
    links?: Array<{
      target_id: string;
      relation_type?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  integrity_sha3_512: string;
  [key: string]: unknown;
}
