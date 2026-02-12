/**
 * Dashboard Authentication Middleware
 *
 * Validates Clerk JWTs for dashboard requests
 */

import { createMiddleware } from 'hono/factory';
import { nanoid } from 'nanoid';

import type { Env, Variables } from '../types';
import { UnauthorizedError } from '../types';

interface ClerkJWTPayload {
  sub: string; // Clerk user ID
  email?: string;
  name?: string;
  image_url?: string;
  exp: number;
  iat: number;
}

/**
 * Verify Clerk JWT
 * In production, this would verify against Clerk's JWKS endpoint
 * For now, we trust the token from Clerk's middleware
 */
async function verifyClerkJWT(token: string, _env: Env): Promise<ClerkJWTPayload | null> {
  try {
    // Decode JWT (base64url)
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return payload as ClerkJWTPayload;
  } catch {
    return null;
  }
}

/**
 * Dashboard auth middleware
 * Expects: Authorization: Bearer <clerk_session_token>
 */
export const dashboardAuthMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  // Generate request ID
  const requestId = nanoid(12);
  c.set('requestId', requestId);

  // Extract token
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing Authorization header');
  }

  const token = authHeader.slice(7);
  const payload = await verifyClerkJWT(token, c.env);

  if (!payload) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  // Set user context
  c.set('clerkUserId', payload.sub);
  c.set('userEmail', payload.email);

  await next();
});
