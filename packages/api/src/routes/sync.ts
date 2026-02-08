/**
 * Sync Routes
 * 
 * Upload and download index snapshots
 */

import { Hono } from 'hono';
import type { Env } from '../index';
import { getDb } from '../db/client';
import { authMiddleware } from '../middleware/auth';

export const syncRoutes = new Hono<{ 
  Bindings: Env;
  Variables: { userId: string };
}>();

syncRoutes.use('*', authMiddleware);

/**
 * Upload index snapshot
 * 
 * 1. Client sends manifest with chunk checksums
 * 2. Server returns which chunks are missing
 * 3. Client uploads missing chunks
 * 4. Server creates snapshot record
 */
syncRoutes.post('/:slug/upload', async (c) => {
  const userId = c.get('userId');
  const slug = c.req.param('slug');
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  // Get project
  const project = await db.execute({
    sql: 'SELECT id FROM projects WHERE user_id = ? AND slug = ?',
    args: [userId, slug],
  });

  if (project.rows.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const projectId = project.rows[0].id as string;
  const body = await c.req.json();

  // Validate manifest
  const { chunks, metadata } = body;
  if (!chunks || !Array.isArray(chunks)) {
    return c.json({ error: 'Invalid manifest: chunks required' }, 400);
  }

  // Check which chunks already exist in R2
  const missingChunks: string[] = [];
  
  for (const chunk of chunks) {
    const key = `${projectId}/${chunk.checksum}`;
    const existing = await c.env.STORAGE.head(key);
    if (!existing) {
      missingChunks.push(chunk.checksum);
    }
  }

  // Generate presigned URLs for missing chunks
  // (In production, use signed URLs. For now, direct upload)
  
  return c.json({
    projectId,
    missingChunks,
    uploadUrl: `/sync/${slug}/chunk`,
  });
});

/**
 * Upload a single chunk
 */
syncRoutes.put('/:slug/chunk/:checksum', async (c) => {
  const userId = c.get('userId');
  const slug = c.req.param('slug');
  const checksum = c.req.param('checksum');
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  // Verify project ownership
  const project = await db.execute({
    sql: 'SELECT id FROM projects WHERE user_id = ? AND slug = ?',
    args: [userId, slug],
  });

  if (project.rows.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const projectId = project.rows[0].id as string;
  const body = await c.req.arrayBuffer();

  // Store chunk in R2
  const key = `${projectId}/${checksum}`;
  await c.env.STORAGE.put(key, body, {
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      userId,
    },
  });

  return c.json({ success: true, key });
});

/**
 * Finalize upload - create snapshot record
 */
syncRoutes.post('/:slug/finalize', async (c) => {
  const userId = c.get('userId');
  const slug = c.req.param('slug');
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const project = await db.execute({
    sql: 'SELECT id FROM projects WHERE user_id = ? AND slug = ?',
    args: [userId, slug],
  });

  if (project.rows.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const projectId = project.rows[0].id as string;
  const { manifest, metadata } = await c.req.json();

  // Get next version number
  const lastVersion = await db.execute({
    sql: 'SELECT MAX(version) as version FROM snapshots WHERE project_id = ?',
    args: [projectId],
  });
  
  const version = ((lastVersion.rows[0]?.version as number) || 0) + 1;
  const snapshotId = crypto.randomUUID();

  // Store manifest in R2
  const manifestKey = `${projectId}/manifest-v${version}.json`;
  await c.env.STORAGE.put(manifestKey, JSON.stringify(manifest), {
    customMetadata: { version: String(version) },
  });

  // Create snapshot record
  await db.execute({
    sql: `
      INSERT INTO snapshots (id, project_id, version, storage_key, size_bytes, chunk_count, file_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      snapshotId,
      projectId,
      version,
      manifestKey,
      metadata?.size_bytes || 0,
      metadata?.chunk_count || 0,
      metadata?.file_count || 0,
    ],
  });

  // Update project timestamp
  await db.execute({
    sql: 'UPDATE projects SET updated_at = unixepoch() WHERE id = ?',
    args: [projectId],
  });

  return c.json({ 
    success: true, 
    snapshot: { id: snapshotId, version } 
  });
});

/**
 * Download latest snapshot
 */
syncRoutes.get('/:slug/download', async (c) => {
  const userId = c.get('userId');
  const slug = c.req.param('slug');
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const project = await db.execute({
    sql: 'SELECT id FROM projects WHERE user_id = ? AND slug = ?',
    args: [userId, slug],
  });

  if (project.rows.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const projectId = project.rows[0].id as string;

  // Get latest snapshot
  const snapshot = await db.execute({
    sql: `
      SELECT * FROM snapshots 
      WHERE project_id = ? 
      ORDER BY version DESC 
      LIMIT 1
    `,
    args: [projectId],
  });

  if (snapshot.rows.length === 0) {
    return c.json({ error: 'No snapshots found. Run sync first.' }, 404);
  }

  const latest = snapshot.rows[0];
  
  // Get manifest from R2
  const manifestKey = latest.storage_key as string;
  const manifestObj = await c.env.STORAGE.get(manifestKey);
  
  if (!manifestObj) {
    return c.json({ error: 'Manifest not found in storage' }, 500);
  }

  const manifest = await manifestObj.json();

  return c.json({
    version: latest.version,
    manifest,
    chunkBaseUrl: `/sync/${slug}/chunk`,
  });
});

/**
 * Download a specific chunk
 */
syncRoutes.get('/:slug/chunk/:checksum', async (c) => {
  const userId = c.get('userId');
  const slug = c.req.param('slug');
  const checksum = c.req.param('checksum');
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  // Verify access
  const project = await db.execute({
    sql: 'SELECT id FROM projects WHERE user_id = ? AND slug = ?',
    args: [userId, slug],
  });

  if (project.rows.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const projectId = project.rows[0].id as string;
  const key = `${projectId}/${checksum}`;
  
  const chunk = await c.env.STORAGE.get(key);
  
  if (!chunk) {
    return c.json({ error: 'Chunk not found' }, 404);
  }

  return new Response(chunk.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

/**
 * List snapshot versions
 */
syncRoutes.get('/:slug/versions', async (c) => {
  const userId = c.get('userId');
  const slug = c.req.param('slug');
  const db = getDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const project = await db.execute({
    sql: 'SELECT id FROM projects WHERE user_id = ? AND slug = ?',
    args: [userId, slug],
  });

  if (project.rows.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const projectId = project.rows[0].id as string;

  const versions = await db.execute({
    sql: `
      SELECT version, created_at, size_bytes, chunk_count, file_count
      FROM snapshots
      WHERE project_id = ?
      ORDER BY version DESC
      LIMIT 20
    `,
    args: [projectId],
  });

  return c.json({ versions: versions.rows });
});
