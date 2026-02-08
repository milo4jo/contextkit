/**
 * Auth Routes
 * 
 * Handles authentication via Clerk
 */

import { Hono } from 'hono';
import type { Env } from '../index';
import { getDb } from '../db/client';
import { verifyClerkToken } from '../lib/clerk';

export const authRoutes = new Hono<{ Bindings: Env }>();

/**
 * Get current user
 */
authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  
  try {
    const payload = await verifyClerkToken(token, c.env.CLERK_SECRET_KEY);
    const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);
    
    const user = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [payload.sub],
    });

    if (user.rows.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user: user.rows[0] });
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Invalid token' }, 401);
  }
});

/**
 * Exchange CLI auth code for token
 * Used by `contextkit login`
 */
authRoutes.post('/cli/exchange', async (c) => {
  const { code } = await c.req.json();
  
  if (!code) {
    return c.json({ error: 'Code required' }, 400);
  }

  // TODO: Implement code exchange with Clerk
  // For now, return placeholder
  return c.json({ 
    message: 'Token exchange not yet implemented',
    code 
  });
});

/**
 * Generate CLI auth URL
 */
authRoutes.get('/cli/authorize', (c) => {
  const state = crypto.randomUUID();
  
  // TODO: Store state for verification
  // TODO: Return actual Clerk OAuth URL
  
  return c.json({
    url: `https://app.contextkit.dev/cli-auth?state=${state}`,
    state,
  });
});
