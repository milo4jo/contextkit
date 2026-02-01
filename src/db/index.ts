import Database from 'better-sqlite3';
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

-- Ensure chunk_count column exists (migration)
-- SQLite doesn't support IF NOT EXISTS for columns, so we handle this in code

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_chunks_file ON chunks(file_path);
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
 */
export function openDatabase(): Database.Database {
  const dbPath = getDbPath();
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(db: Database.Database): void {
  db.close();
}
