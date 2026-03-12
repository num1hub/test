import { NextResponse } from 'next/server';
import { getPasswordHash, verifyPassword } from '@/lib/password';
import { logActivity } from '@/lib/activity';
import { getAuthToken, setSessionCookie } from '@/lib/apiSecurity';
import { matchesAuthorizedLogin, verifyAccessCode } from '@/lib/authFactors';

type LoginAttemptState = {
  count: number;
  windowStart: number;
  lockUntil: number;
};

const loginAttemptBuckets = new Map<string, LoginAttemptState>();
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function getAttemptKey(request: Request, login: string) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown-ip';
  return `${ip}:${login.trim().toLowerCase()}`;
}

function getAttemptState(key: string): LoginAttemptState {
  const now = Date.now();
  const current = loginAttemptBuckets.get(key);

  if (!current || now - current.windowStart > ATTEMPT_WINDOW_MS) {
    const next = { count: 0, windowStart: now, lockUntil: 0 };
    loginAttemptBuckets.set(key, next);
    return next;
  }

  return current;
}

function isLocked(state: LoginAttemptState) {
  return state.lockUntil > Date.now();
}

function registerFailedAttempt(key: string, state: LoginAttemptState) {
  state.count += 1;
  if (state.count >= MAX_ATTEMPTS) {
    state.lockUntil = Date.now() + LOCKOUT_MS;
  }
  loginAttemptBuckets.set(key, state);
}

function resetAttempts(key: string) {
  loginAttemptBuckets.delete(key);
}

export async function POST(request: Request) {
  try {
    const {
      login,
      password,
      accessCode,
    } = (await request.json()) as {
      login?: string;
      password?: string;
      accessCode?: string;
    };

    if (!login || !password || !accessCode) {
      return NextResponse.json({ error: 'Missing required credentials.' }, { status: 400 });
    }

    const attemptKey = getAttemptKey(request, login);
    const attemptState = getAttemptState(attemptKey);
    if (isLocked(attemptState)) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((attemptState.lockUntil - Date.now()) / 1000),
      );
      return NextResponse.json(
        { error: 'Too many failed attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
      );
    }

    if (!matchesAuthorizedLogin(login)) {
      registerFailedAttempt(attemptKey, attemptState);
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const storedHash = await getPasswordHash();
    const [passwordMatches, accessCodeMatches] = await Promise.all([
      verifyPassword(password, storedHash),
      verifyAccessCode(accessCode),
    ]);

    if (!passwordMatches || !accessCodeMatches) {
      registerFailedAttempt(attemptKey, attemptState);
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    resetAttempts(attemptKey);

    const token = getAuthToken({
      sub: login.trim().toLowerCase(),
      role: 'owner',
      factors: ['password', 'access_code'],
    });
    const response = NextResponse.json({ token }, { status: 200 });
    setSessionCookie(response, token);

    await logActivity('login', {
      message: 'Architect authenticated with password and private access code.',
      login: login.trim().toLowerCase(),
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
