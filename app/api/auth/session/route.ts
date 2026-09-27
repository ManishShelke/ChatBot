/**
 * GET /api/auth/session
 * Verify Stateless Session
 */

import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session.ts';
import { extractTokenFromHeader } from '@/lib/auth.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') || undefined;
  const authHeader = req.headers.get('authorization') || undefined;

  let token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    token = extractTokenFromHeader(cookieHeader, authHeader);
  }

  const { valid, user } = await verifySessionToken(token);

  if (!valid || !user) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        email: user.email,
      },
    },
    { status: 200 }
  );
}
