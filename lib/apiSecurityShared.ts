export type SessionRole = 'owner' | 'editor' | 'viewer';
export type AuthFactor = 'password' | 'access_code';
export type AuthSession = {
  sub: string;
  role: SessionRole;
  factors: AuthFactor[];
  issuedAt: number;
  expiresAt: number;
};

export const AUTH_COOKIE_NAME = 'n1hub_session';

export function isSessionShape(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;

  const session = value as Partial<AuthSession>;
  return (
    typeof session.sub === 'string' &&
    (session.role === 'owner' || session.role === 'editor' || session.role === 'viewer') &&
    Array.isArray(session.factors) &&
    typeof session.issuedAt === 'number' &&
    typeof session.expiresAt === 'number'
  );
}
