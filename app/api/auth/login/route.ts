/**
 * POST /api/auth/login
 * Stateless Authentication Handler (Zero Database)
 */

import { NextRequest, NextResponse } from 'next/server';
import { LoginRequestSchema } from '@/lib/validation.ts';
import { authenticateOperator } from '@/lib/auth.ts';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/session.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload in request body.' },
        { status: 400 }
      );
    }

    // 1. Zod request validation
    const parsed = LoginRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // 2. Authenticate against environment secrets
    const authResult = await authenticateOperator(email, password);
    if (!authResult.success || !authResult.user) {
      // Intentionally generic error message to prevent enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 3. Generate signed stateless JWT
    const token = await createSessionToken(authResult.user.email);

    // 4. Build response with HTTP-only secure cookie
    const response = NextResponse.json(
      {
        authenticated: true,
        user: {
          email: authResult.user.email,
        },
      },
      { status: 200 }
    );

    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Auth Login Error]:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Authentication service temporarily unavailable.' },
      { status: 500 }
    );
  }
}
