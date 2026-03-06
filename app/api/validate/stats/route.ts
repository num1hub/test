import { NextResponse } from 'next/server';
import { checkRateLimit, isAuthorized } from '@/lib/apiSecurity';
import { buildValidationStats, readValidationLogs } from '@/lib/validationLog';

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
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 500;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 500;

    const entries = await readValidationLogs(limit);
    const stats = buildValidationStats(entries);

    const gateFrequency = new Map<string, number>();
    for (const entry of entries) {
      for (const issue of [...entry.errors, ...entry.warnings]) {
        const count = gateFrequency.get(issue.gate) ?? 0;
        gateFrequency.set(issue.gate, count + 1);
      }
    }

    const gates = [...gateFrequency.entries()]
      .map(([gate, count]) => ({ gate, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      ...stats,
      gates,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to compute validation stats' }, { status: 500 });
  }
}
