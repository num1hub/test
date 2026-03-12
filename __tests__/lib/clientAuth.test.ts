import { describe, expect, it } from 'vitest';
import {
  getClientAuthHeaders,
  getClientJsonAuthHeaders,
  getClientVaultToken,
} from '@/lib/clientAuth';

describe('clientAuth', () => {
  it('returns null when no token is stored', () => {
    window.localStorage.removeItem('n1hub_vault_token');
    expect(getClientVaultToken()).toBeNull();
    expect(getClientAuthHeaders()).toEqual({});
    expect(getClientJsonAuthHeaders()).toEqual({ 'Content-Type': 'application/json' });
  });

  it('adds bearer authorization when token exists', () => {
    window.localStorage.setItem('n1hub_vault_token', 'secret-token');

    expect(getClientVaultToken()).toBe('secret-token');
    expect(getClientAuthHeaders({ Accept: 'application/json' })).toEqual({
      Accept: 'application/json',
      Authorization: 'Bearer secret-token',
    });
    expect(getClientJsonAuthHeaders()).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer secret-token',
    });
  });
});
