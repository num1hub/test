const REQUIRED_DEPLOY_AUTH_LABELS = [
  'N1HUB_AUTH_SECRET',
  'N1HUB_OWNER_LOGIN',
  'VAULT_PASSWORD',
  'N1HUB_ACCESS_CODE',
  'N1HUB_OWNER_ROUTE_SEGMENT',
] as const;

export type DeployAuthMode = 'production' | 'development';

export type DeploySmokeStatus = {
  ok: boolean;
  mode: 'production' | 'development';
  authConfigured: boolean;
  lockedRootPath: '/';
  ownerRouteBasePath: '/architect-gate/<hidden>';
  checks: {
    failClosedAuth: true;
    sessionCookieBoundary: true;
    ownerRouteSegmentConfigured: boolean;
  };
  missingEnv: string[];
};

function hasConfiguredAuthSecret() {
  return Boolean(
    process.env.N1HUB_AUTH_SECRET?.trim() || process.env.N1HUB_AUTH_TOKEN?.trim(),
  );
}

function hasConfiguredOwnerLogin() {
  return Boolean(process.env.N1HUB_OWNER_LOGIN?.trim());
}

function hasConfiguredVaultPassword() {
  return Boolean(process.env.VAULT_PASSWORD?.trim());
}

function hasConfiguredAccessCode() {
  return Boolean(process.env.N1HUB_ACCESS_CODE?.trim());
}

function hasConfiguredOwnerRouteSegment() {
  return Boolean(process.env.N1HUB_OWNER_ROUTE_SEGMENT?.trim());
}

export function isProductionDeployAuthMode() {
  return process.env.NODE_ENV === 'production';
}

export function getRequiredDeployAuthEnvLabels() {
  return [...REQUIRED_DEPLOY_AUTH_LABELS];
}

export function getMissingDeployAuthEnvLabelsForMode(mode: DeployAuthMode) {
  if (mode !== 'production') return [] as string[];

  const missing: string[] = [];
  if (!hasConfiguredAuthSecret()) missing.push(REQUIRED_DEPLOY_AUTH_LABELS[0]);
  if (!hasConfiguredOwnerLogin()) missing.push(REQUIRED_DEPLOY_AUTH_LABELS[1]);
  if (!hasConfiguredVaultPassword()) missing.push(REQUIRED_DEPLOY_AUTH_LABELS[2]);
  if (!hasConfiguredAccessCode()) missing.push(REQUIRED_DEPLOY_AUTH_LABELS[3]);
  if (!hasConfiguredOwnerRouteSegment()) missing.push(REQUIRED_DEPLOY_AUTH_LABELS[4]);
  return missing;
}

export function getMissingDeployAuthEnvLabels() {
  return getMissingDeployAuthEnvLabelsForMode(
    isProductionDeployAuthMode() ? 'production' : 'development',
  );
}

export function isDeployAuthConfigured() {
  return getMissingDeployAuthEnvLabels().length === 0;
}

export function getDeployAuthErrorMessage() {
  const missing = getMissingDeployAuthEnvLabels();
  if (missing.length === 0) return null;
  return `Deployment auth is not configured. Missing: ${missing.join(', ')}.`;
}

export function getDeploySmokeStatus(): DeploySmokeStatus {
  const missingEnv = getMissingDeployAuthEnvLabels();

  return {
    ok: missingEnv.length === 0,
    mode: isProductionDeployAuthMode() ? 'production' : 'development',
    authConfigured: missingEnv.length === 0,
    lockedRootPath: '/',
    ownerRouteBasePath: '/architect-gate/<hidden>',
    checks: {
      failClosedAuth: true,
      sessionCookieBoundary: true,
      ownerRouteSegmentConfigured: !missingEnv.includes('N1HUB_OWNER_ROUTE_SEGMENT'),
    },
    missingEnv,
  };
}
