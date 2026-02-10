-- ContextKit Database Setup
-- Run this against your Neon PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS org_slug_idx ON organizations(slug);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization memberships
CREATE TABLE IF NOT EXISTS org_members (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, slug)
);

CREATE INDEX IF NOT EXISTS project_org_idx ON projects(org_id);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes JSONB DEFAULT '[]',
  project_ids JSONB DEFAULT '[]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_key_org_idx ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS api_key_prefix_idx ON api_keys(key_prefix);

-- Indexed files
CREATE TABLE IF NOT EXISTS indexed_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  chunk_count INTEGER NOT NULL,
  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, file_path)
);

CREATE INDEX IF NOT EXISTS indexed_file_project_idx ON indexed_files(project_id);

-- Usage events
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  project_id UUID,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS usage_org_created_idx ON usage_events(org_id, created_at);

-- Monthly usage aggregates
CREATE TABLE IF NOT EXISTS usage_monthly (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  queries INTEGER DEFAULT 0,
  tokens INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  PRIMARY KEY (org_id, month)
);

-- Row Level Security (RLS) policies
-- Uncomment these if you want to enable RLS

-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation_projects ON projects
--   USING (org_id = current_setting('app.current_org_id')::uuid);

-- ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation_api_keys ON api_keys
--   USING (org_id = current_setting('app.current_org_id')::uuid);

COMMIT;

-- Output success message
SELECT 'Database setup complete! Tables created:' as message;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
