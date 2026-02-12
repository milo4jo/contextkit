/**
 * Usage and billing routes
 */

import { Hono } from 'hono';

import { getUsageStats } from '../services/usage-service';
import { PLAN_LIMITS } from '../types';
import type { Env, Variables } from '../types';

export const usageRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

/**
 * GET /usage
 * Get current usage statistics
 */
usageRoutes.get('/', async (c) => {
  const orgId = c.get('orgId');
  const plan = c.get('plan');

  const usage = await getUsageStats(c.env, orgId);
  const limits = PLAN_LIMITS[plan];

  // Get current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return c.json({
    period: {
      start: startOfMonth.toISOString().split('T')[0],
      end: endOfMonth.toISOString().split('T')[0],
    },
    queries: {
      used: usage.queries,
      limit: limits.queriesPerMonth,
    },
    tokens: {
      used: usage.tokens,
    },
    storage: {
      used_bytes: usage.storageBytes,
      limit_bytes: limits.storageBytes,
    },
    plan,
  });
});
