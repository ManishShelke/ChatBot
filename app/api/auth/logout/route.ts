/**
 * POST /api/auth/logout
 * Invalidate Stateless Session Cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/session.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  const response = NextResponse.json({ success: true }, { status: 200 });

  const isProduction = process.env.NODE_ENV === 'production';

  // Expire the session cookie immediately
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
    expires: new Date(0),
  });

  return response;
}
