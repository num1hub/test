import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PRIVATE_OWNER_ROUTE_SEGMENT,
  getPrivateOwnerLoginPath,
  getPrivateOwnerRouteSegment,
  matchesPrivateOwnerRouteSlug,
} from '@/lib/authConfig';

describe('authConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the default owner route segment when env is absent', () => {
    delete process.env.N1HUB_OWNER_ROUTE_SEGMENT;

    expect(getPrivateOwnerRouteSegment()).toBe(DEFAULT_PRIVATE_OWNER_ROUTE_SEGMENT);
    expect(getPrivateOwnerLoginPath()).toBe(`/architect-gate/${DEFAULT_PRIVATE_OWNER_ROUTE_SEGMENT}`);
    expect(matchesPrivateOwnerRouteSlug([DEFAULT_PRIVATE_OWNER_ROUTE_SEGMENT])).toBe(true);
  });

  it('uses the env-backed owner route segment when configured', () => {
    process.env.N1HUB_OWNER_ROUTE_SEGMENT = 'vault-door-4431';

    expect(getPrivateOwnerRouteSegment()).toBe('vault-door-4431');
    expect(getPrivateOwnerLoginPath()).toBe('/architect-gate/vault-door-4431');
    expect(matchesPrivateOwnerRouteSlug(['vault-door-4431'])).toBe(true);
    expect(matchesPrivateOwnerRouteSlug(['wrong-route'])).toBe(false);
  });
});
