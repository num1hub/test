import { NextResponse } from 'next/server';
import { getPasswordHash, verifyPassword } from '@/lib/password';
import { logActivity } from '@/lib/activity';
import { getAuthToken } from '@/lib/apiSecurity';

export async function POST(request: Request) {
  try {
    const { password } = (await request.json()) as { password?: string };
    if (!password) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storedHash = await getPasswordHash();
    const isMatch = await verifyPassword(password, storedHash);

    if (isMatch) {
      await logActivity('login', { message: 'Architect authenticated successfully.' });
      return NextResponse.json({ token: getAuthToken() });
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
