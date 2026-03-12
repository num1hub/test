import { NextResponse } from 'next/server';
import { ACTIVITY_ACTIONS, logActivity, type ActivityAction } from '@/lib/activity';
import { isAuthorized, requireTrustedMutation } from '@/lib/apiSecurity';

const isRecord = (input: unknown): input is Record<string, unknown> => {
  return Boolean(input && typeof input === 'object' && !Array.isArray(input));
};

export async function POST(request: Request) {
  const mutationError = requireTrustedMutation(request);
  if (mutationError) return mutationError;

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: unknown;
      details?: unknown;
    };

    const action =
      typeof body.action === 'string' && ACTIVITY_ACTIONS.includes(body.action as ActivityAction)
        ? (body.action as ActivityAction)
        : null;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const details = isRecord(body.details) ? body.details : undefined;
    await logActivity(action, details);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to write activity log' }, { status: 500 });
  }
}
