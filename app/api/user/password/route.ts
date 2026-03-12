import { NextResponse } from 'next/server';
import { getPasswordHash, isEnvBackedPassword, setPasswordHash, verifyPassword } from '@/lib/password';
import { logActivity } from '@/lib/activity';
import { isAuthorized, requireTrustedMutation } from '@/lib/apiSecurity';

export async function PUT(request: Request) {
  const mutationError = requireTrustedMutation(request);
  if (mutationError) return mutationError;

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isEnvBackedPassword()) {
    return NextResponse.json(
      {
        error:
          'Password changes are disabled in env-backed deployments. Update VAULT_PASSWORD in your deployment settings instead.',
      },
      { status: 409 },
    );
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
