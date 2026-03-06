import { NextResponse } from 'next/server';
import { getPasswordHash, setPasswordHash, verifyPassword } from '@/lib/password';
import { logActivity } from '@/lib/activity';

function isAuthorized(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader === 'Bearer n1-authorized-architect-token-777';
}

export async function PUT(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 },
      );
    }

    const storedHash = await getPasswordHash();
    const isMatch = await verifyPassword(currentPassword, storedHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 403 });
    }

    await setPasswordHash(newPassword);
    await logActivity('password_change', { message: 'Master password updated by Architect.' });

    return NextResponse.json({ message: 'Password updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Password Update Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
