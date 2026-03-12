export function getClientVaultToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('n1hub_vault_token');
}

export function getClientAuthHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  const token = getClientVaultToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

export function getClientJsonAuthHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  return getClientAuthHeaders({
    'Content-Type': 'application/json',
    ...headers,
  });
}
