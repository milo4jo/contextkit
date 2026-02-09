/**
 * Project management routes
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import {
  getProject,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  generateSlug,
  isSlugUnique,
} from "../db/projects";
import { NotFoundError, ConflictError, ForbiddenError, PLAN_LIMITS } from "../types";
import type { Env, Variables } from "../types";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(500).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const projectRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

/**
 * GET /projects
 * List all projects
 */
projectRoutes.get("/", async (c) => {
  const orgId = c.get("orgId");
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20"), 100);
  const offset = parseInt(c.req.query("offset") ?? "0");

  const { projects, total } = await listProjects(c.env, orgId, {
    limit,
    offset,
  });

  return c.json({
    projects: projects.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    })),
    total,
    limit,
    offset,
  });
});

/**
 * POST /projects
 * Create a new project
 */
projectRoutes.post(
  "/",
  zValidator("json", createProjectSchema),
  async (c) => {
    const orgId = c.get("orgId");
    const plan = c.get("plan");
    const body = c.req.valid("json");

    // Check project limit
    const limits = PLAN_LIMITS[plan];
    if (limits.projectsLimit !== null) {
      const { total } = await listProjects(c.env, orgId, { limit: 1 });
      if (total >= limits.projectsLimit) {
        throw new ForbiddenError(
          `Project limit reached (${total}/${limits.projectsLimit}). Upgrade your plan to create more projects.`
        );
      }
    }

    // Generate slug if not provided
    const slug = body.slug ?? generateSlug(body.name);

    // Check slug uniqueness
    const unique = await isSlugUnique(c.env, orgId, slug);
    if (!unique) {
      throw new ConflictError(`Project with slug "${slug}" already exists`);
    }

    const project = await createProject(c.env, {
      orgId,
      name: body.name,
      slug,
      description: body.description,
    });

    return c.json(
      {
        id: project.id,
        slug: project.slug,
        name: project.name,
        description: project.description,
        index_status: {
          files: 0,
          chunks: 0,
          last_indexed: null,
        },
        created_at: project.createdAt.toISOString(),
        updated_at: project.updatedAt.toISOString(),
      },
      201
    );
  }
);

/**
 * GET /projects/:project_id
 * Get project details
 */
projectRoutes.get("/:project_id", async (c) => {
  const orgId = c.get("orgId");
  const projectId = c.req.param("project_id");

  const project = await getProject(c.env, orgId, projectId);

  if (!project) {
    throw new NotFoundError("Project");
  }

  return c.json({
    id: project.id,
    slug: project.slug,
    name: project.name,
    description: project.description,
    settings: project.settings,
    index_status: project.indexStatus
      ? {
          files: project.indexStatus.files,
          chunks: project.indexStatus.chunks,
          last_indexed: project.indexStatus.lastIndexed?.toISOString() ?? null,
        }
      : null,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
  });
});

/**
 * PATCH /projects/:project_id
 * Update project
 */
projectRoutes.patch(
  "/:project_id",
  zValidator("json", updateProjectSchema),
  async (c) => {
    const orgId = c.get("orgId");
    const projectId = c.req.param("project_id");
    const body = c.req.valid("json");

    const project = await updateProject(c.env, orgId, projectId, body);

    if (!project) {
      throw new NotFoundError("Project");
    }

    return c.json({
      id: project.id,
      slug: project.slug,
      name: project.name,
      description: project.description,
      settings: project.settings,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
    });
  }
);

/**
 * DELETE /projects/:project_id
 * Delete project
 */
projectRoutes.delete("/:project_id", async (c) => {
  const orgId = c.get("orgId");
  const projectId = c.req.param("project_id");

  const deleted = await deleteProject(c.env, orgId, projectId);

  if (!deleted) {
    throw new NotFoundError("Project");
  }

  return c.body(null, 204);
});
