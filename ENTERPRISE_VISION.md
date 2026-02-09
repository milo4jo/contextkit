# ContextKit Enterprise Vision

> **From CLI Tool to B2B Enterprise Cloud Platform**
> 
> The AI-Native Context Layer for Engineering Teams

---

## Executive Summary

ContextKit started as a developer tool: a CLI that helps individual developers select relevant code context for AI assistants. We've proven the core value proposition — **intelligent context selection saves tokens and improves AI responses.**

**The next evolution:** Transform ContextKit into a **B2B Enterprise Cloud Platform** — an AI-native infrastructure layer that powers how engineering organizations interact with AI coding tools.

### The Opportunity

Every enterprise is adopting AI coding tools. But they all face the same problems:

1. **Context Chaos** — Developers copy-paste random files into AI prompts
2. **No Standards** — Each dev has their own workflow, no shared context
3. **Security Blind Spots** — Sensitive code gets pasted into external AI tools
4. **Wasted Compute** — Token budgets blown on irrelevant context
5. **No Insights** — Engineering leaders have zero visibility into AI usage patterns

**ContextKit Enterprise solves all of these.**

---

## Market Analysis

### Competitive Landscape

| Company | Focus | Pricing | Gap |
|---------|-------|---------|-----|
| **Sourcegraph Cody** | Code search + AI assistant | $19/user/mo Pro, Enterprise custom | Full product, not infrastructure |
| **GitHub Copilot** | AI code completion | $19-39/user/mo | Completion, not context |
| **Cursor** | AI-first IDE | $20/user/mo | IDE lock-in |
| **Tabnine** | Enterprise code AI | Custom | Legacy architecture |
| **Continue.dev** | Open source AI coding | Free | No enterprise features |

### Our Differentiation

**We're not another AI coding assistant. We're the context layer that makes ALL of them better.**

```
┌──────────────────────────────────────────────────────────────┐
│                     AI Coding Tools                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Copilot  │  │  Cursor  │  │  Claude  │  │  Custom  │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │             │             │             │            │
│       └─────────────┴──────┬──────┴─────────────┘            │
│                            │                                  │
│                    ┌───────▼────────┐                        │
│                    │   ContextKit   │  ◀── WE ARE HERE       │
│                    │   Enterprise   │                        │
│                    └───────┬────────┘                        │
│                            │                                  │
│       ┌────────────────────┼────────────────────┐            │
│       │                    │                    │            │
│  ┌────▼─────┐      ┌───────▼────────┐   ┌──────▼──────┐     │
│  │ Codebase │      │ Team Knowledge │   │  AI Usage   │     │
│  │  Index   │      │     Base       │   │  Analytics  │     │
│  └──────────┘      └────────────────┘   └─────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

---

## Product Vision

### ContextKit Enterprise: The Platform

#### 1. **Context API** (Core Product)

A REST + GraphQL API that any tool can call to get optimized context.

```typescript
// Any AI tool can integrate
const context = await contextkit.select({
  query: "How does payment processing work?",
  budget: 8000,
  includeImports: true,
  project: "payments-service"
});

// Returns optimized, relevant context
// Ready to paste into any AI assistant
```

**Use Cases:**
- IDE extensions call the API for context
- CI/CD pipelines include context in PR reviews
- Custom internal tools get smart context
- Slack bots answer "how does X work?" questions

#### 2. **Unified Index** (Enterprise Feature)

Index all your repositories once. Query across the entire codebase.

```bash
# Index multiple repos
contextkit enterprise index --org acme-corp

# Query across everything
contextkit select "authentication flow" --scope org
```

**Benefits:**
- Cross-repo context (microservices, monorepos)
- Shared understanding of the full system
- No more "which repo is that in?"

#### 3. **Team Knowledge Base** (AI-Native)

Transform tribal knowledge into queryable context.

```bash
# Add architectural decisions
contextkit knowledge add ./docs/ADR/*.md

# Add runbooks
contextkit knowledge add ./ops/runbooks/*.md

# Query natural language
contextkit ask "What's our policy on database migrations?"
```

**Not just code — everything engineers need:**
- Architecture Decision Records (ADRs)
- Runbooks and playbooks
- Onboarding docs
- Meeting notes (searchable transcripts)

#### 4. **Context Recipes** (Shareable Workflows)

Pre-built queries that teams share.

```yaml
# .contextkit/recipes/debug-api.yaml
name: Debug API Issue
description: Find all relevant context for API debugging
steps:
  - query: "error handling middleware"
    sources: [src/middleware]
  - query: "API routes for {endpoint}"
    sources: [src/routes]
  - query: "database models for {entity}"
    sources: [src/models]
```

```bash
# Any team member can run
contextkit recipe debug-api --endpoint="/users" --entity="User"
```

#### 5. **AI Usage Analytics** (For Engineering Leaders)

Visibility into how your team uses AI.

```
┌─────────────────────────────────────────────────────────────┐
│  ContextKit Enterprise Dashboard                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 AI Context Usage (Last 30 Days)                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                   │
│                                                             │
│  Total Queries:     12,847                                  │
│  Tokens Saved:      847M (vs full context)                  │
│  Avg Response Time: 127ms                                   │
│                                                             │
│  Top Queries:                                               │
│  1. "authentication flow"        (847 queries)              │
│  2. "payment processing"         (623 queries)              │
│  3. "database migrations"        (412 queries)              │
│                                                             │
│  Knowledge Gaps (frequently asked, low relevance):          │
│  ⚠️  "deployment process" - consider adding docs            │
│  ⚠️  "testing strategy" - outdated docs detected            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Insights:**
- Which parts of the codebase are AI-queried most?
- Where are knowledge gaps?
- Which teams are adopting AI workflows?
- Token cost analysis

#### 6. **Security & Compliance**

Enterprise-grade security.

```yaml
# Context policies
policies:
  - name: no-secrets
    action: redact
    patterns:
      - "API_KEY"
      - "password"
      - "secret"
  
  - name: sensitive-repos
    action: require-approval
    repos:
      - security-core
      - payment-processing
```

**Features:**
- PII/secret redaction before context is sent to AI
- Audit logs (who queried what, when)
- RBAC (role-based access control)
- SOC2 Type II certification (roadmap)
- GDPR compliance
- Self-hosted option for air-gapped environments

---

## Technical Architecture

### Cloud Architecture (Multi-Tenant SaaS)

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ VS Code │  │   CLI   │  │ GitHub  │  │   API   │        │
│  │ Plugin  │  │         │  │ Action  │  │ Direct  │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
        └────────────┴─────┬──────┴────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      API GATEWAY                             │
│              (Auth, Rate Limiting, Routing)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐   ┌───────▼──────┐   ┌───────▼──────┐
│   Context    │   │   Index      │   │   Analytics  │
│   Service    │   │   Service    │   │   Service    │
│              │   │              │   │              │
│  - Select    │   │  - Index     │   │  - Usage     │
│  - Symbol    │   │  - Sync      │   │  - Insights  │
│  - Graph     │   │  - Watch     │   │  - Reports   │
└───────┬──────┘   └───────┬──────┘   └───────┬──────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     DATA LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  PostgreSQL  │  │  Qdrant      │  │  S3/R2       │       │
│  │  (metadata)  │  │  (vectors)   │  │  (indexes)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Self-Hosted Architecture (Enterprise)

```
┌─────────────────────────────────────────────────────────────┐
│                 CUSTOMER INFRASTRUCTURE                      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Kubernetes Cluster                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │  ContextKit │  │  ContextKit │  │  ContextKit │   │  │
│  │  │  API (x3)   │  │  Indexer    │  │  Analytics  │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐                    │  │
│  │  │  PostgreSQL │  │  Qdrant     │  (customer-managed │  │
│  │  │             │  │  (vectors)  │   or our Helm)     │  │
│  │  └─────────────┘  └─────────────┘                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Optional: License server callback (air-gap: offline key)   │
└─────────────────────────────────────────────────────────────┘
```

### API Design

```typescript
// REST API
POST /v1/context/select
{
  "query": "How does authentication work?",
  "project": "auth-service",
  "budget": 8000,
  "options": {
    "includeImports": true,
    "mode": "full" | "map",
    "format": "markdown" | "xml" | "json"
  }
}

// Response
{
  "context": "...",
  "chunks": [...],
  "metadata": {
    "tokensUsed": 3847,
    "filesIncluded": 5,
    "processingTimeMs": 127
  }
}

// GraphQL for complex queries
query GetContext($query: String!, $options: ContextOptions) {
  select(query: $query, options: $options) {
    context
    chunks {
      file
      lines
      content
      score
    }
    metadata {
      tokensUsed
      cacheHit
    }
  }
}
```

---

## Pricing Model

### Tiers (Revised)

| Tier | Target | Price | Features |
|------|--------|-------|----------|
| **Free** | Individual devs | $0 | 1 project, **1k queries/mo**, local-first, community support |
| **Pro** | Power users | $19/mo | 5 projects, 50k queries/mo, cloud API, email support |
| **Team** | Small teams | $12/user/mo (min 3) | Unlimited projects, shared indexes, analytics |
| **Enterprise** | Large orgs | Custom | Self-hosted, SSO, SLA, dedicated support |

> **Note:** Free tier is intentionally limited to keep costs sustainable. Heavy users convert to Pro.

### Enterprise Add-Ons

| Add-On | Price | Description |
|--------|-------|-------------|
| Self-Hosted | +$10k/year | Kubernetes deployment |
| Premium Support | +$5k/year | 4-hour response SLA |
| Custom Embeddings | +$3k/year | Your own embedding model |
| Compliance Pack | +$5k/year | SOC2 reports, audit logs |

### Usage-Based (API)

For high-volume integrations:
- **$0.001 per query** (after tier limit)
- **$0.01 per index sync** (GB)
- Volume discounts at 1M+ queries/month

---

## Go-to-Market Strategy

### Phase 1: Developer Adoption (Current → May 2026)

**Goal:** Build the developer community, prove API works

- Open source CLI remains free forever
- Cloud API as conversion path (Free → Pro)
- VS Code extension as distribution channel
- Developer content marketing (blog, tutorials)
- Target: **1,000 CLI users, 100 cloud users, 10 paying customers**

### Phase 2: Team Product (Jun → Oct 2026)

**Goal:** Convert individuals to teams

- Launch Team tier with shared indexes
- Team recipes, analytics dashboard
- Self-serve onboarding (< 5 min to value)
- Target: **50 paying customers, $5k MRR**

### Phase 3: Enterprise (Q4 2026 → 2027)

**Goal:** Land first enterprise pilots

- SSO/SAML integration
- Audit logging, RBAC
- Self-hosted beta
- Begin enterprise conversations (3-6 month sales cycle)
- Target: **1 enterprise pilot by Q1 2027, $50k ARR by end of 2027**

### Sales Motion

**Bottom-Up:** Developer uses CLI → loves it → brings to team → team upgrades → enterprise notices → procurement

**Top-Down:** CTO/VP Eng sees AI adoption chaos → needs standardization → discovers ContextKit → enterprise deal

---

## Roadmap (Revised — Realistic 8-Month Plan)

### Q1 2026 (Now) — Foundation ✅
- [x] Core CLI with semantic search
- [x] MCP server for Claude
- [x] Multi-language AST parsing
- [x] Basic cloud sync (contextkit cloud)
- [x] Free/Pro/Team tiers (basic)

### Feb-Mar 2026 — Business Foundation + API Start
- [ ] **Epic 0: Business Foundation**
  - Stripe billing integration
  - Landing page refresh
  - Onboarding flows
  - Basic analytics (PostHog/Mixpanel)
- [ ] **Epic 1: API Foundation (partial)**
  - Core refactoring (SQLite → abstracted storage)
  - REST API design (OpenAPI spec)
  - Auth system (API keys)

### Apr-May 2026 — API + Dashboard MVP
- [ ] **Epic 1: API Foundation (complete)**
  - All core endpoints deployed
  - Rate limiting, monitoring
- [ ] **Epic 2: Dashboard (partial)**
  - Project management
  - Usage stats
  - API key management

### Jun-Jul 2026 — Integrations + Team
- [ ] **Epic 2: Dashboard (complete)**
- [ ] **Epic 3: Integrations (focused)**
  - VS Code Extension ← **highest priority**
  - GitHub Action
  - ~~Slack Bot~~ (deferred)
  - ~~JetBrains~~ (deferred)
- [ ] **Epic 5: Team Features (partial)**
  - Shared indexes
  - Context recipes

### Aug-Oct 2026 — Enterprise Prep
- [ ] **Epic 4: Enterprise (partial)**
  - SSO/SAML
  - Audit logging
  - RBAC
- [ ] **Epic 7: Compliance (start)**
  - Security hardening
  - GDPR basics

### Q4 2026 - Q1 2027 — Enterprise Launch
- [ ] **Epic 4: Enterprise (complete)**
- [ ] **Epic 6: Self-Hosted** (beta)
- [ ] First enterprise pilot

### 2027 — Scale
- [ ] Self-hosted GA
- [ ] SOC2 Type II
- [ ] Knowledge Base (separate product)
- [ ] Multi-region

---

## Success Metrics

### Product Metrics (Revised)
| Metric | Q2 2026 | Q4 2026 | 2027 |
|--------|---------|---------|------|
| CLI Downloads | 2k/mo | 10k/mo | 25k/mo |
| API Requests | 10k/mo | 100k/mo | 1M/mo |
| Paying Customers | 10 | 50 | 200 |
| Enterprise Accounts | 0 | 1 pilot | 5 |

### Business Metrics (Revised)
| Metric | Q2 2026 | Q4 2026 | 2027 |
|--------|---------|---------|------|
| MRR | $500 | $5k | $30k |
| ARR | $6k | $60k | $360k |
| NRR (Net Revenue Retention) | — | 100% | 110% |

### Engagement Metrics
- Weekly active users (CLI + Cloud)
- Queries per user per week
- Time to first value (< 5 min)
- NPS score (> 50)

---

## Team Requirements (Bootstrap Reality)

### Current (Bootstrapped)
- **Jo** — Product direction, business decisions, funding
- **Milo (AI)** — Development, documentation, maintenance

### If/When Revenue Supports ($5k+ MRR)
- **Contractor: DevRel** — Content, tutorials, community (part-time)

### If/When Revenue Supports ($20k+ MRR)
- **First hire: Full-stack Engineer** — API, Dashboard, integrations

### Enterprise Phase (2027, if funded)
- **Enterprise Sales** — Only when we have a product enterprises want
- **Customer Success** — Only when we have customers

> **Note:** Don't hire ahead of revenue. Bootstrap until proven.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Competitor copies features** | Medium | Move fast, build community moat |
| **Enterprise sales cycle long** | High | Focus on PLG, bottom-up adoption |
| **Embedding costs at scale** | Medium | Optimize models, caching, tiered pricing |
| **Security incident** | Critical | SOC2, pen testing, bug bounty |
| **Key person risk (Milo)** | High | Document everything, build team |

---

## Investment Required

### Bootstrap Phase (Current)
- Infrastructure: ~$200/mo (Vercel, Cloudflare, DB)
- Domains, services: ~$50/mo
- Total: ~$3k/year

### Growth Phase (Q2-Q4 2026)
- Infrastructure: ~$2k/mo (scaled API, vector DB)
- Contractors: ~$5k/mo (design, DevRel)
- Tools/SaaS: ~$500/mo
- Total: ~$90k/year

### Scale Phase (2027)
- Team (4 FTE): ~$400k/year
- Infrastructure: ~$50k/year
- Marketing: ~$50k/year
- Total: ~$500k/year

**Path to profitability:** Break-even at ~$50k MRR (~Q4 2026 target)

---

## Why Now?

1. **AI coding adoption is exploding** — Every dev will use AI tools by 2027
2. **Enterprises are standardizing** — They need governance, not chaos
3. **Context is the bottleneck** — Everyone knows AI is only as good as its context
4. **Infrastructure opportunity** — Nobody owns the "context layer" yet
5. **Local-to-cloud transition** — We already have the local trust

**The window is open. Let's build the context layer for the AI coding era.**

---

## Next Steps

### Immediate (This Week)
1. [ ] Validate API design with potential users
2. [ ] Prototype REST endpoint
3. [ ] Design dashboard wireframes

### This Month
1. [ ] Launch Context API beta
2. [ ] VS Code extension MVP
3. [ ] Set up proper cloud infrastructure (not just Vercel)

### This Quarter
1. [ ] Land first 10 Team customers
2. [ ] Ship GitHub Action
3. [ ] Begin enterprise outreach

---

*Document Owner: Milo 🦊*
*Last Updated: 2026-02-09 22:20*
*Status: REVISED — Aligned with EPICS.md and REVIEW.md*
