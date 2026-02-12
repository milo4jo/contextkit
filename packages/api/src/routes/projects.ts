/**
 * Projects Routes
 *
 * CRUD for user projects (indexed codebases)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../index';
import { getDb } from '../db/client';
import { authMiddleware } from '../middleware/auth';

export const projectRoutes = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

// All project routes require auth
projectRoutes.use('*', authMiddleware);

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
});

/**
 * List user's projects
 */
projectRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const result = await db.execute({
    sql: `
      SELECT p.*, 
             (SELECT COUNT(*) FROM snapshots WHERE project_id = p.id) as snapshot_count,
             (SELECT MAX(created_at) FROM snapshots WHERE project_id = p.id) as last_synced
      FROM projects p
      WHERE p.user_id = ?
      ORDER BY p.updated_at DESC
    `,
    args: [userId],
  });

  return c.json({ projects: result.rows });
});

/**
 * Create a new project
 */
projectRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
  }

  const { name, slug, description } = parsed.data;
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  // Check slug uniqueness for this user
  const existing = await db.execute({
    sql: 'SELECT id FROM projects WHERE user_id = ? AND slug = ?',
    args: [userId, slug],
  });

  if (existing.rows.length > 0) {
    return c.json({ error: 'Project with this slug already exists' }, 409);
  }

  // Check plan limits
  const projectCount = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM projects WHERE user_id = ?',
    args: [userId],
  });

  const count = (projectCount.rows[0]?.count as number) || 0;

  // TODO: Get actual plan limit from user
  const limit = 5; // Default Pro limit
  if (count >= limit) {
    return c.json({ error: 'Project limit reached. Upgrade to create more.' }, 403);
  }

  const id = crypto.randomUUID();

  await db.execute({
    sql: `
      INSERT INTO projects (id, user_id, name, slug, description)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [id, userId, name, slug, description || null],
  });

  return c.json(
    {
      project: { id, user_id: userId, name, slug, description },
    },
    201
  );
});

/**
 * Get a specific project
 */
projectRoutes.get('/:slug', async (c) => {
  const userId = c.get('userId');
  const slug = c.req.param('slug');
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const result = await db.execute({
    sql: `
      SELECT p.*, 
             (SELECT COUNT(*) FROM snapshots WHERE project_id = p.id) as snapshot_count
      FROM projects p
      WHERE p.user_id = ? AND p.slug = ?
    `,
    args: [userId, slug],
  });

  if (result.rows.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  return c.json({ project: result.rows[0] });
});

/**
 * Update a project
 */
projectRoutes.patch('/:slug', async (c) => {
  const userId = c.get('userId');
  const slug = c.req.param('slug');
  const body = await c.req.json();
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  // Build update query dynamically
  const updates: string[] = [];
  const args: (string | null)[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    args.push(body.name);
  }
  if (body.description !== undefined) {
    updates.push('description = ?');
    args.push(body.description);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  updates.push('updated_at = unixepoch()');
  args.push(userId, slug);

  await db.execute({
    sql: `
      UPDATE projects 
      SET ${updates.join(', ')}
      WHERE user_id = ? AND slug = ?
    `,
    args,
  });

  return c.json({ success: true });
});

/**
 * Delete a project
 */
projectRoutes.delete('/:slug', async (c) => {
  const userId = c.get('userId');
  const slug = c.req.param('slug');
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  // Get project ID first
  const project = await db.execute({
    sql: 'SELECT id FROM projects WHERE user_id = ? AND slug = ?',
    args: [userId, slug],
  });

  if (project.rows.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const projectId = project.rows[0].id;

  // Delete snapshots first (foreign key)
  await db.execute({
    sql: 'DELETE FROM snapshots WHERE project_id = ?',
    args: [projectId],
  });

  // Delete project
  await db.execute({
    sql: 'DELETE FROM projects WHERE id = ?',
    args: [projectId],
  });

  // TODO: Delete R2 objects

  return c.json({ success: true });
});
