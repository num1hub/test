import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/apiSecurity';
import { dataPath } from '@/lib/dataPath';

const PRE_REGISTRATION_PATH = dataPath('private', 'auth', 'pre-registrations.jsonl');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ensurePreRegistrationDir() {
  await fs.mkdir(path.dirname(PRE_REGISTRATION_PATH), { recursive: true });
}

export async function POST(request: Request) {
  const rate = checkRateLimit(request, { maxRequests: 5, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      intent?: string;
    };

    const name = body.name?.trim() ?? '';
    const email = body.email?.trim() ?? '';
    const intent = body.intent?.trim() ?? '';

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }

    await ensurePreRegistrationDir();
    await fs.appendFile(
      PRE_REGISTRATION_PATH,
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        name,
        email,
        intent,
      })}\n`,
      'utf-8',
    );

    return NextResponse.json(
      { message: 'Pre-registration request recorded.' },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Unable to save access request.' }, { status: 500 });
  }
}
