import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, isAuthorized } from '@/lib/apiSecurity';
import { clearAiWalletProvider, listAiWalletProviderSummaries, upsertAiWalletProvider } from '@/lib/aiWallet';
import { aiWalletUpdateSchema } from '@/lib/aiWalletSchema';
import { logActivity } from '@/lib/activity';

const parseBody = async (request: Request) => {
  const raw = (await request.json()) as unknown;
  return aiWalletUpdateSchema.parse(raw);
};

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(request, { maxRequests: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_seconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const providers = await listAiWalletProviderSummaries();
    return NextResponse.json({ providers });
  } catch {
    return NextResponse.json({ error: 'Failed to load AI wallet.' }, { status: 500 });
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
    const body = await parseBody(request);

    if (body.action === 'clear') {
      const provider = await clearAiWalletProvider(body.provider);
      await logActivity('update', {
        message: 'AI wallet provider cleared.',
        provider: body.provider,
      });
      return NextResponse.json({ provider });
    }

    if (!body.secret?.trim()) {
      return NextResponse.json({ error: 'Secret is required for provider save.' }, { status: 400 });
    }

    const provider = await upsertAiWalletProvider({
      provider: body.provider,
      secret: body.secret,
      enabled: body.enabled,
      preferredModel: body.preferredModel,
      endpoint: body.endpoint,
    });

    await logActivity('update', {
      message: 'AI wallet provider saved.',
      provider: body.provider,
      enabled: provider.enabled,
    });

    return NextResponse.json({ provider });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid AI wallet payload.',
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: 'Failed to update AI wallet.' }, { status: 500 });
  }
}
