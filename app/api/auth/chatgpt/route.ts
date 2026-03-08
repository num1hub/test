import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity';
import { getAuthToken } from '@/lib/apiSecurity';
import { getChatGptLocalAuthStatus } from '@/lib/chatgptLocalAuth';

export async function GET() {
  const status = await getChatGptLocalAuthStatus();
  return NextResponse.json(status);
}

export async function POST() {
  const status = await getChatGptLocalAuthStatus();
  if (!status.enabled || !status.available) {
    return NextResponse.json(
      {
        error: status.reason ?? 'Local ChatGPT authentication is unavailable.',
        status,
      },
      { status: 401 },
    );
  }

  await logActivity('login', {
    message: 'Architect authenticated through local ChatGPT/Codex session.',
  });

  return NextResponse.json({
    token: getAuthToken(),
    provider: 'chatgpt_local_codex',
    email: status.email,
    plan_type: status.plan_type,
  });
}
