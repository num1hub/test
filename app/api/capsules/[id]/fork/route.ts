import { NextResponse } from 'next/server';
import { branchExists, forkCapsule } from '@/lib/branching';

function isAuthorized(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader === 'Bearer n1-authorized-architect-token-777';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (await branchExists(id, 'dream')) {
      return NextResponse.json({ error: 'Dream branch already exists.' }, { status: 409 });
    }

    const dreamCapsule = await forkCapsule(id);
    return NextResponse.json(dreamCapsule, { status: 201 });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Real capsule not found to fork.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
