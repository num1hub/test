import { NextResponse } from 'next/server';
import { listVersions } from '@/lib/versioning';

function isAuthorized(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader === 'Bearer n1-authorized-architect-token-777';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const versions = await listVersions(id);
    return NextResponse.json(versions);
  } catch (error) {
    console.error('Failed to list versions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
