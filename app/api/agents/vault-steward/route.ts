import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, isAuthorized } from '@/lib/apiSecurity';
import {
  getVaultStewardState,
  runVaultStewardOnce,
  startVaultSteward,
  stopVaultSteward,
  updateVaultStewardConfig,
} from '@/lib/agents/vaultSteward';
import { aiWalletProviderIdSchema } from '@/lib/aiWalletSchema';

const actionSchema = z.object({
  action: z.enum(['start', 'stop', 'run_once']),
});

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.string().trim().nullable().optional(),
  model: z.string().trim().max(160).optional(),
  mode: z.enum(['continuous', 'nightly']).optional(),
  interval_minutes: z.number().int().min(1).max(1440).optional(),
  night_start_hour: z.number().int().min(0).max(23).optional(),
  night_end_hour: z.number().int().min(0).max(23).optional(),
  timezone: z.string().trim().max(120).nullable().optional(),
  max_targets_per_run: z.number().int().min(1).max(12).optional(),
});

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(request, { maxRequests: 120, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_seconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const state = await getVaultStewardState();
    return NextResponse.json(state);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load Vault Steward state' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(request, { maxRequests: 30, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_seconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const raw = (await request.json()) as unknown;
    const payload = updateSchema.parse(raw);
    const provider =
      payload.provider === undefined
        ? undefined
        : payload.provider === null || payload.provider === '' || payload.provider === 'auto'
          ? 'auto'
          : aiWalletProviderIdSchema.parse(payload.provider);
    const state = await updateVaultStewardConfig({
      ...payload,
      provider,
    });
    return NextResponse.json(state);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid Vault Steward payload', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update Vault Steward config' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(request, { maxRequests: 20, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_seconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const raw = (await request.json()) as unknown;
    const payload = actionSchema.parse(raw);

    switch (payload.action) {
      case 'start': {
        const runtime = await startVaultSteward();
        return NextResponse.json({ ok: true, runtime });
      }
      case 'stop': {
        const runtime = await stopVaultSteward();
        return NextResponse.json({ ok: true, runtime });
      }
      case 'run_once': {
        const run = await runVaultStewardOnce();
        return NextResponse.json({ ok: true, run });
      }
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid Vault Steward action payload', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to control Vault Steward' },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
