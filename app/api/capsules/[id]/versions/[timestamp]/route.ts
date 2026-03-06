import { NextResponse } from 'next/server';
import { getVersion, restoreVersion } from '@/lib/versioning';

function isAuthorized(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader === 'Bearer n1-authorized-architect-token-777';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; timestamp: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, timestamp } = await params;
    const versionData = await getVersion(id, timestamp);
    return NextResponse.json(versionData);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; timestamp: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, timestamp } = await params;
    const restoredCapsule = await restoreVersion(id, timestamp);
    return NextResponse.json(restoredCapsule);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
  }
}
