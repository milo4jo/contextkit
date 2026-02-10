/**
 * Dashboard API Routes
 *
 * Routes for the ContextKit dashboard (authenticated via Clerk)
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import type { Env, Variables } from "../types";
import {
  getOrCreateUserByClerkId,
  getOrganizationByUserId,
  createOrganization,
} from "../db/organizations";
import {
  getProjectsByOrgId,
  createProject,
  getProjectBySlug,
  deleteProject,
} from "../db/projects";
import {
  getApiKeysByOrgId,
  createApiKey,
  deleteApiKey,
} from "../db/api-keys";
import { getUsageByOrgId } from "../services/usage-service";
import { generateApiKey, hashApiKey } from "../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// === User / Organization ===

/**
 * GET /me - Get current user and organization
 * Auto-creates user and org on first login
 */
app.get("/me", async (c) => {
  const clerkUserId = c.get("clerkUserId")!!;
  const email = c.get("userEmail") || undefined || undefined;

  // Get or create user
  const user = await getOrCreateUserByClerkId(c.env, clerkUserId, email);

  // Get or create organization
  let org = await getOrganizationByUserId(c.env, user.id);

  if (!org) {
    // Create personal organization for new users
    // Use more of clerkUserId + timestamp for uniqueness
    const uniqueSuffix = `${clerkUserId.slice(-8)}-${Date.now().toString(36)}`;
    org = await createOrganization(c.env, {
      name: user.name || email?.split("@")[0] || "My Organization",
      slug: `org-${uniqueSuffix}`,
      ownerId: user.id,
    });
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
    },
  });
});

// === Projects ===

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

/**
 * GET /projects - List all projects
 */
app.get("/projects", async (c) => {
  const clerkUserId = c.get("clerkUserId")!;
  const user = await getOrCreateUserByClerkId(c.env, clerkUserId);
  const org = await getOrganizationByUserId(c.env, user.id);

  if (!org) {
    return c.json({ projects: [] });
  }

  const projects = await getProjectsByOrgId(c.env, org.id);

  return c.json({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      indexStatus: (p.settings as Record<string, unknown>)?.indexStatus || {
        files: 0,
        chunks: 0,
        lastIndexed: null,
        status: "pending",
      },
    })),
  });
});

/**
 * POST /projects - Create a project
 */
app.post("/projects", zValidator("json", createProjectSchema), async (c) => {
  const { name, description } = c.req.valid("json");
  const clerkUserId = c.get("clerkUserId")!;
  const email = c.get("userEmail") || undefined;

  const user = await getOrCreateUserByClerkId(c.env, clerkUserId, email);
  let org = await getOrganizationByUserId(c.env, user.id);

  if (!org) {
    const uniqueSuffix = `${clerkUserId.slice(-8)}-${Date.now().toString(36)}`;
    org = await createOrganization(c.env, {
      name: user.name || email?.split("@")[0] || "My Organization",
      slug: `org-${uniqueSuffix}`,
      ownerId: user.id,
    });
  }

  // Check project limit based on plan
  const existingProjects = await getProjectsByOrgId(c.env, org.id);
  const limits = { free: 1, pro: 5, team: 50, enterprise: 1000 };
  const limit = limits[org.plan as keyof typeof limits] || 1;

  if (existingProjects.length >= limit) {
    return c.json(
      { error: `Project limit reached (${limit} on ${org.plan} plan)` },
      403
    );
  }

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const project = await createProject(c.env, {
    orgId: org.id,
    name,
    slug,
    description,
  });

  return c.json({ project }, 201);
});

/**
 * GET /projects/:slug - Get project details
 */
app.get("/projects/:slug", async (c) => {
  const { slug } = c.req.param();
  const clerkUserId = c.get("clerkUserId")!;

  const user = await getOrCreateUserByClerkId(c.env, clerkUserId);
  const org = await getOrganizationByUserId(c.env, user.id);

  if (!org) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const project = await getProjectBySlug(c.env, org.id, slug);

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  return c.json({ project });
});

/**
 * DELETE /projects/:slug - Delete a project
 */
app.delete("/projects/:slug", async (c) => {
  const { slug } = c.req.param();
  const clerkUserId = c.get("clerkUserId")!;

  const user = await getOrCreateUserByClerkId(c.env, clerkUserId);
  const org = await getOrganizationByUserId(c.env, user.id);

  if (!org) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const project = await getProjectBySlug(c.env, org.id, slug);

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  await deleteProject(c.env, project.id);

  return c.json({ success: true });
});

// === API Keys ===

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
});

/**
 * GET /api-keys - List API keys (only prefixes, not full keys)
 */
app.get("/api-keys", async (c) => {
  const clerkUserId = c.get("clerkUserId")!;

  const user = await getOrCreateUserByClerkId(c.env, clerkUserId);
  const org = await getOrganizationByUserId(c.env, user.id);

  if (!org) {
    return c.json({ apiKeys: [] });
  }

  const keys = await getApiKeysByOrgId(c.env, org.id);

  return c.json({
    apiKeys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.keyPrefix,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })),
  });
});

/**
 * POST /api-keys - Create a new API key
 * Returns the full key ONLY on creation
 */
app.post("/api-keys", zValidator("json", createApiKeySchema), async (c) => {
  const { name } = c.req.valid("json");
  const clerkUserId = c.get("clerkUserId")!;
  const email = c.get("userEmail") || undefined;

  const user = await getOrCreateUserByClerkId(c.env, clerkUserId, email);
  let org = await getOrganizationByUserId(c.env, user.id);

  if (!org) {
    const uniqueSuffix = `${clerkUserId.slice(-8)}-${Date.now().toString(36)}`;
    org = await createOrganization(c.env, {
      name: user.name || email?.split("@")[0] || "My Organization",
      slug: `org-${uniqueSuffix}`,
      ownerId: user.id,
    });
  }

  // Generate key
  const { key, prefix } = generateApiKey("live");
  const keyHash = await hashApiKey(key);

  const apiKey = await createApiKey(c.env, {
    orgId: org.id,
    name,
    keyHash,
    keyPrefix: prefix,
  });

  // Return full key only on creation
  return c.json(
    {
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key, // Full key - only shown once!
        prefix: apiKey.keyPrefix,
        createdAt: apiKey.createdAt,
      },
    },
    201
  );
});

/**
 * DELETE /api-keys/:id - Revoke an API key
 */
app.delete("/api-keys/:id", async (c) => {
  const { id } = c.req.param();
  const clerkUserId = c.get("clerkUserId")!;

  const user = await getOrCreateUserByClerkId(c.env, clerkUserId);
  const org = await getOrganizationByUserId(c.env, user.id);

  if (!org) {
    return c.json({ error: "Organization not found" }, 404);
  }

  await deleteApiKey(c.env, id, org.id);

  return c.json({ success: true });
});

// === Usage ===

/**
 * GET /usage - Get usage statistics
 */
app.get("/usage", async (c) => {
  const clerkUserId = c.get("clerkUserId")!;

  const user = await getOrCreateUserByClerkId(c.env, clerkUserId);
  const org = await getOrganizationByUserId(c.env, user.id);

  if (!org) {
    return c.json({
      usage: {
        queries: { used: 0, limit: 1000 },
        storage: { used: 0, limit: 100 * 1024 * 1024 },
        tokens: { used: 0 },
      },
      plan: "free",
    });
  }

  const usage = await getUsageByOrgId(c.env, org.id);

  // Plan limits
  const limits = {
    free: { queries: 1000, storage: 100 * 1024 * 1024 },
    pro: { queries: 50000, storage: 1024 * 1024 * 1024 },
    team: { queries: -1, storage: 10 * 1024 * 1024 * 1024 }, // -1 = unlimited
    enterprise: { queries: -1, storage: -1 },
  };

  const planLimits = limits[org.plan as keyof typeof limits] || limits.free;

  return c.json({
    usage: {
      queries: {
        used: usage.queries,
        limit: planLimits.queries,
      },
      storage: {
        used: usage.storage,
        limit: planLimits.storage,
      },
      tokens: {
        used: usage.tokens,
      },
    },
    plan: org.plan,
  });
});

export { app as dashboardRoutes };
