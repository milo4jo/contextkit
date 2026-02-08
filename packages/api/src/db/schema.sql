-- ContextKit Cloud Schema
-- Database: Turso (libSQL/SQLite)

-- Users (synced from Clerk)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
  stripe_customer_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Projects (indexed codebases)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, slug)
);

-- Index snapshots
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  size_bytes INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  file_count INTEGER DEFAULT 0,
  checksum TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- API keys for programmatic access
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT DEFAULT 'read',
  last_used_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Query analytics
CREATE TABLE IF NOT EXISTS queries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  query_text TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  latency_ms INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Team members (for team tier)
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_owner_id TEXT NOT NULL,
  member_user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (team_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (member_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (team_owner_id, member_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(user_id, slug);
CREATE INDEX IF NOT EXISTS idx_snapshots_project ON snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_version ON snapshots(project_id, version);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_project ON queries(project_id);
CREATE INDEX IF NOT EXISTS idx_queries_created ON queries(created_at);
CREATE INDEX IF NOT EXISTS idx_team_members_owner ON team_members(team_owner_id);
