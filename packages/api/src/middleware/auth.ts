/**
 * Auth Middleware
 * 
 * Verifies JWT tokens from Clerk
 */

import { Context, Next } from 'hono';
import type { Env } from '../index';
import { verifyClerkToken } from '../lib/clerk';

export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: { userId: string } }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyClerkToken(token, c.env.CLERK_SECRET_KEY);
    c.set('userId', payload.sub);
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }
}
