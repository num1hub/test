import { NextResponse } from 'next/server';
import { getRecentActivity } from '@/lib/activity';

function isAuthorized(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader === 'Bearer n1-authorized-architect-token-777';
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 50;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 50;

    const activities = await getRecentActivity(limit);
    return NextResponse.json(activities);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 });
  }
}
