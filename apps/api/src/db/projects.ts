/**
 * Project database operations
 */

import { eq, and, sql } from 'drizzle-orm';
import { getDb, projects, indexedFiles } from './index';
import type { Env, Project, ProjectSettings } from '../types';

/**
 * Get project by ID
 */
export async function getProject(
  env: Env,
  orgId: string,
  projectId: string
): Promise<
  (Project & { indexStatus?: { files: number; chunks: number; lastIndexed: Date | null } }) | null
> {
  const db = getDb(env);

  const results = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .limit(1);

  if (results.length === 0) return null;

  // Get index status
  const indexStats = await db
    .select({
      fileCount: sql<number>`count(*)`,
      chunkCount: sql<number>`coalesce(sum(${indexedFiles.chunkCount}), 0)`,
      lastIndexed: sql<Date | null>`max(${indexedFiles.indexedAt})`,
    })
    .from(indexedFiles)
    .where(eq(indexedFiles.projectId, projectId));

  return {
    id: results[0].id,
    orgId: results[0].orgId,
    name: results[0].name,
    slug: results[0].slug,
    description: results[0].description,
    settings: results[0].settings as ProjectSettings,
    createdAt: results[0].createdAt!,
    updatedAt: results[0].updatedAt!,
    indexStatus: {
      files: Number(indexStats[0]?.fileCount ?? 0),
      chunks: Number(indexStats[0]?.chunkCount ?? 0),
      lastIndexed: indexStats[0]?.lastIndexed ?? null,
    },
  };
}

/**
 * Get project by slug
 */
export async function getProjectBySlug(
  env: Env,
  orgId: string,
  slug: string
): Promise<Project | null> {
  const db = getDb(env);

  const results = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), eq(projects.orgId, orgId)))
    .limit(1);

  if (results.length === 0) return null;

  return {
    id: results[0].id,
    orgId: results[0].orgId,
    name: results[0].name,
    slug: results[0].slug,
    description: results[0].description,
    settings: results[0].settings as ProjectSettings,
    createdAt: results[0].createdAt!,
    updatedAt: results[0].updatedAt!,
  };
}

/**
 * List projects for an organization
 */
export async function listProjects(
  env: Env,
  orgId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ projects: Project[]; total: number }> {
  const db = getDb(env);
  const { limit = 20, offset = 0 } = options;

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(eq(projects.orgId, orgId))
      .limit(limit)
      .offset(offset)
      .orderBy(projects.createdAt),
    db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.orgId, orgId)),
  ]);

  return {
    projects: results.map((row) => ({
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      settings: row.settings as ProjectSettings,
      createdAt: row.createdAt!,
      updatedAt: row.updatedAt!,
    })),
    total: Number(countResult[0]?.count ?? 0),
  };
}

/**
 * Get all projects for an organization (simple list)
 */
export async function getProjectsByOrgId(env: Env, orgId: string): Promise<Project[]> {
  const db = getDb(env);

  const results = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(projects.createdAt);

  return results.map((row) => ({
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    settings: row.settings as ProjectSettings,
    createdAt: row.createdAt!,
    updatedAt: row.updatedAt!,
  }));
}

/**
 * Create a new project
 */
export async function createProject(
  env: Env,
  data: {
    orgId: string;
    name: string;
    slug: string;
    description?: string;
    settings?: ProjectSettings;
  }
): Promise<Project> {
  const db = getDb(env);

  const results = await db
    .insert(projects)
    .values({
      orgId: data.orgId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      settings: data.settings ?? {},
    })
    .returning();

  return {
    id: results[0].id,
    orgId: results[0].orgId,
    name: results[0].name,
    slug: results[0].slug,
    description: results[0].description,
    settings: results[0].settings as ProjectSettings,
    createdAt: results[0].createdAt!,
    updatedAt: results[0].updatedAt!,
  };
}

/**
 * Update project
 */
export async function updateProject(
  env: Env,
  orgId: string,
  projectId: string,
  data: {
    name?: string;
    description?: string;
    settings?: ProjectSettings;
  }
): Promise<Project | null> {
  const db = getDb(env);

  const results = await db
    .update(projects)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .returning();

  if (results.length === 0) return null;

  return {
    id: results[0].id,
    orgId: results[0].orgId,
    name: results[0].name,
    slug: results[0].slug,
    description: results[0].description,
    settings: results[0].settings as ProjectSettings,
    createdAt: results[0].createdAt!,
    updatedAt: results[0].updatedAt!,
  };
}

/**
 * Delete project by ID
 */
export async function deleteProject(env: Env, projectId: string): Promise<boolean> {
  const db = getDb(env);

  const result = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning({ id: projects.id });

  return result.length > 0;
}

/**
 * Generate a URL-safe slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Check if a project slug is unique within an organization
 */
export async function isSlugUnique(env: Env, orgId: string, slug: string): Promise<boolean> {
  const existing = await getProjectBySlug(env, orgId, slug);
  return existing === null;
}
