/**
 * Authentication middleware
 *
 * Validates API keys and sets org context
 */

import { createMiddleware } from "hono/factory";
import { nanoid } from "nanoid";

import { getApiKeyByPrefix, updateApiKeyLastUsed } from "../db/api-keys";
import { getOrganization } from "../db/organizations";
import { UnauthorizedError } from "../types";
import type { Env, Variables } from "../types";

/**
 * API key format: ck_live_xxxxxxxxxxxxxxxxxxxxx (32 random chars after prefix)
 * - ck_live_ = production key
 * - ck_test_ = test/development key
 */
const API_KEY_REGEX = /^ck_(live|test)_[a-zA-Z0-9]{32}$/;

/**
 * Hash an API key using SHA-256
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extract API key from Authorization header
 */
function extractApiKey(header: string | undefined): string | null {
  if (!header) return null;

  // Support both "Bearer xxx" and just "xxx"
  const key = header.startsWith("Bearer ") ? header.slice(7) : header;

  if (!API_KEY_REGEX.test(key)) return null;

  return key;
}

/**
 * Authentication middleware
 */
export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  // Generate request ID for tracing
  const requestId = nanoid(12);
  c.set("requestId", requestId);

  // Extract API key
  const authHeader = c.req.header("Authorization");
  const apiKey = extractApiKey(authHeader);

  if (!apiKey) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  // Get key prefix for lookup (first 8 chars after ck_)
  const keyPrefix = apiKey.slice(3, 11); // e.g., "live_xxx"

  // Look up key by prefix
  const keyRecord = await getApiKeyByPrefix(c.env, keyPrefix);

  if (!keyRecord) {
    throw new UnauthorizedError("Invalid API key");
  }

  // Verify full key hash
  const keyHash = await hashApiKey(apiKey);
  if (keyHash !== keyRecord.keyHash) {
    throw new UnauthorizedError("Invalid API key");
  }

  // Check expiration
  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
    throw new UnauthorizedError("API key has expired");
  }

  // Get organization
  const org = await getOrganization(c.env, keyRecord.orgId);

  if (!org) {
    throw new UnauthorizedError("Organization not found");
  }

  // Set context variables
  c.set("orgId", org.id);
  c.set("apiKeyId", keyRecord.id);
  c.set("plan", org.plan);

  // Update last used timestamp (async, don't wait)
  c.executionCtx.waitUntil(updateApiKeyLastUsed(c.env, keyRecord.id));

  await next();
});

/**
 * Generate a new API key
 */
export function generateApiKey(environment: "live" | "test" = "live"): {
  key: string;
  prefix: string;
} {
  const random = nanoid(32);
  const key = `ck_${environment}_${random}`;
  const prefix = `${environment}_${random.slice(0, 4)}`;

  return { key, prefix };
}

/**
 * Hash API key for storage
 */
export { hashApiKey };
