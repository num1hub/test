import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/apiSecurity';

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });
  clearSessionCookie(response);
  return response;
}
