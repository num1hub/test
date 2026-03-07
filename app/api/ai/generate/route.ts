import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, isAuthorized } from '@/lib/apiSecurity';
import { generateTextWithAiProvider } from '@/lib/ai/providerRuntime';
import { aiWalletProviderIdSchema } from '@/lib/aiWalletSchema';

const requestSchema = z.object({
  provider: aiWalletProviderIdSchema.optional(),
  system: z.string().trim().max(20_000).optional(),
  prompt: z.string().trim().min(1).max(40_000),
  model: z.string().trim().max(200).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(16_384).optional(),
});

export async function POST(request: Request) {
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
    const parsed = requestSchema.parse(await request.json());
    const result = await generateTextWithAiProvider(parsed);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid AI generate payload' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
