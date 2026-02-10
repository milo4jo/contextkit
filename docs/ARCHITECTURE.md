# ContextKit Cloud Architecture

> **Technical design for the B2B Enterprise Cloud Platform**
> 
> Version: 1.0 | Date: 2026-02-09 | Author: Milo 🦊

---

## Overview

ContextKit Cloud transforms the local-first CLI into a multi-tenant cloud platform while maintaining full backward compatibility with local usage.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │   CLI   │  │ VS Code │  │ GitHub  │  │  REST   │            │
│  │ (local) │  │  Ext    │  │ Action  │  │  API    │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       │            │            │            │                   │
│       ▼            └────────────┴────────────┘                   │
│  ┌─────────┐                    │                                │
│  │ SQLite  │              ┌─────▼─────┐                          │
│  │ (local) │              │ Cloud API │                          │
│  └─────────┘              └─────┬─────┘                          │
│                                 │                                │
└─────────────────────────────────┼────────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────────┐
│                       CLOUD PLATFORM                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     API Gateway                           │   │
│  │            (Auth, Rate Limiting, Routing)                 │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│         ┌───────────────────┼───────────────────┐               │
│         │                   │                   │               │
│    ┌────▼────┐        ┌─────▼─────┐      ┌─────▼─────┐         │
│    │ Context │        │   Index   │      │ Analytics │         │
│    │ Service │        │  Service  │      │  Service  │         │
│    └────┬────┘        └─────┬─────┘      └─────┬─────┘         │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │                     DATA LAYER                            │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐          │   │
│  │  │ PostgreSQL │  │   Qdrant   │  │  R2/S3     │          │   │
│  │  │ (metadata) │  │ (vectors)  │  │ (files)    │          │   │
│  │  └────────────┘  └────────────┘  └────────────┘          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenancy Model

### Tenant Hierarchy

```
Organization (tenant)
├── Users (members)
│   ├── Owner (1)
│   ├── Admins (0+)
│   └── Members (0+)
├── Projects (0+)
│   ├── Sources (directories to index)
│   ├── Index (chunks + embeddings)
│   └── Settings (config)
└── API Keys (0+)
    ├── Scopes (projects, permissions)
    └── Usage (queries, limits)
```

### Isolation Strategy

| Layer | Isolation Method |
|-------|------------------|
| **API** | API key → org_id lookup, all queries scoped |
| **PostgreSQL** | Row-level security (RLS) with `org_id` column |
| **Qdrant** | Separate collection per organization |
| **R2/S3** | Prefix: `orgs/{org_id}/projects/{project_id}/` |

### Security Boundaries

1. **API Key Scoping**
   - Each API key belongs to one organization
   - Keys can be scoped to specific projects
   - Permissions: `read`, `write`, `admin`

2. **Row-Level Security (PostgreSQL)**
   ```sql
   CREATE POLICY tenant_isolation ON projects
     USING (org_id = current_setting('app.current_org_id')::uuid);
   ```

3. **Vector Isolation (Qdrant)**
   - Collection naming: `org_{org_id}`
   - No cross-collection queries possible
   - Alternative: Single collection with `org_id` payload filter

---

## Database Schema

### PostgreSQL Tables

```sql
-- Organizations (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free', -- free, pro, team, enterprise
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization memberships
CREATE TABLE org_members (
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, slug)
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL, -- SHA-256 of the key
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  scopes JSONB DEFAULT '[]', -- ["project:read", "project:write"]
  project_ids UUID[] DEFAULT '{}', -- Empty = all projects
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index metadata (what files are indexed)
CREATE TABLE indexed_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  chunk_count INTEGER NOT NULL,
  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, file_path)
);

-- Usage tracking
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'query', 'index', 'sync'
  project_id UUID,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage aggregates (for billing)
CREATE TABLE usage_monthly (
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month
  queries INTEGER DEFAULT 0,
  tokens INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  PRIMARY KEY (org_id, month)
);

-- Indexes
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_api_keys_org ON api_keys(org_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_usage_events_org_created ON usage_events(org_id, created_at);
CREATE INDEX idx_indexed_files_project ON indexed_files(project_id);
```

### Qdrant Collections

```typescript
// Collection per organization
const collectionConfig = {
  name: `org_${orgId}`,
  vectors: {
    size: 384, // gte-small dimension
    distance: "Cosine"
  },
  payload_schema: {
    project_id: "keyword",
    file_path: "keyword",
    chunk_index: "integer",
    start_line: "integer",
    end_line: "integer"
  }
};

// Query with project filter
const searchParams = {
  collection: `org_${orgId}`,
  vector: queryEmbedding,
  filter: {
    must: [
      { key: "project_id", match: { value: projectId } }
    ]
  },
  limit: 20
};
```

---

## API Design

### Authentication

```
Authorization: Bearer ck_live_xxxxxxxxxxxxxxxxxxxx
              └─ prefix ─┘└─── random (32 chars) ───┘
```

**Key format:**
- `ck_live_` — Production key
- `ck_test_` — Test/development key
- 32 random alphanumeric characters

**Validation flow:**
1. Extract key prefix (first 8 chars after `ck_`)
2. Look up key by prefix in `api_keys` table
3. Verify full key hash matches
4. Check expiration, scopes, project access
5. Set `org_id` in request context

### Rate Limiting

| Plan | Requests/min | Queries/month |
|------|--------------|---------------|
| Free | 20 | 1,000 |
| Pro | 100 | 50,000 |
| Team | 500 | Unlimited |
| Enterprise | Custom | Unlimited |

**Implementation:** Redis (Upstash) with sliding window

```typescript
const rateLimitKey = `ratelimit:${orgId}:${minute}`;
const count = await redis.incr(rateLimitKey);
if (count === 1) await redis.expire(rateLimitKey, 60);
if (count > limit) throw new RateLimitError();
```

### Endpoints

See `api/openapi.yaml` for full specification.

**Core endpoints:**
- `POST /v1/context/select` — Get relevant context
- `POST /v1/index/sync` — Upload and index codebase
- `GET /v1/projects` — List projects
- `POST /v1/projects` — Create project
- `GET /v1/symbols/search` — Search by symbol name
- `GET /v1/graph/calls` — Get call graph

---

## Storage Architecture

### Local (CLI)

```
.contextkit/
├── config.yaml          # Project config
├── index.db             # SQLite (chunks + embeddings)
└── cache/               # Query cache
```

### Cloud

```
PostgreSQL (Neon)
├── organizations
├── projects
├── api_keys
├── indexed_files
└── usage_*

Qdrant Cloud
├── org_{uuid}/          # Collection per org
│   └── vectors          # Embeddings with project_id payload

Cloudflare R2
└── orgs/{org_id}/
    └── projects/{project_id}/
        ├── index.db     # SQLite backup (optional)
        └── files/       # Original files (optional)
```

---

## Embedding Strategy

### Cloud Embeddings

**Option chosen:** OpenAI text-embedding-3-small

| Factor | OpenAI | Self-hosted |
|--------|--------|-------------|
| Latency | ~200ms | 1-5s (CPU) |
| Cost | $0.02/1M tokens | $200/mo server |
| Scaling | Automatic | Manual |
| Quality | Excellent | Good (gte-small) |

**Cost projection:**
- Average query: ~500 tokens
- 50k queries/month: 25M tokens = $0.50/month
- Indexing 100k LOC: ~2M tokens = $0.04

### Caching

1. **Query cache:** Same query → same results (1 hour TTL)
2. **Embedding cache:** Same text → same embedding (permanent)
3. **Index cache:** File unchanged → skip re-embedding

---

## Deployment

### Infrastructure (Cloudflare + Neon + Qdrant)

```yaml
# Production Stack
API:
  provider: Cloudflare Workers
  regions: Global edge
  
Database:
  provider: Neon
  plan: Scale (auto-scaling)
  region: us-east-1
  
Vectors:
  provider: Qdrant Cloud
  plan: Starter (1GB free)
  region: us-east-1
  
Storage:
  provider: Cloudflare R2
  egress: Free
  
Redis:
  provider: Upstash
  plan: Pay-as-you-go
```

### Cost Estimate (1000 users)

| Service | Monthly Cost |
|---------|--------------|
| Cloudflare Workers | $5 |
| Neon (Scale) | $19 |
| Qdrant (1GB) | $0 (free tier) |
| R2 (10GB) | $1.50 |
| Upstash Redis | $5 |
| OpenAI Embeddings | $10 |
| **Total** | **~$40/month** |

---

## Migration Path

### Phase 1: Abstraction Layer (Current)

```typescript
// Storage interface
interface StorageAdapter {
  getChunks(projectId: string): Promise<Chunk[]>;
  storeChunks(projectId: string, chunks: Chunk[]): Promise<void>;
  searchSimilar(embedding: number[], limit: number): Promise<Chunk[]>;
}

// Local implementation
class SQLiteAdapter implements StorageAdapter { ... }

// Cloud implementation  
class CloudAdapter implements StorageAdapter { ... }
```

### Phase 2: CLI Flag

```bash
# Local (default)
contextkit select "auth middleware"

# Cloud
contextkit select "auth middleware" --cloud
# or
CONTEXTKIT_CLOUD=true contextkit select "auth middleware"
```

### Phase 3: Seamless Sync

```bash
# Push local index to cloud
contextkit cloud push

# Pull cloud index to local
contextkit cloud pull

# Auto-sync mode
contextkit cloud sync --watch
```

---

## Security Checklist

- [ ] API keys hashed with SHA-256 (never stored plaintext)
- [ ] Rate limiting per org and per key
- [ ] Row-level security in PostgreSQL
- [ ] Tenant isolation in Qdrant (separate collections)
- [ ] HTTPS only (Cloudflare automatic)
- [ ] Input validation (Zod schemas)
- [ ] SQL injection prevention (parameterized queries)
- [ ] Audit logging for sensitive operations
- [ ] Secret scanning in CI/CD
- [ ] Dependency vulnerability scanning

---

## Monitoring

### Metrics (Prometheus/Grafana)

- `api_requests_total{endpoint, status}`
- `api_latency_seconds{endpoint}`
- `index_operations_total{org_id}`
- `query_tokens_total{org_id}`
- `active_organizations`
- `storage_bytes{org_id}`

### Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| High error rate | 5xx > 1% for 5min | Critical |
| High latency | p95 > 2s for 10min | Warning |
| Rate limit spike | 429s > 100/min | Warning |
| Database connections | > 80% pool | Warning |
| Qdrant unhealthy | Health check fails | Critical |

---

*Document Owner: Milo 🦊*
*Last Updated: 2026-02-09*
