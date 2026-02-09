# ContextKit Enterprise — Epics & Tasks

> **Tracking document for the B2B Enterprise Cloud Platform transformation**
> 
> Status: 🟢 Active | Owner: Milo 🦊 | Started: 2026-02-09

---

## Overview (Revised 8-Month Plan)

```
Feb-Mar 2026           Apr-May 2026         Jun-Jul 2026         Aug-Oct 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[E0: Business Found]──▶
[E1: API Foundation]──────────────────────▶
                       [E2: Dashboard]──────────────────────────▶
                                            [E3: VS Code + GH Action]───▶
                                            [E5: Team Features]─────────▶
                                                                 [E4: Enterprise]──▶2027
```

**Total Revised Estimate:** ~365h over 8 months
**Capacity:** ~15h/week = 480h available (buffer for unknowns)

---

## Epic 0: Business Foundation 🔴 CRITICAL — DO FIRST

**Goal:** Revenue infrastructure before building features
**Target:** Feb-Mar 2026
**Status:** 🟡 Starting

### Why First?
- Can't charge without billing
- Can't convert without onboarding
- Can't grow without analytics

### Tasks

#### 0.1 Billing & Payments
- [ ] **0.1.1** Set up Stripe account
  - Products: Pro, Team
  - Pricing: $19/mo Pro, $12/user/mo Team
  - **Estimate:** 1h

- [ ] **0.1.2** Implement Stripe Checkout
  - Upgrade flows in dashboard
  - Webhook handlers (subscription events)
  - **Deliverable:** Working payments
  - **Estimate:** 8h

- [ ] **0.1.3** Usage tracking for metered billing
  - Track queries per org
  - Enforce limits
  - **Deliverable:** Usage enforcement
  - **Estimate:** 4h

#### 0.2 Onboarding & Activation
- [ ] **0.2.1** First-run experience in CLI
  - `contextkit init` improvements
  - Progress indicators
  - **Estimate:** 3h

- [ ] **0.2.2** Onboarding email sequence
  - Welcome, getting started, tips
  - Use Resend or Postmark
  - **Estimate:** 4h

- [ ] **0.2.3** In-app guidance
  - Empty states with CTAs
  - Tooltips for new users
  - **Estimate:** 3h

#### 0.3 Analytics & Feedback
- [ ] **0.3.1** Set up PostHog or Mixpanel
  - Track key events (init, index, select, upgrade)
  - **Estimate:** 2h

- [ ] **0.3.2** User feedback mechanism
  - In-app feedback widget
  - NPS survey (30-day users)
  - **Estimate:** 2h

#### 0.4 Marketing Site
- [ ] **0.4.1** Landing page refresh
  - Clear value prop
  - Pricing table
  - Social proof (when available)
  - **Estimate:** 6h

- [ ] **0.4.2** Documentation site
  - Docusaurus or Mintlify
  - API reference (auto-generated)
  - **Estimate:** 4h

### Epic 0 Total: ~37h

---

## Epic 1: Context API Foundation 🔴 HIGH PRIORITY

**Goal:** Transform CLI into API-first platform
**Target:** Q1-Q2 2026
**Status:** 🟡 In Planning

### Why First?
- Everything else depends on the API
- Enables all integrations
- Revenue foundation (usage-based billing)

### Tasks

#### 1.0 Core Refactoring (NEW — Required for Cloud)
- [ ] **1.0.1** Abstract storage layer
  - Interface for index storage
  - SQLite adapter (local)
  - Postgres adapter (cloud)
  - **Deliverable:** Pluggable storage
  - **Estimate:** 12h

- [ ] **1.0.2** Abstract vector storage
  - Interface for embeddings
  - Local adapter (current)
  - Qdrant adapter (cloud)
  - **Deliverable:** Pluggable vectors
  - **Estimate:** 8h

- [ ] **1.0.3** Multi-tenancy security design
  - Tenant isolation strategy
  - API key scoping
  - **Deliverable:** ARCHITECTURE.md
  - **Estimate:** 4h

#### 1.1 API Design & Architecture
- [ ] **1.1.1** Design REST API schema (OpenAPI spec)
  - Endpoints: `/v1/context/select`, `/v1/index/*`, `/v1/symbols/*`, `/v1/graph/*`
  - Auth: API keys
  - Rate limiting structure
  - **Deliverable:** `api-spec.yaml`
  - **Estimate:** 4h

- [ ] ~~**1.1.2** Design GraphQL schema~~ **DEFERRED** (REST is sufficient for MVP)

- [ ] **1.1.3** Define data models for multi-tenancy
  - Organizations, Projects, Users, API Keys
  - Usage tracking tables
  - **Deliverable:** Database schema
  - **Estimate:** 4h

#### 1.2 Backend Infrastructure
- [ ] **1.2.1** Set up API project structure
  - Framework: Hono.js or Fastify (lightweight, fast)
  - TypeScript, strict mode
  - **Deliverable:** `/apps/api` in monorepo
  - **Estimate:** 2h

- [ ] **1.2.2** Set up PostgreSQL database
  - Neon or Supabase for managed Postgres
  - Drizzle ORM for type-safe queries
  - **Deliverable:** Working DB connection
  - **Estimate:** 3h

- [ ] **1.2.3** Set up Qdrant vector database
  - Cloud instance for embeddings
  - Collection per organization
  - **Deliverable:** Working vector search
  - **Estimate:** 4h

- [ ] **1.2.4** Implement authentication system
  - API key generation & validation
  - JWT for session tokens
  - Organization-scoped keys
  - **Deliverable:** Auth middleware
  - **Estimate:** 6h

- [ ] **1.2.5** Implement rate limiting
  - Redis-based (Upstash)
  - Per-tier limits
  - Graceful degradation
  - **Deliverable:** Rate limit middleware
  - **Estimate:** 3h

#### 1.3 Core API Endpoints
- [ ] **1.3.1** `/v1/context/select` endpoint
  - Port CLI select logic to API
  - Support all output formats
  - Async for large queries
  - **Deliverable:** Working endpoint
  - **Estimate:** 8h

- [ ] **1.3.2** `/v1/index/sync` endpoint
  - Accept codebase uploads (zip/tar)
  - Trigger indexing pipeline
  - Webhook on completion
  - **Deliverable:** Working endpoint
  - **Estimate:** 6h

- [ ] **1.3.3** `/v1/symbols/search` endpoint
  - Symbol search via API
  - **Deliverable:** Working endpoint
  - **Estimate:** 3h

- [ ] **1.3.4** `/v1/graph/call` endpoint
  - Call graph via API
  - **Deliverable:** Working endpoint
  - **Estimate:** 3h

- [ ] **1.3.5** `/v1/projects/*` CRUD endpoints
  - Create, read, update, delete projects
  - List projects per org
  - **Deliverable:** Working endpoints
  - **Estimate:** 4h

#### 1.4 CLI Integration
- [ ] **1.4.1** Add `--api` flag to CLI commands
  - Use cloud API instead of local processing
  - Seamless switch between local/cloud
  - **Deliverable:** Updated CLI
  - **Estimate:** 4h

- [ ] **1.4.2** Update `contextkit cloud` commands
  - Login, logout, status
  - Project management
  - **Deliverable:** Updated CLI
  - **Estimate:** 3h

#### 1.5 Deployment
- [ ] **1.5.1** Set up Cloudflare Workers or Fly.io
  - Global edge deployment
  - Auto-scaling
  - **Deliverable:** Production deployment
  - **Estimate:** 4h

- [ ] **1.5.2** Set up CI/CD pipeline
  - GitHub Actions
  - Staging + Production environments
  - **Deliverable:** Working pipeline
  - **Estimate:** 3h

- [ ] **1.5.3** Set up monitoring & alerting
  - Sentry for errors
  - Grafana/Prometheus for metrics
  - PagerDuty for alerts
  - **Deliverable:** Monitoring dashboard
  - **Estimate:** 4h

### Epic 1 Total: ~88h (includes refactoring)

---

## Epic 2: Dashboard & Web App 🟡 MEDIUM PRIORITY

**Goal:** Self-serve management UI for teams
**Target:** Q2 2026
**Status:** 🔵 Backlog

### Dependencies
- Epic 1 (API) must be at least 50% complete

### Tasks

#### 2.1 Project Setup
- [ ] **2.1.1** Create dashboard app
  - Next.js 15 with App Router
  - Tailwind CSS + shadcn/ui
  - **Deliverable:** `/apps/dashboard`
  - **Estimate:** 2h

- [ ] **2.1.2** Set up authentication UI
  - Clerk or NextAuth
  - Magic links + OAuth (GitHub, Google)
  - **Deliverable:** Working auth flow
  - **Estimate:** 4h

#### 2.2 Core Pages
- [ ] **2.2.1** Dashboard home
  - Usage overview (queries, tokens)
  - Recent activity
  - Quick actions
  - **Deliverable:** Home page
  - **Estimate:** 6h

- [ ] **2.2.2** Projects list & management
  - Create, edit, delete projects
  - Index status per project
  - **Deliverable:** Projects page
  - **Estimate:** 6h

- [ ] **2.2.3** Project detail page
  - Indexed files browser
  - Test query interface
  - Settings (sources, config)
  - **Deliverable:** Detail page
  - **Estimate:** 8h

- [ ] **2.2.4** API keys management
  - Generate, revoke keys
  - Scopes per key
  - Usage per key
  - **Deliverable:** API keys page
  - **Estimate:** 4h

- [ ] **2.2.5** Usage & billing page
  - Current usage vs. limits
  - Billing history
  - Upgrade prompts
  - **Deliverable:** Billing page
  - **Estimate:** 6h

#### 2.3 Team Features
- [ ] **2.3.1** Team members page
  - Invite by email
  - Role management (admin, member)
  - Remove members
  - **Deliverable:** Team page
  - **Estimate:** 6h

- [ ] **2.3.2** Organization settings
  - Name, billing email
  - Default settings
  - **Deliverable:** Settings page
  - **Estimate:** 3h

#### 2.4 Analytics Dashboard
- [ ] **2.4.1** Usage charts
  - Queries over time
  - Tokens saved
  - Response times
  - **Deliverable:** Charts component
  - **Estimate:** 6h

- [ ] **2.4.2** Top queries & patterns
  - Most common queries
  - Knowledge gaps detection
  - **Deliverable:** Insights panel
  - **Estimate:** 4h

### Epic 2 Total: ~55h

---

## Epic 3: Integrations 🟡 MEDIUM PRIORITY

**Goal:** Use ContextKit from anywhere
**Target:** Q2-Q3 2026
**Status:** 🔵 Backlog

### Tasks

#### 3.1 VS Code Extension
- [ ] **3.1.1** Extension scaffold
  - TypeScript, esbuild
  - Extension manifest
  - **Deliverable:** Extension repo
  - **Estimate:** 2h

- [ ] **3.1.2** Sidebar panel
  - Index status
  - Recent queries
  - Project selector
  - **Deliverable:** Sidebar UI
  - **Estimate:** 6h

- [ ] **3.1.3** Command palette commands
  - "ContextKit: Select Context"
  - "ContextKit: Find Symbol"
  - "ContextKit: Show Call Graph"
  - **Deliverable:** Commands
  - **Estimate:** 4h

- [ ] **3.1.4** Right-click context menu
  - "Find Related Context"
  - "Who Calls This?"
  - **Deliverable:** Context menu
  - **Estimate:** 3h

- [ ] **3.1.5** Inline context preview
  - Hover over function → show context
  - **Deliverable:** Hover provider
  - **Estimate:** 4h

- [ ] **3.1.6** Publish to VS Code Marketplace
  - Icons, README, screenshots
  - **Deliverable:** Published extension
  - **Estimate:** 2h

#### 3.2 GitHub Action
- [ ] **3.2.1** Action scaffold
  - Docker-based action
  - Input/output schema
  - **Deliverable:** Action repo
  - **Estimate:** 2h

- [ ] **3.2.2** PR context comment
  - Analyze changed files
  - Add relevant context as comment
  - **Deliverable:** Working action
  - **Estimate:** 6h

- [ ] **3.2.3** PR review mode
  - Suggest related code to review
  - **Deliverable:** Review feature
  - **Estimate:** 4h

- [ ] **3.2.4** Publish to GitHub Marketplace
  - Documentation, examples
  - **Deliverable:** Published action
  - **Estimate:** 2h

#### 3.3 Slack Bot — ❌ DEFERRED TO 2027
*Reason: VS Code + GitHub Action cover primary use cases. Build if users request.*

#### 3.4 JetBrains Plugin — ❌ DEFERRED TO 2027
*Reason: VS Code has 70%+ market share. Build if significant demand.*

### Epic 3 Total: ~35h (after cuts)

---

## Epic 4: Enterprise Features 🔴 HIGH PRIORITY (Q3)

**Goal:** Features that enterprises require
**Target:** Q3 2026
**Status:** 🔵 Backlog

### Dependencies
- Epic 1 (API) complete
- Epic 2 (Dashboard) at least 70% complete

### Tasks

#### 4.1 SSO / SAML Integration
- [ ] **4.1.1** Research SSO providers
  - WorkOS, Auth0, Clerk Enterprise
  - **Estimate:** 2h

- [ ] **4.1.2** Implement SAML SSO
  - IdP metadata configuration
  - SP-initiated login
  - **Deliverable:** Working SAML
  - **Estimate:** 8h

- [ ] **4.1.3** Implement OIDC SSO
  - Okta, Azure AD, Google Workspace
  - **Deliverable:** Working OIDC
  - **Estimate:** 6h

- [ ] **4.1.4** Domain verification
  - Verify company domain for auto-join
  - **Deliverable:** Domain verification flow
  - **Estimate:** 4h

#### 4.2 Audit Logging
- [ ] **4.2.1** Define audit log schema
  - Actor, action, resource, timestamp, metadata
  - **Estimate:** 2h

- [ ] **4.2.2** Implement audit log capture
  - All API calls logged
  - User actions in dashboard
  - **Deliverable:** Logging pipeline
  - **Estimate:** 6h

- [ ] **4.2.3** Audit log viewer in dashboard
  - Search, filter, export
  - **Deliverable:** Audit UI
  - **Estimate:** 6h

- [ ] **4.2.4** Log export (SIEM integration)
  - Export to S3, Splunk, Datadog
  - **Deliverable:** Export feature
  - **Estimate:** 4h

#### 4.3 Role-Based Access Control (RBAC)
- [ ] **4.3.1** Define role & permission model
  - Roles: Owner, Admin, Member, Viewer
  - Permissions: read, write, admin per resource
  - **Estimate:** 2h

- [ ] **4.3.2** Implement RBAC middleware
  - Check permissions on all endpoints
  - **Deliverable:** RBAC system
  - **Estimate:** 6h

- [ ] **4.3.3** Role management UI
  - Assign roles in dashboard
  - Custom roles (enterprise)
  - **Deliverable:** Role UI
  - **Estimate:** 4h

#### 4.4 Context Policies
- [ ] **4.4.1** Define policy schema
  - Redaction rules (PII, secrets)
  - Access restrictions (sensitive repos)
  - **Estimate:** 2h

- [ ] **4.4.2** Implement policy engine
  - Apply policies before context returned
  - **Deliverable:** Policy engine
  - **Estimate:** 8h

- [ ] **4.4.3** Policy management UI
  - Create, edit, test policies
  - **Deliverable:** Policy UI
  - **Estimate:** 6h

#### 4.5 SLA & Support
- [ ] **4.5.1** Set up support ticketing
  - Intercom or Zendesk
  - **Estimate:** 2h

- [ ] **4.5.2** Implement status page
  - Uptime monitoring
  - Incident communication
  - **Deliverable:** status.contextkit.dev
  - **Estimate:** 3h

### Epic 4 Total: ~71h

---

## Epic 5: Team Collaboration 🟡 MEDIUM PRIORITY

**Goal:** Features for team productivity
**Target:** Q2-Q3 2026
**Status:** 🔵 Backlog

### Tasks

#### 5.1 Shared Indexes
- [ ] **5.1.1** Multi-repo indexing
  - Index multiple repos per project
  - Cross-repo search
  - **Deliverable:** Multi-repo support
  - **Estimate:** 8h

- [ ] **5.1.2** Automatic sync from GitHub/GitLab
  - Webhook on push
  - Incremental re-index
  - **Deliverable:** Auto-sync
  - **Estimate:** 6h

- [ ] **5.1.3** Branch support
  - Index specific branches
  - Compare branch contexts
  - **Deliverable:** Branch indexing
  - **Estimate:** 4h

#### 5.2 Context Recipes
- [ ] **5.2.1** Recipe schema design
  - YAML format
  - Variables, steps, outputs
  - **Estimate:** 2h

- [ ] **5.2.2** Recipe execution engine
  - Parse and run recipes
  - **Deliverable:** Recipe runner
  - **Estimate:** 6h

- [ ] **5.2.3** Recipe library (built-in)
  - api-endpoints, auth-flow, db-schema
  - **Deliverable:** 5+ recipes
  - **Estimate:** 4h

- [ ] **5.2.4** Recipe sharing in team
  - Team recipe library
  - Fork & customize
  - **Deliverable:** Recipe sharing UI
  - **Estimate:** 4h

#### 5.3 Knowledge Base — ❌ DEFERRED TO 2027
*Reason: Significant scope expansion. Could be separate product. Build if code context proves valuable first.*

### Epic 5 Total: ~34h (after cuts)

---

## Epic 6: Self-Hosted / On-Premise 🔵 LOW PRIORITY (Q4)

**Goal:** Run ContextKit in customer infrastructure
**Target:** Q4 2026
**Status:** 🔵 Backlog

### Dependencies
- Epic 1, 2, 4 complete

### Tasks

#### 6.1 Containerization
- [ ] **6.1.1** Dockerize all services
  - API, indexer, worker
  - Multi-stage builds
  - **Deliverable:** Dockerfiles
  - **Estimate:** 4h

- [ ] **6.1.2** Docker Compose for local testing
  - All services + databases
  - **Deliverable:** docker-compose.yml
  - **Estimate:** 3h

#### 6.2 Kubernetes Deployment
- [ ] **6.2.1** Helm chart
  - Configurable replicas, resources
  - Secrets management
  - **Deliverable:** Helm chart
  - **Estimate:** 8h

- [ ] **6.2.2** Kubernetes operators (optional)
  - Auto-scaling based on queue depth
  - **Deliverable:** Operator
  - **Estimate:** 12h

- [ ] **6.2.3** Air-gapped installation guide
  - Offline license validation
  - Local embedding model
  - **Deliverable:** Documentation
  - **Estimate:** 4h

#### 6.3 License Management
- [ ] **6.3.1** License key generation
  - Org-bound, expiring keys
  - Feature flags per license
  - **Deliverable:** License system
  - **Estimate:** 6h

- [ ] **6.3.2** License validation (online)
  - Periodic phone-home
  - Graceful degradation
  - **Deliverable:** Validation service
  - **Estimate:** 4h

- [ ] **6.3.3** Offline license support
  - Hardware-bound keys
  - **Deliverable:** Offline validation
  - **Estimate:** 4h

### Epic 6 Total: ~45h

---

## Epic 7: Compliance & Security 🔴 HIGH PRIORITY (Ongoing)

**Goal:** Enterprise-grade security posture
**Target:** Ongoing through Q4 2026
**Status:** 🟡 In Progress

### Tasks

#### 7.1 Security Hardening
- [ ] **7.1.1** Security audit of codebase
  - Dependency scanning
  - SAST (static analysis)
  - **Estimate:** 4h

- [ ] **7.1.2** Penetration testing
  - External pen test firm
  - **Estimate:** External ($$)

- [ ] **7.1.3** Bug bounty program
  - Set up on HackerOne or similar
  - **Estimate:** 2h setup

#### 7.2 Compliance
- [ ] **7.2.1** SOC2 Type I preparation
  - Policies and procedures
  - Access controls documentation
  - **Estimate:** 20h

- [ ] **7.2.2** SOC2 Type II audit
  - 6-month observation period
  - External auditor
  - **Estimate:** External ($$)

- [ ] **7.2.3** GDPR compliance
  - Data processing agreements
  - Right to deletion
  - Data export
  - **Deliverable:** GDPR documentation
  - **Estimate:** 8h

- [ ] **7.2.4** Privacy policy & ToS
  - Legal review
  - **Deliverable:** Legal docs
  - **Estimate:** 4h + legal

### Epic 7 Total: ~38h + external costs

---

## Summary (Revised)

| Epic | Priority | Target | Estimate | Dependencies |
|------|----------|--------|----------|--------------|
| **E0: Business Foundation** | 🔴 CRITICAL | Feb-Mar | 37h | None |
| **E1: API Foundation** | 🔴 HIGH | Feb-May | 88h | E0 (50%) |
| **E2: Dashboard** | 🟡 MED | Apr-Jul | 55h | E1 (50%) |
| **E3: Integrations** | 🟡 MED | Jun-Aug | 35h | E1 (100%) |
| **E4: Enterprise** | 🟡 MED | Aug-Oct | 50h | E1, E2 (70%) |
| **E5: Team Features** | 🟡 MED | Jun-Aug | 34h | E1 (100%) |
| **E6: Self-Hosted** | 🔵 LOW | 2027 | 45h | E1, E2, E4 |
| **E7: Compliance** | 🟡 MED | Aug+ | 20h | E1 |

**Total Estimate:** ~364h over 8 months
**Cut from scope:** Slack (~11h), JetBrains (~14h), GraphQL (~3h), Knowledge Base (~16h) = 44h saved

---

## Current Sprint

### Sprint 1: Business Foundation (Feb 9-23, 2026)

**Goal:** Revenue infrastructure + API design

| Task | Status | Assignee |
|------|--------|----------|
| 0.1.1 Set up Stripe account | 🟡 TODO | Jo |
| 0.3.1 Set up PostHog/Mixpanel | 🟡 TODO | Milo |
| 0.4.1 Landing page refresh | 🟡 TODO | Milo |
| 1.0.3 Multi-tenancy security design | ✅ DONE | Milo |
| 1.1.1 Design REST API schema | ✅ DONE | Milo |
| 1.2.1 Set up API project | ✅ DONE | Milo |
| 1.2.4 Implement auth | ✅ DONE | Milo |
| 2.1.1 Create dashboard app | ✅ DONE | Milo |
| 2.1.2 Set up authentication UI | ✅ DONE | Milo |
| 2.2.1 Dashboard home | ✅ DONE | Milo |
| 2.2.2 Projects list & management | ✅ DONE | Milo |
| 2.2.4 API keys management | ✅ DONE | Milo |
| 2.2.5 Usage & billing page | ✅ DONE | Milo |

**Sprint Capacity:** 30h
**Sprint Progress:** ~45h completed (ahead of schedule!)
**Sprint Goal:** ~~Stripe ready, API spec complete, analytics tracking~~ API + Dashboard MVP

---

## How to Use This Document

1. **Pick a task** from Current Sprint
2. **Update status** as you work (🟡 TODO → 🔵 IN PROGRESS → ✅ DONE)
3. **Log blockers** in the task notes
4. **Move completed tasks** to Done section at bottom
5. **Plan next sprint** when current is ~80% done

---

## Done

### 2026-02-09

**E1: API Foundation**
- ✅ 1.0.3 Multi-tenancy security design (docs/ARCHITECTURE.md)
- ✅ 1.1.1 Design REST API schema (api/openapi.yaml)
- ✅ 1.2.1 Set up API project (apps/api with Hono.js)
- ✅ 1.2.2 Set up PostgreSQL (Drizzle ORM schema)
- ✅ 1.2.4 Implement auth (API key middleware)
- ✅ 1.2.5 Implement rate limiting (Upstash Redis)
- ✅ 1.3.1-1.3.5 All API endpoints (context, projects, index, symbols, graph, usage)

**E2: Dashboard**
- ✅ 2.1.1 Create dashboard app (Next.js 15 + React 19)
- ✅ 2.1.2 Set up authentication UI (Clerk v5)
- ✅ 2.2.1 Dashboard home
- ✅ 2.2.2 Projects list & management
- ✅ 2.2.4 API keys management
- ✅ 2.2.5 Usage & billing page

**Documentation**
- ✅ ENTERPRISE_VISION.md
- ✅ EPICS.md
- ✅ REVIEW.md
- ✅ docs/ARCHITECTURE.md

---

*Last Updated: 2026-02-09 22:20*
*Owner: Milo 🦊*
*Status: REVISED — Consolidated with ENTERPRISE_VISION.md*
