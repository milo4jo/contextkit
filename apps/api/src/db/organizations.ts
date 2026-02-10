/**
 * Organization database operations
 */

import { eq } from "drizzle-orm";
import { getDb, organizations, users, orgMembers } from "./index";
import type { Env, Organization, Plan } from "../types";

// User type
interface User {
  id: string;
  clerkId: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

/**
 * Get or create user by Clerk ID
 */
export async function getOrCreateUserByClerkId(
  env: Env,
  clerkId: string,
  email?: string
): Promise<User> {
  const db = getDb(env);

  // Try to find existing user
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (existing.length > 0) {
    return {
      id: existing[0].id,
      clerkId: existing[0].clerkId,
      email: existing[0].email,
      name: existing[0].name,
      avatarUrl: existing[0].avatarUrl,
      createdAt: existing[0].createdAt!,
    };
  }

  // Create new user
  const results = await db
    .insert(users)
    .values({
      clerkId,
      email: email || `${clerkId}@contextkit.local`,
      name: null,
      avatarUrl: null,
    })
    .returning();

  return {
    id: results[0].id,
    clerkId: results[0].clerkId,
    email: results[0].email,
    name: results[0].name,
    avatarUrl: results[0].avatarUrl,
    createdAt: results[0].createdAt!,
  };
}

/**
 * Get organization by user ID (via membership)
 */
export async function getOrganizationByUserId(
  env: Env,
  userId: string
): Promise<Organization | null> {
  const db = getDb(env);

  // Find user's organization membership
  const memberships = await db
    .select({
      orgId: orgMembers.orgId,
    })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);

  if (memberships.length === 0) return null;

  return getOrganization(env, memberships[0].orgId);
}

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
 * Create a new organization with owner membership
 */
export async function createOrganization(
  env: Env,
  data: {
    name: string;
    slug: string;
    plan?: Plan;
    ownerId: string;
  }
): Promise<Organization> {
  const db = getDb(env);

  // Create organization
  const results = await db
    .insert(organizations)
    .values({
      name: data.name,
      slug: data.slug,
      plan: data.plan ?? "free",
    })
    .returning();

  const org = results[0];

  // Add owner as member
  await db.insert(orgMembers).values({
    orgId: org.id,
    userId: data.ownerId,
    role: "owner",
  });

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan as Plan,
    stripeCustomerId: org.stripeCustomerId,
    createdAt: org.createdAt!,
    updatedAt: org.updatedAt!,
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
