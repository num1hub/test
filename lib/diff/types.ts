import type { SovereignCapsule } from '@/types/capsule';

export type * from '@/contracts/diff';

export type ScopeType = 'capsule' | 'project' | 'vault';

export interface RemovedCapsuleRef {
  id: string;
  summary: string;
  capsuleType?: string;
  before?: SovereignCapsule;
}

export type RemovedNodeRef = RemovedCapsuleRef;

export interface ResolvedDiffOptions {
  branchA: string;
  branchB: string;
  scopeType: ScopeType;
  scopeRootId?: string;
  capsuleIds?: string[];
  recursive: boolean;
  cascadeDeletes: boolean;
  ignorePaths: string[];
  textMode: 'exact' | 'levenshtein';
  recursionDepthCap: number;
}

export interface ScopeSelection {
  scopeType: ScopeType;
  scopeRootId?: string;
  capsuleIds?: string[];
  recursive?: boolean;
}
