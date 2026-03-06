'use client';

import type { BranchType } from '@/types/branch';
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
  branch: BranchType,
  token: string,
) {
  return fetch(`/api/capsules/${capsuleId}?branch=${branch}`, {
    headers: authHeaders(token),
  });
}

export async function fetchCapsuleBranchData(
  capsuleId: string,
  branch: BranchType,
  token: string,
) {
  const response = await fetchCapsuleBranchResponse(capsuleId, branch, token);
  const data = response.ok ? ((await response.json()) as SovereignCapsule) : null;
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

export async function deleteCapsuleRequest(capsuleId: string, token: string) {
  return fetch(`/api/capsules/${capsuleId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}
