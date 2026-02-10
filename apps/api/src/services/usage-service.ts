/**
 * Usage tracking service
 */

import type { Env } from "../types";

interface UsageStats {
  queries: number;
  tokens: number;
  storageBytes: number;
}

/**
 * Get usage statistics for an organization
 */
export async function getUsageStats(
  env: Env,
  orgId: string
): Promise<UsageStats> {
  const monthKey = new Date().toISOString().slice(0, 7); // "2026-02"

  try {
    // Get queries from Redis
    const queryKey = `usage:${orgId}:${monthKey}`;
    const queryResponse = await fetch(
      `${env.UPSTASH_REDIS_URL}/get/${queryKey}`,
      {
        headers: {
          Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}`,
        },
      }
    );

    let queries = 0;
    if (queryResponse.ok) {
      const data = (await queryResponse.json()) as { result: string | null };
      queries = parseInt(data.result ?? "0", 10);
    }

    // Get tokens from Redis
    const tokenKey = `tokens:${orgId}:${monthKey}`;
    const tokenResponse = await fetch(
      `${env.UPSTASH_REDIS_URL}/get/${tokenKey}`,
      {
        headers: {
          Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}`,
        },
      }
    );

    let tokens = 0;
    if (tokenResponse.ok) {
      const data = (await tokenResponse.json()) as { result: string | null };
      tokens = parseInt(data.result ?? "0", 10);
    }

    // TODO: Get storage from R2/database
    const storageBytes = 0;

    return {
      queries,
      tokens,
      storageBytes,
    };
  } catch (error) {
    console.error("Failed to get usage stats:", error);
    return {
      queries: 0,
      tokens: 0,
      storageBytes: 0,
    };
  }
}

/**
 * Record a usage event
 */
export async function recordUsage(
  env: Env,
  orgId: string,
  event: {
    type: "query" | "index" | "sync";
    tokens?: number;
    projectId?: string;
    apiKeyId?: string;
  }
): Promise<void> {
  const monthKey = new Date().toISOString().slice(0, 7);

  try {
    // Increment query count
    const queryKey = `usage:${orgId}:${monthKey}`;
    await fetch(`${env.UPSTASH_REDIS_URL}/incr/${queryKey}`, {
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}`,
      },
    });

    // Set expiry (35 days)
    await fetch(`${env.UPSTASH_REDIS_URL}/expire/${queryKey}/3024000`, {
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}`,
      },
    });

    // Increment token count if provided
    if (event.tokens) {
      const tokenKey = `tokens:${orgId}:${monthKey}`;
      await fetch(
        `${env.UPSTASH_REDIS_URL}/incrby/${tokenKey}/${event.tokens}`,
        {
          headers: {
            Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}`,
          },
        }
      );

      await fetch(`${env.UPSTASH_REDIS_URL}/expire/${tokenKey}/3024000`, {
        headers: {
          Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}`,
        },
      });
    }

    // TODO: Also write to PostgreSQL for detailed analytics
  } catch (error) {
    console.error("Failed to record usage:", error);
  }
}


// Alias for dashboard routes
export async function getUsageByOrgId(env: Env, orgId: string) {
  const stats = await getUsageStats(env, orgId);
  return {
    queries: stats.queries,
    storage: stats.storageBytes,
    tokens: stats.tokens,
  };
}
