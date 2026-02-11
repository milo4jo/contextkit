import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { statSync } from 'fs';
import { getDbPath } from '../config/index.js';

/**
 * Database schema for ContextKit
 */
const SCHEMA = `
-- Sources table
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  config JSON,
  file_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  indexed_at TIMESTAMP
);

-- Files table (for incremental indexing)
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id, file_path)
);

-- Chunks table  
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  tokens INTEGER NOT NULL,
  embedding BLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Query cache table
CREATE TABLE IF NOT EXISTS query_cache (
  cache_key TEXT PRIMARY KEY,
  result JSON NOT NULL,
  index_version TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  hit_count INTEGER DEFAULT 0
);

-- Query history table
CREATE TABLE IF NOT EXISTS query_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  budget INTEGER NOT NULL,
  format TEXT NOT NULL,
  mode TEXT DEFAULT 'full',
  sources TEXT,
  tokens_used INTEGER,
  chunks_found INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_chunks_file ON chunks(file_path);
CREATE INDEX IF NOT EXISTS idx_files_source ON files(source_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(source_id, file_path);
CREATE INDEX IF NOT EXISTS idx_cache_created ON query_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_history_created ON query_history(created_at);
`;

/**
 * Initialize the database with schema
 */
export function initDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create schema
  db.exec(SCHEMA);

  return db;
}

/**
 * Open the existing database
 * Also runs schema migration to ensure all tables exist (for upgrades)
 */
export function openDatabase(): Database.Database {
  const dbPath = getDbPath();
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  
  // Run schema to ensure all tables exist (CREATE TABLE IF NOT EXISTS is safe)
  // This handles migrations when new tables are added in updates
  db.exec(SCHEMA);
  
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(db: Database.Database): void {
  db.close();
}

// ============================================================================
// Query Cache Functions
// ============================================================================

/** Cache entry structure */
export interface CacheEntry {
  cacheKey: string;
  result: string;
  indexVersion: string;
  createdAt: string;
  hitCount: number;
}

/** Parameters that affect cache key */
export interface CacheKeyParams {
  query: string;
  budget: number;
  sources?: string[];
  format: string;
  mode?: string;
  includeImports?: boolean;
}

/**
 * Compute index version hash based on chunk count and last indexed time
 * This invalidates cache when the index changes
 */
export function computeIndexVersion(db: Database.Database): string {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as chunkCount,
      MAX(created_at) as lastIndexed
    FROM chunks
  `).get() as { chunkCount: number; lastIndexed: string | null };

  const sourceStats = db.prepare(`
    SELECT COUNT(*) as sourceCount FROM sources
  `).get() as { sourceCount: number };

  const versionData = `${stats.chunkCount}:${sourceStats.sourceCount}:${stats.lastIndexed || ''}`;
  return createHash('sha256').update(versionData).digest('hex').slice(0, 16);
}

/**
 * Generate cache key from query parameters
 */
export function generateCacheKey(params: CacheKeyParams): string {
  const normalized = {
    query: params.query,
    budget: params.budget,
    sources: params.sources?.slice().sort() || [],
    format: params.format,
    mode: params.mode || 'full',
    includeImports: params.includeImports || false,
  };

  const keyData = JSON.stringify(normalized);
  return createHash('sha256').update(keyData).digest('hex');
}

/**
 * Get cached result if valid
 * Returns null if not found or index has changed
 */
export function getCachedResult(
  db: Database.Database,
  cacheKey: string,
  currentIndexVersion: string
): string | null {
  const row = db.prepare(`
    SELECT result, index_version, hit_count
    FROM query_cache
    WHERE cache_key = ?
  `).get(cacheKey) as { result: string; index_version: string; hit_count: number } | undefined;

  if (!row) {
    return null;
  }

  // Invalidate if index has changed
  if (row.index_version !== currentIndexVersion) {
    db.prepare('DELETE FROM query_cache WHERE cache_key = ?').run(cacheKey);
    return null;
  }

  // Update hit count
  db.prepare(`
    UPDATE query_cache 
    SET hit_count = hit_count + 1 
    WHERE cache_key = ?
  `).run(cacheKey);

  return row.result;
}

/**
 * Store result in cache
 */
export function setCachedResult(
  db: Database.Database,
  cacheKey: string,
  result: string,
  indexVersion: string
): void {
  db.prepare(`
    INSERT OR REPLACE INTO query_cache (cache_key, result, index_version, created_at, hit_count)
    VALUES (?, ?, ?, datetime('now'), 0)
  `).run(cacheKey, result, indexVersion);
}

/**
 * Clear all cache entries
 */
export function clearCache(db: Database.Database): number {
  const result = db.prepare('DELETE FROM query_cache').run();
  return result.changes;
}

/**
 * Get cache statistics
 */
export function getCacheStats(db: Database.Database): {
  entryCount: number;
  totalHits: number;
  oldestEntry: string | null;
  newestEntry: string | null;
} {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as entryCount,
      COALESCE(SUM(hit_count), 0) as totalHits,
      MIN(created_at) as oldestEntry,
      MAX(created_at) as newestEntry
    FROM query_cache
  `).get() as {
    entryCount: number;
    totalHits: number;
    oldestEntry: string | null;
    newestEntry: string | null;
  };

  return stats;
}

/**
 * Get index statistics for status command
 */
export function getIndexStats(db: Database.Database): {
  fileCount: number;
  chunkCount: number;
  embeddedCount: number;
  dbSize: number;
  lastIndexed: Date | null;
} {
  const fileCount = (db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number }).count;
  const chunkCount = (db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number }).count;
  const embeddedCount = (db.prepare('SELECT COUNT(*) as count FROM chunks WHERE embedding IS NOT NULL').get() as { count: number }).count;
  
  const lastRow = db.prepare('SELECT MAX(created_at) as last FROM chunks').get() as { last: string | null };
  const lastIndexed = lastRow.last ? new Date(lastRow.last) : null;

  // Get database file size
  const dbPath = db.name;
  let dbSize = 0;
  try {
    const stats = statSync(dbPath);
    dbSize = stats.size;
  } catch {
    // Ignore if can't get size
  }

  return {
    fileCount,
    chunkCount,
    embeddedCount,
    dbSize,
    lastIndexed,
  };
}

// ============================================================================
// Query History Functions
// ============================================================================

/** Query history entry */
export interface HistoryEntry {
  id: number;
  query: string;
  budget: number;
  format: string;
  mode: string;
  sources: string | null;
  tokensUsed: number | null;
  chunksFound: number | null;
  createdAt: string;
}

/** Parameters for recording a query */
export interface RecordQueryParams {
  query: string;
  budget: number;
  format: string;
  mode?: string;
  sources?: string[];
  tokensUsed?: number;
  chunksFound?: number;
}

/**
 * Record a query in history
 */
export function recordQuery(db: Database.Database, params: RecordQueryParams): void {
  db.prepare(`
    INSERT INTO query_history (query, budget, format, mode, sources, tokens_used, chunks_found)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.query,
    params.budget,
    params.format,
    params.mode || 'full',
    params.sources?.join(',') || null,
    params.tokensUsed ?? null,
    params.chunksFound ?? null
  );
}

/**
 * Get query history
 */
export function getQueryHistory(db: Database.Database, limit: number = 20): HistoryEntry[] {
  const rows = db.prepare(`
    SELECT 
      id,
      query,
      budget,
      format,
      mode,
      sources,
      tokens_used as tokensUsed,
      chunks_found as chunksFound,
      created_at as createdAt
    FROM query_history
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as HistoryEntry[];

  return rows;
}

/**
 * Get a specific history entry by ID
 */
export function getHistoryEntry(db: Database.Database, id: number): HistoryEntry | null {
  const row = db.prepare(`
    SELECT 
      id,
      query,
      budget,
      format,
      mode,
      sources,
      tokens_used as tokensUsed,
      chunks_found as chunksFound,
      created_at as createdAt
    FROM query_history
    WHERE id = ?
  `).get(id) as HistoryEntry | undefined;

  return row || null;
}

/**
 * Clear query history
 */
export function clearHistory(db: Database.Database): number {
  const result = db.prepare('DELETE FROM query_history').run();
  return result.changes;
}
