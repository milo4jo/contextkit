# ContextKit Cloud — Implementation Plan

## Overview

Build the infrastructure for ContextKit Cloud in phases, starting with the minimum needed to ship Pro tier.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│  CLI        │  VS Code    │  Web App    │  MCP        │  API    │
│  (sync)     │  Extension  │  Dashboard  │  Server     │  SDK    │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴────┬────┘
       │             │             │             │           │
       └─────────────┴──────┬──────┴─────────────┴───────────┘
                            │
                    ┌───────▼───────┐
                    │   API Layer   │
                    │  (Hono/CF)    │
                    └───────┬───────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
┌──────▼──────┐     ┌───────▼───────┐    ┌──────▼──────┐
│    Auth     │     │   Database    │    │   Storage   │
│   (Clerk)   │     │   (Turso)     │    │    (R2)     │
└─────────────┘     └───────────────┘    └─────────────┘
```

---

## Tech Stack Decision

| Component | Choice | Why |
|-----------|--------|-----|
| **API** | Hono on Cloudflare Workers | Fast, cheap, edge, TypeScript |
| **Auth** | Clerk | Quick setup, free tier, handles OAuth |
| **Database** | Turso (libSQL) | SQLite-compatible, edge, generous free |
| **Storage** | Cloudflare R2 | S3-compatible, no egress fees |
| **Payments** | Lemon Squeezy | Already have account, handles EU VAT |
| **Monorepo** | pnpm workspaces | Already using |

**Total monthly cost at start: ~$0** (all have generous free tiers)

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Project Setup

```
contextkit/
├── packages/
│   ├── cli/          # Existing CLI (move here)
│   ├── core/         # Shared types, utils
│   ├── api/          # Cloudflare Workers API
│   └── web/          # Dashboard (Next.js)
```

### 1.2 Database Schema (Turso)

```sql
-- Users (synced from Clerk via webhook)
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- Clerk user ID
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',      -- free, pro, team, enterprise
  stripe_customer_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Projects (indexes)
CREATE TABLE projects (
  id TEXT PRIMARY KEY,           -- uuid
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,            -- unique per user
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (user_id, slug)
);

-- Index snapshots (the actual synced data)
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,           -- uuid
  project_id TEXT NOT NULL,
  version INTEGER NOT NULL,      -- incremental
  storage_key TEXT NOT NULL,     -- R2 key
  size_bytes INTEGER,
  chunk_count INTEGER,
  file_count INTEGER,
  checksum TEXT,                 -- for integrity
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- API keys for programmatic access
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,        -- hashed key
  last_used_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Query analytics (for insights)
CREATE TABLE queries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  query_text TEXT NOT NULL,
  result_count INTEGER,
  latency_ms INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Indexes
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_snapshots_project ON snapshots(project_id);
CREATE INDEX idx_queries_project ON queries(project_id);
CREATE INDEX idx_queries_created ON queries(created_at);
```

### 1.3 API Endpoints (Hono)

```typescript
// Auth
POST   /auth/callback          // Clerk webhook
GET    /auth/me                // Get current user

// Projects
GET    /projects               // List user's projects
POST   /projects               // Create project
GET    /projects/:slug         // Get project
PATCH  /projects/:slug         // Update project
DELETE /projects/:slug         // Delete project

// Sync
POST   /projects/:slug/sync    // Upload index (multipart)
GET    /projects/:slug/pull    // Download latest index
GET    /projects/:slug/versions // List versions

// API Keys
GET    /api-keys               // List keys
POST   /api-keys               // Create key
DELETE /api-keys/:id           // Revoke key

// Analytics (Pro+)
GET    /projects/:slug/analytics // Query stats
```

### 1.4 CLI Commands

```bash
# Auth
contextkit login               # Open browser, OAuth
contextkit logout              # Clear credentials
contextkit whoami              # Show current user

# Sync
contextkit sync                # Push local index to cloud
contextkit pull                # Pull latest from cloud
contextkit link                # Link local project to cloud

# Projects
contextkit projects            # List cloud projects
contextkit projects create     # Create new cloud project
```

---

## Phase 2: Core Sync (Week 3-4)

### 2.1 Index Export/Import

```typescript
// Export index to portable format
interface IndexBundle {
  version: 1;
  metadata: {
    projectName: string;
    createdAt: string;
    cli_version: string;
    chunk_count: number;
    file_count: number;
  };
  config: ContextKitConfig;
  // Chunks stored separately in R2, referenced by checksum
  chunks_manifest: Array<{
    id: string;
    file_path: string;
    checksum: string;
  }>;
}
```

### 2.2 Sync Protocol

```
1. CLI: Export index to bundle
2. CLI: Calculate checksums
3. CLI: POST /sync with manifest
4. API: Return missing chunks
5. CLI: Upload only missing chunks to R2 (presigned URLs)
6. API: Create snapshot record
7. CLI: Confirm sync complete
```

**Incremental sync:** Only upload changed chunks (content-addressed storage).

### 2.3 Credentials Storage

```typescript
// ~/.contextkit/credentials.json (encrypted)
{
  "access_token": "...",
  "refresh_token": "...",
  "user_id": "...",
  "expires_at": 1234567890
}
```

---

## Phase 3: Dashboard (Week 5-6)

### 3.1 Pages

```
/                    → Landing (marketing)
/login               → Clerk sign-in
/dashboard           → Projects list
/dashboard/[slug]    → Project detail
/dashboard/settings  → Account settings
/dashboard/billing   → Subscription management
```

### 3.2 Features

- Project list with sync status
- Query history (last 100 queries)
- Storage usage
- API key management
- Billing/subscription

---

## Phase 4: Payments (Week 7-8)

### 4.1 Lemon Squeezy Integration

```typescript
// Products
const PRODUCTS = {
  pro_monthly: 'variant_xxx',
  pro_yearly: 'variant_yyy',
};

// Webhook handler
POST /webhooks/lemonsqueezy
  - subscription_created → upgrade user to pro
  - subscription_cancelled → downgrade to free
  - subscription_payment_failed → send email, grace period
```

### 4.2 Feature Gating

```typescript
const PLAN_LIMITS = {
  free: {
    projects: 1,
    sync: false,
    analytics: false,
    api_keys: 0,
  },
  pro: {
    projects: 10,
    sync: true,
    analytics: true,
    api_keys: 5,
  },
  team: {
    projects: 50,
    sync: true,
    analytics: true,
    api_keys: 20,
    team_members: 10,
  },
};
```

---

## Implementation Order

### Week 1: Setup
- [ ] Create `packages/api` with Hono
- [ ] Set up Turso database
- [ ] Create Clerk application
- [ ] Basic auth flow (login/logout/whoami)
- [ ] Deploy to Cloudflare Workers

### Week 2: Database & Projects
- [ ] Implement database schema
- [ ] Projects CRUD endpoints
- [ ] CLI: `contextkit projects` command
- [ ] CLI: `contextkit link` command

### Week 3: Sync Upload
- [ ] Index export format
- [ ] R2 bucket setup
- [ ] Sync upload endpoint
- [ ] CLI: `contextkit sync` command

### Week 4: Sync Download
- [ ] Sync download endpoint
- [ ] CLI: `contextkit pull` command
- [ ] Incremental sync (checksums)

### Week 5: Dashboard
- [ ] Next.js app setup
- [ ] Clerk integration
- [ ] Projects list page
- [ ] Project detail page

### Week 6: Dashboard Polish
- [ ] Settings page
- [ ] API key management
- [ ] Query history view

### Week 7: Payments
- [ ] Lemon Squeezy product setup
- [ ] Webhook handler
- [ ] Plan upgrade/downgrade logic

### Week 8: Launch
- [ ] Feature gating
- [ ] Documentation
- [ ] Soft launch to waitlist

---

## File Structure

```
contextkit/
├── packages/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts           # Hono app entry
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── projects.ts
│   │   │   │   ├── sync.ts
│   │   │   │   └── webhooks.ts
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.ts
│   │   │   │   └── client.ts
│   │   │   └── lib/
│   │   │       ├── clerk.ts
│   │   │       └── r2.ts
│   │   ├── wrangler.toml
│   │   └── package.json
│   │
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx       # Landing
│   │   │   │   ├── dashboard/
│   │   │   │   └── api/
│   │   │   └── components/
│   │   └── package.json
│   │
│   ├── core/
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   └── constants.ts
│   │   └── package.json
│   │
│   └── cli/                       # Move existing CLI here
│       └── ...
│
├── pnpm-workspace.yaml
└── package.json
```

---

## Environment Variables

### API (Cloudflare Workers)

```toml
# wrangler.toml
[vars]
CLERK_PUBLISHABLE_KEY = "pk_..."
ENVIRONMENT = "production"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "contextkit-indexes"

[secrets]
# Set via: wrangler secret put CLERK_SECRET_KEY
CLERK_SECRET_KEY = "..."
TURSO_URL = "..."
TURSO_AUTH_TOKEN = "..."
LEMONSQUEEZY_WEBHOOK_SECRET = "..."
```

### Web Dashboard

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_API_URL=https://api.contextkit.dev
```

---

## Domains

| Domain | Purpose |
|--------|---------|
| contextkit.dev | Marketing site |
| app.contextkit.dev | Dashboard |
| api.contextkit.dev | API |

---

## Security Considerations

1. **Index Encryption** — Optional client-side encryption for Pro+
2. **Rate Limiting** — Cloudflare rate limiting on API
3. **Input Validation** — Zod schemas on all endpoints
4. **CORS** — Strict origin allowlist
5. **API Keys** — Hashed storage, scoped permissions

---

## Next Steps

1. **Set up accounts:**
   - [ ] Clerk account
   - [ ] Turso account
   - [ ] Cloudflare account (if not already)

2. **Start coding:**
   - [ ] Create `packages/api` scaffold
   - [ ] Deploy "hello world" to Workers

3. **Domain:**
   - [ ] Register contextkit.dev (or use subdomain)

---

*Ready to start? Let's build the API scaffold first.*
