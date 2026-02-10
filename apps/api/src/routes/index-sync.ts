/**
 * Index sync routes
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import { getProject, getProjectBySlug } from "../db/projects";
import { NotFoundError, BadRequestError } from "../types";
import type { Env, Variables } from "../types";

const syncRequestSchema = z.object({
  project_id: z.string().min(1),
  files: z.array(
    z.object({
      path: z.string().min(1),
      content: z.string(),
    })
  ),
  incremental: z.boolean().default(true),
});

export const indexRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

/**
 * POST /index/sync
 * Upload and index codebase
 */
indexRoutes.post(
  "/sync",
  zValidator("json", syncRequestSchema),
  async (c) => {
    const orgId = c.get("orgId");
    const body = c.req.valid("json");

    // Resolve project
    let project = await getProject(c.env, orgId, body.project_id);

    if (!project) {
      project = await getProjectBySlug(c.env, orgId, body.project_id);
    }

    if (!project) {
      throw new NotFoundError("Project");
    }

    // Validate file count
    if (body.files.length === 0) {
      throw new BadRequestError("No files provided");
    }

    if (body.files.length > 10000) {
      throw new BadRequestError("Too many files (max 10,000)");
    }

    // Calculate total size
    const totalSize = body.files.reduce((sum, f) => sum + f.content.length, 0);
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (totalSize > maxSize) {
      throw new BadRequestError(
        `Total file size (${Math.round(totalSize / 1024 / 1024)}MB) exceeds limit (100MB)`
      );
    }

    // TODO: Queue indexing job
    // For now, we'll do synchronous indexing (not ideal for large codebases)
    const jobId = crypto.randomUUID();

    // In production, this would queue to a Durable Object or external queue
    // For MVP, we'll return a job ID and process inline

    return c.json(
      {
        job_id: jobId,
        status: "pending",
        progress: {
          files_total: body.files.length,
          files_processed: 0,
          chunks_created: 0,
        },
        created_at: new Date().toISOString(),
      },
      202
    );
  }
);

/**
 * GET /index/status/:job_id
 * Get indexing job status
 */
indexRoutes.get("/status/:job_id", async (c) => {
  const jobId = c.req.param("job_id");

  // TODO: Look up job status from Durable Object or database
  // For now, return mock completed status

  return c.json({
    job_id: jobId,
    status: "completed",
    progress: {
      files_total: 0,
      files_processed: 0,
      chunks_created: 0,
    },
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });
});
