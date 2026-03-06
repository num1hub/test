export type BranchName = string;

export const BRANCH_NAME_REGEX = /^[a-z0-9][a-z0-9._-]{0,63}$/;
export const DEFAULT_BRANCHES = ['real', 'dream'] as const;

/**
 * Backward-compatible alias retained for existing Real/Dream consumers while
 * the rest of the app moves to arbitrary branch names.
 */
export type BranchType = BranchName;

export const BRANCHES = DEFAULT_BRANCHES;

export function normalizeBranchName(value: unknown): BranchName | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return BRANCH_NAME_REGEX.test(normalized) ? normalized : null;
}

export function isBranchName(value: unknown): value is BranchName {
  return normalizeBranchName(value) !== null;
}

export function isDefaultBranch(value: unknown): value is (typeof DEFAULT_BRANCHES)[number] {
  const normalized = normalizeBranchName(value);
  return normalized !== null && DEFAULT_BRANCHES.includes(normalized as (typeof DEFAULT_BRANCHES)[number]);
}

export function isBranchType(value: unknown): value is BranchType {
  return isBranchName(value);
}
