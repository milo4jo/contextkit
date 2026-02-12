/**
 * Database connection and utilities
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';
import type { Env } from '../types';

export type Database = ReturnType<typeof createDb>;

/**
 * Create database connection
 */
export function createDb(env: Env) {
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}

/**
 * Get database instance for a request
 * Uses a WeakMap to cache connections per request
 */
const dbCache = new WeakMap<Env, Database>();

export function getDb(env: Env): Database {
  let db = dbCache.get(env);
  if (!db) {
    db = createDb(env);
    dbCache.set(env, db);
  }
  return db;
}

// Re-export schema
export * from './schema';
