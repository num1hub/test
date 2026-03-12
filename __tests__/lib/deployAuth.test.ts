import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  getDeployAuthErrorMessage,
  getMissingDeployAuthEnvLabels,
  getMissingDeployAuthEnvLabelsForMode,
  getRequiredDeployAuthEnvLabels,
  isDeployAuthConfigured,
} from '@/lib/deployAuth';

describe('deployAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not require deploy env outside production', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
    };
    delete process.env.N1HUB_AUTH_SECRET;
    delete process.env.N1HUB_OWNER_LOGIN;
    delete process.env.VAULT_PASSWORD;
    delete process.env.N1HUB_ACCESS_CODE;
    delete process.env.N1HUB_OWNER_ROUTE_SEGMENT;

    expect(getMissingDeployAuthEnvLabels()).toEqual([]);
    expect(isDeployAuthConfigured()).toBe(true);
    expect(getDeployAuthErrorMessage()).toBeNull();
  });

  it('reports missing deploy env in production', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      N1HUB_OWNER_LOGIN: 'egor-n1',
      N1HUB_OWNER_ROUTE_SEGMENT: 'vault-door-4431',
    };
    delete process.env.N1HUB_AUTH_SECRET;
    delete process.env.VAULT_PASSWORD;
    delete process.env.N1HUB_ACCESS_CODE;

    expect(getMissingDeployAuthEnvLabels()).toEqual([
      'N1HUB_AUTH_SECRET',
      'VAULT_PASSWORD',
      'N1HUB_ACCESS_CODE',
    ]);
    expect(isDeployAuthConfigured()).toBe(false);
    expect(getDeployAuthErrorMessage()).toMatch(/Deployment auth is not configured/i);
  });

  it('requires the owner route segment in production deploy mode', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      N1HUB_AUTH_SECRET: 'auth-secret',
      N1HUB_OWNER_LOGIN: 'egor-n1',
      VAULT_PASSWORD: 'vault-pass',
      N1HUB_ACCESS_CODE: 'n1x1',
    };
    delete process.env.N1HUB_OWNER_ROUTE_SEGMENT;

    expect(getMissingDeployAuthEnvLabels()).toEqual(['N1HUB_OWNER_ROUTE_SEGMENT']);
    expect(isDeployAuthConfigured()).toBe(false);
  });

  it('reports required deploy env labels deterministically', () => {
    expect(getRequiredDeployAuthEnvLabels()).toEqual([
      'N1HUB_AUTH_SECRET',
      'N1HUB_OWNER_LOGIN',
      'VAULT_PASSWORD',
      'N1HUB_ACCESS_CODE',
      'N1HUB_OWNER_ROUTE_SEGMENT',
    ]);
  });

  it('can evaluate production readiness independently of NODE_ENV', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      N1HUB_AUTH_SECRET: 'auth-secret',
      N1HUB_OWNER_LOGIN: 'egor-n1',
      VAULT_PASSWORD: 'vault-pass',
      N1HUB_ACCESS_CODE: 'n1x1',
      N1HUB_OWNER_ROUTE_SEGMENT: 'vault-door-4431',
    };

    expect(getMissingDeployAuthEnvLabelsForMode('production')).toEqual([]);
    expect(getMissingDeployAuthEnvLabelsForMode('development')).toEqual([]);
  });
});
