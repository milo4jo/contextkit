/**
 * Organization database operations
 */

import { eq } from "drizzle-orm";
import { getDb, organizations } from "./index";
import type { Env, Organization, Plan } from "../types";

/**
 * Get organization by ID
 */
export async function getOrganization(
  env: Env,
  id: string
): Promise<Organization | null> {
  const db = getDb(env);

  const results = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  if (results.length === 0) return null;

  return {
    id: results[0].id,
    name: results[0].name,
    slug: results[0].slug,
    plan: results[0].plan as Plan,
    stripeCustomerId: results[0].stripeCustomerId,
    createdAt: results[0].createdAt!,
    updatedAt: results[0].updatedAt!,
  };
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(
  env: Env,
  slug: string
): Promise<Organization | null> {
  const db = getDb(env);

  const results = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (results.length === 0) return null;

  return {
    id: results[0].id,
    name: results[0].name,
    slug: results[0].slug,
    plan: results[0].plan as Plan,
    stripeCustomerId: results[0].stripeCustomerId,
    createdAt: results[0].createdAt!,
    updatedAt: results[0].updatedAt!,
  };
}

/**
 * Create a new organization
 */
export async function createOrganization(
  env: Env,
  data: {
    name: string;
    slug: string;
    plan?: Plan;
  }
): Promise<Organization> {
  const db = getDb(env);

  const results = await db
    .insert(organizations)
    .values({
      name: data.name,
      slug: data.slug,
      plan: data.plan ?? "free",
    })
    .returning();

  return {
    id: results[0].id,
    name: results[0].name,
    slug: results[0].slug,
    plan: results[0].plan as Plan,
    stripeCustomerId: results[0].stripeCustomerId,
    createdAt: results[0].createdAt!,
    updatedAt: results[0].updatedAt!,
  };
}

/**
 * Update organization
 */
export async function updateOrganization(
  env: Env,
  id: string,
  data: {
    name?: string;
    plan?: Plan;
    stripeCustomerId?: string;
  }
): Promise<Organization | null> {
  const db = getDb(env);

  const results = await db
    .update(organizations)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, id))
    .returning();

  if (results.length === 0) return null;

  return {
    id: results[0].id,
    name: results[0].name,
    slug: results[0].slug,
    plan: results[0].plan as Plan,
    stripeCustomerId: results[0].stripeCustomerId,
    createdAt: results[0].createdAt!,
    updatedAt: results[0].updatedAt!,
  };
}
