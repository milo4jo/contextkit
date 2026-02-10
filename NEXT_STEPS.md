# ContextKit — Nächste Schritte (Enterprise First)

> **Strategie:** Features > Marketing. Produkt richtig gut machen, dann vermarkten.
> **Letzte Aktualisierung:** 2026-02-10

---

## Status Quo

### ✅ Bereits erledigt
- API Foundation (Hono.js, alle Endpoints)
- Dashboard MVP (Next.js 15, Clerk Auth, Projects, API Keys)
- Architektur & Multi-Tenancy Design
- OpenAPI Spec
- CLI v0.6.3 mit Cloud Sync, Doctor, Symbol Analysis
- **✅ API Deployed** — https://contextkit-api.milo4jo.workers.dev
- **✅ Neon PostgreSQL** — `contextkit-prod` (Frankfurt)
- **✅ Qdrant Cloud** — `contextkit-prod` (Frankfurt)
- **✅ Upstash Redis** — `contextkit-prod` (Frankfurt)
- **✅ Cloudflare KV** — `CACHE` namespace
- **✅ Clerk Auth** — ContextKit app mit GitHub/Google OAuth
- **✅ Dashboard E2E Tested** — Alle 5 Pages funktionieren lokal

### 🔴 Kritische Blocker
| Blocker | Wer | Warum kritisch |
|---------|-----|----------------|
| **Stripe Setup** | Jo | Keine Monetarisierung ohne Billing |
| **Vercel deploy (Dashboard)** | Milo | Dashboard muss live sein |
| **Clerk Production** | Milo | Production Keys für Vercel nötig |

---

## Phase 1: Go Live (Diese Woche)

**Ziel:** API + Dashboard deployed, erste User können sich anmelden

### Tag 1-2: Infrastructure ✅ DONE
- [x] **Neon DB** — PostgreSQL in Frankfurt
- [x] **Qdrant Cloud** — Vector DB in Frankfurt
- [x] **Upstash Redis** — Rate Limiting in Frankfurt
- [x] **Cloudflare Workers** — API deployed (192KB bundle)
- [x] **Clerk Auth** — GitHub/Google OAuth working
- [x] **Dashboard E2E** — Alle Pages getestet (Dashboard, Projects, API Keys, Usage, Billing)

### Tag 3: Dashboard Deployment
- [ ] **Clerk Production Keys** — Production instance in Clerk erstellen
- [ ] **Vercel Project** — Dashboard deployen
- [ ] **DNS** — app.contextkit.dev → Vercel

### Tag 4-5: Stripe Integration
- [ ] **Stripe Account** (Jo) — Products erstellen:
  - Free: 1k queries/mo
  - Pro: $19/mo, 50k queries/mo
  - Team: $12/user/mo, 200k queries/mo
- [ ] **Checkout Flow** — Dashboard → Stripe → Webhook → DB update
- [ ] **Usage Enforcement** — Limits durchsetzen

### Tag 6-7: CLI → Cloud Connection
- [ ] `contextkit cloud login` — Auth flow mit Dashboard
- [ ] `contextkit cloud sync` — Index zu Cloud hochladen
- [ ] `contextkit query --cloud` — Cloud API nutzen

---

## Phase 2: Core Features (Feb 17-28)

**Ziel:** ContextKit wirklich nützlich machen

### 2.1 Bessere Context Selection
- [ ] **Reranking** — Ergebnisse mit Cross-Encoder verbessern
- [ ] **Dependency Graph** — "Include imports" automatisch
- [ ] **Smart Token Budget** — Automatische Chunk-Größen-Optimierung
- [ ] **Multi-File Context** — Zusammenhängende Dateien gruppieren

### 2.2 Developer Experience
- [ ] **`contextkit init` Wizard** — Interaktives Setup
- [ ] **Auto-Detect Config** — Language, Framework erkennen
- [ ] **Progress Indicators** — Schöne Fortschrittsanzeige beim Indexing
- [ ] **Error Recovery** — Graceful handling, klare Fehlermeldungen

### 2.3 Dashboard Features
- [ ] **Project Analytics** — Queries over time, Top queries
- [ ] **Index Health** — Chunk distribution, Coverage
- [ ] **API Playground** — Test queries im Browser
- [ ] **Onboarding Flow** — Schritt-für-Schritt für neue User

---

## Phase 3: VS Code Extension (März)

**Ziel:** ContextKit direkt in der IDE

### 3.1 Core Extension
- [ ] **Sidebar** — Index Status, Recent Queries
- [ ] **Command Palette** — "ContextKit: Select Context"
- [ ] **Right-Click Menu** — "Find Related Context"
- [ ] **Inline Preview** — Hover über Funktion → Related Code

### 3.2 AI Integration
- [ ] **Copilot Chat Integration** — ContextKit als @contextkit Participant
- [ ] **Continue.dev Integration** — Als Context Provider
- [ ] **Cursor Integration** — Als MCP Server

### 3.3 Publish
- [ ] **VS Code Marketplace** — Icons, Screenshots, Demo GIF
- [ ] **Product Hunt** — Launch mit Extension

---

## Phase 4: Team Features (April)

**Ziel:** ContextKit für Teams

### 4.1 Collaboration
- [ ] **Team Members** — Invite, Roles (Admin/Member)
- [ ] **Shared Projects** — Team-weite Indexes
- [ ] **Context Recipes** — Wiederverwendbare Queries

### 4.2 GitHub Integration
- [ ] **Auto-Sync** — Webhook bei Push → Re-Index
- [ ] **Branch Support** — Pro Branch ein Index
- [ ] **PR Context** — GitHub Action für PR Reviews

---

## Phase 5: Enterprise (Q3)

**Ziel:** Enterprise-Kunden gewinnen

- [ ] SSO/SAML
- [ ] Audit Logs
- [ ] RBAC
- [ ] Context Policies (Redaction)
- [ ] SOC2 Type I

---

## Priorisierungs-Matrix

| Feature | User Value | Effort | Priority |
|---------|------------|--------|----------|
| **Stripe + Billing** | 🔴 Kritisch | 8h | 🔴 P0 |
| **Deploy API + Dashboard** | 🔴 Kritisch | 4h | 🔴 P0 |
| **CLI → Cloud Connection** | 🔴 Hoch | 6h | 🔴 P0 |
| **Bessere Context Selection** | 🔴 Hoch | 16h | 🟡 P1 |
| **VS Code Extension** | 🔴 Hoch | 20h | 🟡 P1 |
| **Team Features** | 🟡 Mittel | 24h | 🟢 P2 |
| **Enterprise Features** | 🟡 Mittel | 50h | 🔵 P3 |

---

## Diese Woche: Action Items

### Jo (Blocker)
1. [ ] **Stripe Account erstellen** — stripe.com
2. [ ] **Products anlegen:**
   - Free: 1,000 queries/mo, $0
   - Pro: 50,000 queries/mo, $19/mo
   - Team: 200,000 queries/mo, $12/user/mo
3. [ ] Stripe Keys in 1Password/Keychain

### Milo
1. [ ] Neon DB aufsetzen
2. [ ] Qdrant Cloud aufsetzen
3. [ ] API zu Cloudflare Workers deployen
4. [ ] Dashboard zu Vercel deployen
5. [ ] Stripe Checkout implementieren
6. [ ] CLI Cloud-Login implementieren

---

## Erfolgskriterien

### Phase 1 (Ende Feb)
- [ ] API + Dashboard live
- [ ] Erste 10 Signups
- [ ] 1 zahlender Kunde

### Phase 2 (Ende März)
- [ ] VS Code Extension im Marketplace
- [ ] 100 aktive User
- [ ] $100 MRR

### Phase 3 (Ende April)
- [ ] Team Features live
- [ ] 500 aktive User
- [ ] $500 MRR

### Phase 4 (Ende Q2)
- [ ] Erste Enterprise-Deals
- [ ] $2,000 MRR

---

*"Build something people love, then tell them about it."*
