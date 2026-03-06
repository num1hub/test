'use client';

import type { BranchInfo, DiffResult, MergeResult } from '@/contracts/diff';
import type { BranchName } from '@/types/branch';
import type { SovereignCapsule } from '@/types/capsule';

type ErrorResponse = { error?: string };

export function getVaultToken() {
  return localStorage.getItem('n1hub_vault_token');
}

export function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as ErrorResponse;
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchCapsuleBranchResponse(
  capsuleId: string,
  branch: BranchName,
  token: string,
) {
  return fetch(`/api/capsules/${capsuleId}?branch=${branch}`, {
    headers: authHeaders(token),
  });
}

export async function fetchCapsuleBranchData(
  capsuleId: string,
  branch: BranchName,
  token: string,
) {
  const response = await fetchCapsuleBranchResponse(capsuleId, branch, token);
  const data = response.ok ? ((await response.json()) as SovereignCapsule) : null;
  return { response, data };
}

export async function fetchBranchCapsules(branch: BranchName, token: string) {
  const search = new URLSearchParams();
  if (branch !== 'real') search.set('branch', branch);

  const response = await fetch(`/api/capsules${search.toString() ? `?${search.toString()}` : ''}`, {
    headers: authHeaders(token),
  });
  const data = response.ok ? ((await response.json()) as SovereignCapsule[]) : null;
  return { response, data };
}

export async function fetchBranchList(params: {
  token: string;
  capsuleId?: string;
  projectId?: string;
}) {
  const search = new URLSearchParams();
  if (params.capsuleId) search.set('capsuleId', params.capsuleId);
  if (params.projectId) search.set('projectId', params.projectId);

  const response = await fetch(`/api/branches?${search.toString()}`, {
    headers: authHeaders(params.token),
  });
  const data = response.ok ? ((await response.json()) as { branches: BranchInfo[] }) : null;
  return { response, data };
}

export async function fetchCapsuleDiff(
  capsuleId: string,
  branchA: BranchName,
  branchB: BranchName,
  token: string,
  recursive: boolean = false,
) {
  const search = new URLSearchParams({
    branchA,
    branchB,
    recursive: String(recursive),
  });
  const response = await fetch(`/api/capsules/${capsuleId}/diff?${search.toString()}`, {
    headers: authHeaders(token),
  });
  const data = response.ok ? ((await response.json()) as DiffResult) : null;
  return { response, data };
}

export async function postForkCapsule(capsuleId: string, token: string) {
  return fetch(`/api/capsules/${capsuleId}/fork`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function postPromoteCapsule(capsuleId: string, token: string) {
  return fetch(`/api/capsules/${capsuleId}/promote`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function applyBranchMerge(
  body: Record<string, unknown>,
  token: string,
) {
  const response = await fetch('/api/diff/apply', {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let data: MergeResult | null = null;
  try {
    const parsed = (await response.json()) as Partial<MergeResult>;
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.conflicts) &&
      parsed.diff &&
      typeof parsed.diff === 'object'
    ) {
      data = parsed as MergeResult;
    }
  } catch {
    data = null;
  }

  return { response, data };
}

export async function deleteCapsuleRequest(capsuleId: string, token: string) {
  return fetch(`/api/capsules/${capsuleId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}
