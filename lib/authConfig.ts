export const PRIVATE_OWNER_ROUTE_BASE_PATH = '/architect-gate';
export const DEFAULT_PRIVATE_OWNER_ROUTE_SEGMENT = 'egor-n1-vault-7q4x';
export const OWNER_ACCESS_CODE_LENGTH = 4;

export function getPrivateOwnerRouteSegment() {
  return process.env.N1HUB_OWNER_ROUTE_SEGMENT?.trim() || DEFAULT_PRIVATE_OWNER_ROUTE_SEGMENT;
}

export function getPrivateOwnerLoginPath() {
  return `${PRIVATE_OWNER_ROUTE_BASE_PATH}/${getPrivateOwnerRouteSegment()}`;
}

export function matchesPrivateOwnerRouteSlug(slug: string[] | null | undefined) {
  return Array.isArray(slug) && slug.length === 1 && slug[0] === getPrivateOwnerRouteSegment();
}
