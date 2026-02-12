/**
 * Call graph routes
 */

import { Hono } from 'hono';

import { getProject, getProjectBySlug } from '../db/projects';
import { getCallGraph } from '../services/graph-service';
import { NotFoundError, BadRequestError } from '../types';
import type { Env, Variables } from '../types';

export const graphRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

/**
 * GET /graph/calls
 * Get call graph for a symbol
 */
graphRoutes.get('/calls', async (c) => {
  const orgId = c.get('orgId');
  const projectId = c.req.query('project_id');
  const symbol = c.req.query('symbol');

  if (!projectId) {
    throw new BadRequestError('project_id is required');
  }

  if (!symbol) {
    throw new BadRequestError('symbol is required');
  }

  // Resolve project
  let project = await getProject(c.env, orgId, projectId);

  if (!project) {
    project = await getProjectBySlug(c.env, orgId, projectId);
  }

  if (!project) {
    throw new NotFoundError('Project');
  }

  const graph = await getCallGraph(c.env, {
    orgId,
    projectId: project.id,
    symbol,
  });

  return c.json(graph);
});
