import { NextResponse } from 'next/server';
import { clearSessionCookie, requireSameOriginMutation } from '@/lib/apiSecurity';

export async function POST(request: Request) {
  const mutationError = requireSameOriginMutation(request);
  if (mutationError) return mutationError;

  const response = NextResponse.json({ success: true }, { status: 200 });
  clearSessionCookie(response);
  return response;
}
