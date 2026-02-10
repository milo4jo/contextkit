/**
 * API key database operations
 */

import { eq } from "drizzle-orm";
import { getDb, apiKeys } from "./index";
import type { Env, ApiKey } from "../types";

/**
 * Get API key by prefix (for auth lookup)
 */
export async function getApiKeyByPrefix(
  env: Env,
  prefix: string
): Promise<ApiKey | null> {
  const db = getDb(env);

  const results = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyPrefix, prefix))
    .limit(1);

  if (results.length === 0) return null;

  return {
    id: results[0].id,
    orgId: results[0].orgId,
    name: results[0].name,
    keyHash: results[0].keyHash,
    keyPrefix: results[0].keyPrefix,
    scopes: results[0].scopes as string[],
    projectIds: results[0].projectIds as string[],
    lastUsedAt: results[0].lastUsedAt,
    expiresAt: results[0].expiresAt,
    createdAt: results[0].createdAt!,
  };
}

/**
 * Get API key by ID
 */
export async function getApiKey(
  env: Env,
  id: string
): Promise<ApiKey | null> {
  const db = getDb(env);

  const results = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, id))
    .limit(1);

  if (results.length === 0) return null;

  return {
    id: results[0].id,
    orgId: results[0].orgId,
    name: results[0].name,
    keyHash: results[0].keyHash,
    keyPrefix: results[0].keyPrefix,
    scopes: results[0].scopes as string[],
    projectIds: results[0].projectIds as string[],
    lastUsedAt: results[0].lastUsedAt,
    expiresAt: results[0].expiresAt,
    createdAt: results[0].createdAt!,
  };
}

/**
 * List API keys for an organization
 */
export async function listApiKeys(
  env: Env,
  orgId: string
): Promise<Omit<ApiKey, "keyHash">[]> {
  const db = getDb(env);

  const results = await db
    .select({
      id: apiKeys.id,
      orgId: apiKeys.orgId,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      projectIds: apiKeys.projectIds,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.orgId, orgId));

  return results.map((row) => ({
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    scopes: row.scopes as string[],
    projectIds: row.projectIds as string[],
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt!,
  }));
}

/**
 * Get API keys by organization ID (alias for dashboard)
 */
export const getApiKeysByOrgId = listApiKeys;

/**
 * Create a new API key
 */
export async function createApiKey(
  env: Env,
  data: {
    orgId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    scopes?: string[];
    projectIds?: string[];
    expiresAt?: Date;
  }
): Promise<ApiKey> {
  const db = getDb(env);

  const results = await db
    .insert(apiKeys)
    .values({
      orgId: data.orgId,
      name: data.name,
      keyHash: data.keyHash,
      keyPrefix: data.keyPrefix,
      scopes: data.scopes ?? [],
      projectIds: data.projectIds ?? [],
      expiresAt: data.expiresAt,
    })
    .returning();

  return {
    id: results[0].id,
    orgId: results[0].orgId,
    name: results[0].name,
    keyHash: results[0].keyHash,
    keyPrefix: results[0].keyPrefix,
    scopes: results[0].scopes as string[],
    projectIds: results[0].projectIds as string[],
    lastUsedAt: results[0].lastUsedAt,
    expiresAt: results[0].expiresAt,
    createdAt: results[0].createdAt!,
  };
}

/**
 * Update API key last used timestamp
 */
export async function updateApiKeyLastUsed(
  env: Env,
  id: string
): Promise<void> {
  const db = getDb(env);

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id));
}

/**
 * Delete API key (with org validation)
 */
export async function deleteApiKey(
  env: Env,
  id: string,
  orgId?: string
): Promise<boolean> {
  const db = getDb(env);

  if (orgId) {
    const { and } = await import("drizzle-orm");
    const result = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.orgId, orgId)))
      .returning({ id: apiKeys.id });
    return result.length > 0;
  }

  const result = await db
    .delete(apiKeys)
    .where(eq(apiKeys.id, id))
    .returning({ id: apiKeys.id });

  return result.length > 0;
}
