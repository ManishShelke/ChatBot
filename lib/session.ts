/**
 * Session Token Engine (Stateless JWT / HMAC)
 * Zero database requirement. Validates claims purely against cryptographic server secrets.
 */

import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { AuthenticatedUser } from '../types/api.ts';

const DEFAULT_FALLBACK_SECRET = 'verdant-stateless-secure-session-secret-key-32-chars-min-2025';

function getSessionSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET || DEFAULT_FALLBACK_SECRET;
  return new TextEncoder().encode(secret);
}

export interface SessionClaims {
  sub: string; // user email
  safetyId: string;
  role: 'operator' | 'synthesizer';
  iat: number;
  exp: number;
}

export const SESSION_COOKIE_NAME = 'verdant_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Generate a privacy-conscious, non-reversible safety identifier for OpenAI API telemetry
 */
export function deriveUserSafetyId(email: string): string {
  const secret = process.env.AUTH_SECRET || DEFAULT_FALLBACK_SECRET;
  return 'usr_' + crypto.createHmac('sha256', secret).update(email.toLowerCase().trim()).digest('hex').slice(0, 24);
}

/**
 * Generate a cryptographically signed JWT session token
 */
export async function createSessionToken(email: string): Promise<string> {
  const safetyId = deriveUserSafetyId(email);
  const secret = getSessionSecret();

  return new SignJWT({
    sub: email.toLowerCase().trim(),
    safetyId,
    role: 'operator',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/**
 * Verify statutory JWT session token and extract claims
 */
export async function verifySessionToken(token?: string): Promise<{
  valid: boolean;
  user?: AuthenticatedUser;
}> {
  if (!token) {
    return { valid: false };
  }

  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub as string;
    const safetyId = (payload.safetyId as string) || deriveUserSafetyId(sub);
    const role = (payload.role as 'operator' | 'synthesizer') || 'operator';

    if (!sub) {
      return { valid: false };
    }

    return {
      valid: true,
      user: {
        email: sub,
        safetyId,
        role,
      },
    };
  } catch {
    return { valid: false };
  }
}
