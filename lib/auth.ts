/**
 * Zero-Database Authentication Engine.
 * Verifies credentials strictly against server-side environment variables.
 * 
 * Never leaks AUTH_SECRET or AUTH_PASSWORD_HASH to client bundles.
 */

import bcrypt from 'bcryptjs';
import { AuthenticatedUser } from '../types/api.ts';
import { verifySessionToken, createSessionToken } from './session.ts';

// Pre-computed fallback hash for default out-of-the-box development: "verdant2025!"
// Users can provide AUTH_EMAIL and AUTH_PASSWORD_HASH in their .env
const DEFAULT_AUTH_EMAIL = 'operator@verdant.ai';
// bcrypt hash of "verdant2025!" with 10 rounds
const DEFAULT_PASSWORD_HASH = '$2b$10$jbWrEDZrE2sgYeVS7SaSX.pdwtSAYXMReyPH6DAx5QHZmujxSwWi2';

export function getConfiguredAuthCredentials(): { email: string; passwordHash: string } {
  const email = (process.env.AUTH_EMAIL || DEFAULT_AUTH_EMAIL).trim().toLowerCase();
  const passwordHash = process.env.AUTH_PASSWORD_HASH || DEFAULT_PASSWORD_HASH;

  return { email, passwordHash };
}

/**
 * Validate operator credentials without database dependency
 */
export async function authenticateOperator(
  email: string,
  plainPassword: string
): Promise<{ success: boolean; user?: AuthenticatedUser }> {
  const { email: configuredEmail, passwordHash } = getConfiguredAuthCredentials();

  // Timing-safe email comparison
  const normalizedInboundEmail = email.trim().toLowerCase();
  if (normalizedInboundEmail !== configuredEmail) {
    // Perform dummy bcrypt comparison to mitigate timing attacks
    await bcrypt.compare(plainPassword, DEFAULT_PASSWORD_HASH);
    return { success: false };
  }

  const isPasswordValid = await bcrypt.compare(plainPassword, passwordHash);
  if (!isPasswordValid) {
    return { success: false };
  }

  const token = await createSessionToken(normalizedInboundEmail);
  const verification = await verifySessionToken(token);

  return {
    success: true,
    user: verification.user,
  };
}

/**
 * Extract token from Cookie header string or Authorization header
 */
export function extractTokenFromHeader(
  cookieHeader?: string,
  authHeader?: string
): string | undefined {
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('verdant_session=')) {
        return decodeURIComponent(cookie.substring('verdant_session='.length));
      }
    }
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring('Bearer '.length).trim();
  }

  return undefined;
}
