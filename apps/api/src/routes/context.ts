/**
 * Context selection routes
 *
 * POST /v1/context/select - Select relevant context for a query
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

import { getProject, getProjectBySlug } from '../db/projects';
import { selectContext } from '../services/context-service';
import { incrementUsage, checkMonthlyLimit } from '../middleware/rate-limit';
import { BadRequestError, NotFoundError, ForbiddenError } from '../types';
import type { Env, Variables } from '../types';

const selectRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  project_id: z.string().min(1),
  budget: z.number().int().min(500).max(100000).default(8000),
  include_imports: z.boolean().default(false),
  mode: z.enum(['full', 'map']).default('full'),
  format: z.enum(['markdown', 'xml', 'json', 'plain']).default('markdown'),
  sources: z.array(z.string()).optional(),
});

export const contextRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

/**
 * POST /context/select
 * Select relevant context for a query
 */
contextRoutes.post('/select', zValidator('json', selectRequestSchema), async (c) => {
  const startTime = Date.now();
  const body = c.req.valid('json');
  const orgId = c.get('orgId');
  const plan = c.get('plan');

  // Check monthly limit
  const monthlyCheck = await checkMonthlyLimit(c.env, orgId, plan);
  if (!monthlyCheck.allowed) {
    throw new ForbiddenError(
      `Monthly query limit reached (${monthlyCheck.used}/${monthlyCheck.limit}). Upgrade your plan for more queries.`
    );
  }

  // Resolve project (ID or slug)
  let project = await getProject(c.env, orgId, body.project_id);

  if (!project) {
    // Try by slug
    project = await getProjectBySlug(c.env, orgId, body.project_id);
  }

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if project has any indexed content
  if (!project.indexStatus || project.indexStatus.chunks === 0) {
    throw new BadRequestError(
      'Project has no indexed content. Run `contextkit index` or use the /index/sync endpoint first.'
    );
  }

  // Perform context selection
  const result = await selectContext(c.env, {
    orgId,
    projectId: project.id,
    query: body.query,
    budget: body.budget,
    includeImports: body.include_imports,
    mode: body.mode,
    format: body.format,
    sources: body.sources,
  });

  // Track usage (async)
  const processingTime = Date.now() - startTime;
  c.executionCtx.waitUntil(incrementUsage(c.env, orgId, 1));

  return c.json({
    context: result.context,
    chunks: result.chunks,
    metadata: {
      tokens_used: result.tokensUsed,
      files_included: result.filesIncluded,
      processing_time_ms: processingTime,
      cache_hit: result.cacheHit,
    },
  });
});
