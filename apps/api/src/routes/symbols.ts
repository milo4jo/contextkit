/**
 * Symbol search routes
 */

import { Hono } from "hono";

import { getProject, getProjectBySlug } from "../db/projects";
import { searchSymbols } from "../services/symbol-service";
import { NotFoundError, BadRequestError } from "../types";
import type { Env, Variables } from "../types";

export const symbolRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

/**
 * GET /symbols/search
 * Search for symbols by name
 */
symbolRoutes.get("/search", async (c) => {
  const orgId = c.get("orgId");
  const projectId = c.req.query("project_id");
  const query = c.req.query("query");
  const exact = c.req.query("exact") === "true";
  const limit = Math.min(parseInt(c.req.query("limit") ?? "10"), 50);

  if (!projectId) {
    throw new BadRequestError("project_id is required");
  }

  if (!query) {
    throw new BadRequestError("query is required");
  }

  // Resolve project
  let project = await getProject(c.env, orgId, projectId);

  if (!project) {
    project = await getProjectBySlug(c.env, orgId, projectId);
  }

  if (!project) {
    throw new NotFoundError("Project");
  }

  const symbols = await searchSymbols(c.env, {
    orgId,
    projectId: project.id,
    query,
    exact,
    limit,
  });

  return c.json({ symbols });
});
