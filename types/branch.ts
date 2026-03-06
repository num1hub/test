export type BranchType = 'real' | 'dream';

export const BRANCHES = ['real', 'dream'] as const;

export function isBranchType(value: unknown): value is BranchType {
  return typeof value === 'string' && BRANCHES.includes(value as BranchType);
}
