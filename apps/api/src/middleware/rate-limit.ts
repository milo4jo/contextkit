/**
 * Rate limiting middleware
 *
 * Uses sliding window algorithm with Upstash Redis
 */

import { createMiddleware } from 'hono/factory';

import { PLAN_LIMITS, RateLimitError } from '../types';
import type { Env, Variables } from '../types';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit using sliding window
 */
async function checkRateLimit(env: Env, orgId: string, limit: number): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const windowStart = now - windowMs;
  const key = `ratelimit:${orgId}`;

  try {
    // Use Upstash Redis HTTP API
    const response = await fetch(`${env.UPSTASH_REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        // Remove old entries outside the window
        ['ZREMRANGEBYSCORE', key, '0', windowStart.toString()],
        // Add current request
        ['ZADD', key, now.toString(), `${now}:${Math.random()}`],
        // Count requests in window
        ['ZCARD', key],
        // Set expiry on the key
        ['EXPIRE', key, '120'],
      ]),
    });

    if (!response.ok) {
      // If Redis is down, allow the request (fail open)
      console.error('Redis error:', await response.text());
      return {
        allowed: true,
        limit,
        remaining: limit,
        resetAt: Math.ceil((now + windowMs) / 1000),
      };
    }

    const results = (await response.json()) as Array<{ result: number }>;
    const count = results[2]?.result ?? 0;
    const remaining = Math.max(0, limit - count);
    const resetAt = Math.ceil((now + windowMs) / 1000);

    return {
      allowed: count <= limit,
      limit,
      remaining,
      resetAt,
    };
  } catch (error) {
    // Fail open on errors
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt: Math.ceil((now + windowMs) / 1000),
    };
  }
}

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const orgId = c.get('orgId');
  const plan = c.get('plan');

  // Get limit for plan
  const planLimits = PLAN_LIMITS[plan];
  const limit = planLimits.requestsPerMinute;

  // Check rate limit
  const result = await checkRateLimit(c.env, orgId, limit);

  // Set rate limit headers
  c.header('X-RateLimit-Limit', result.limit.toString());
  c.header('X-RateLimit-Remaining', result.remaining.toString());
  c.header('X-RateLimit-Reset', result.resetAt.toString());

  if (!result.allowed) {
    const retryAfter = Math.ceil(result.resetAt - Date.now() / 1000);
    c.header('Retry-After', Math.max(1, retryAfter).toString());
    throw new RateLimitError(Math.max(1, retryAfter));
  }

  await next();
});

/**
 * Check monthly query limit
 */
export async function checkMonthlyLimit(
  env: Env,
  orgId: string,
  plan: string
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const planLimits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
  const monthlyLimit = planLimits?.queriesPerMonth;

  if (monthlyLimit === null) {
    return { allowed: true, used: 0, limit: null };
  }

  // Get current month's usage from KV (or database)
  const monthKey = new Date().toISOString().slice(0, 7); // "2026-02"
  const usageKey = `usage:${orgId}:${monthKey}`;

  try {
    const response = await fetch(`${env.UPSTASH_REDIS_URL}/get/${usageKey}`, {
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}`,
      },
    });

    if (!response.ok) {
      return { allowed: true, used: 0, limit: monthlyLimit };
    }

    const data = (await response.json()) as { result: string | null };
    const used = parseInt(data.result ?? '0', 10);

    return {
      allowed: used < monthlyLimit,
      used,
      limit: monthlyLimit,
    };
  } catch {
    return { allowed: true, used: 0, limit: monthlyLimit };
  }
}

/**
 * Increment monthly usage counter
 */
export async function incrementUsage(env: Env, orgId: string, amount = 1): Promise<void> {
  const monthKey = new Date().toISOString().slice(0, 7);
  const usageKey = `usage:${orgId}:${monthKey}`;

  try {
    await fetch(`${env.UPSTASH_REDIS_URL}/incrby/${usageKey}/${amount}`, {
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}`,
      },
    });

    // Set expiry for 35 days (to cover month + buffer)
    await fetch(`${env.UPSTASH_REDIS_URL}/expire/${usageKey}/3024000`, {
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}`,
      },
    });
  } catch (error) {
    console.error('Failed to increment usage:', error);
  }
}
