# ContextKit Vision

> **"Vercel for AI Context"**
> The platform that connects your code to AI — everywhere.

---

## The Insight

Every AI coding tool has the same problem: **context**.

- Cursor, Copilot, Claude — they're all brilliant, but blind without the right context
- Today, developers manually copy-paste code, hoping they picked the right files
- Tomorrow, context should flow automatically from codebase to AI

**ContextKit is the bridge.**

---

## The Depth Model (Vercel Comparison)

| Vercel Layer | ContextKit Equivalent |
|--------------|----------------------|
| `vercel deploy` | `contextkit index` — Index your codebase |
| Serverless Functions | MCP Server — AI tools call your context |
| Edge Network | Local-first + Cloud sync — Fast everywhere |
| Analytics | Query analytics — What does your team ask? |
| Preview Deployments | Branch-aware indexes — Context per PR |
| Team Collaboration | Shared context — Team knowledge, not just code |
| Integrations | IDE plugins, CI/CD, Slack bots |
| Enterprise | SSO, audit logs, on-prem, compliance |

---

## Product Layers

### Layer 1: CLI (Today) ✅
The foundation. Works locally, no account needed.

```bash
contextkit init
contextkit index
contextkit select "how does auth work"
```

**Status:** Shipped (v0.5.6)

### Layer 2: IDE Integration (Next)
Right-click → "Find related code" → Context in your editor.

- VS Code extension
- Cursor integration
- JetBrains plugin
- Vim/Neovim (LSP)

**Impact:** 10x more users (devs don't leave their IDE)

### Layer 3: MCP Ecosystem (In Progress)
AI assistants that automatically fetch context.

- Claude Desktop integration ✅
- Cursor MCP support
- Custom MCP tools (search, explain, refactor)

**Impact:** AI becomes truly useful for codebases

### Layer 4: Cloud Sync (Planned)
Your index, everywhere.

```bash
contextkit login
contextkit sync
# Index available on any machine
```

- Team indexes (shared knowledge)
- Branch-aware (different context per PR)
- Incremental sync (only changes)

**Impact:** Teams, not just individuals

### Layer 5: Analytics & Insights
What is your team asking? What code matters most?

- Query dashboard
- "Hot" files (frequently needed context)
- Knowledge gaps (questions without good answers)
- Onboarding insights (what do new devs ask?)

**Impact:** Engineering intelligence

### Layer 6: Custom Intelligence
Your codebase, your embeddings.

- Fine-tuned models on your code patterns
- Custom chunk strategies per language/framework
- Domain-specific parsing (React components, API routes, etc.)

**Impact:** Best-in-class accuracy

### Layer 7: Enterprise
Security, compliance, scale.

- SSO (Okta, Azure AD)
- Audit logs
- On-prem / VPC deployment
- SOC 2, GDPR compliance
- Role-based access

**Impact:** Revenue, B2B contracts

---

## Competitive Moat

1. **Local-first** — No data leaves your machine (unless you want sync)
2. **Language-agnostic** — AST parsing for TS, Python, Go, Rust, more coming
3. **MCP-native** — Built for the AI tool era
4. **Open core** — CLI is MIT, cloud adds team features

---

## Revenue Model

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | CLI, local index, MCP server |
| **Pro** | $15/mo | Cloud sync, 5 projects, analytics |
| **Team** | $30/user/mo | Shared indexes, team analytics, priority support |
| **Enterprise** | Custom | SSO, audit logs, on-prem, SLA |

---

## 12-Month Roadmap

### Q1 2026 (Now → Apr)
- [x] CLI v0.5.x stable
- [ ] VS Code extension (launch)
- [ ] MCP improvements
- [ ] Landing page + docs
- [ ] Content marketing push

### Q2 2026 (Apr → Jul)
- [ ] Cloud sync MVP
- [ ] Pro tier launch ($15/mo)
- [ ] Team features (shared indexes)
- [ ] JetBrains plugin

### Q3 2026 (Jul → Oct)
- [ ] Analytics dashboard
- [ ] Custom embeddings
- [ ] Team tier launch ($30/user)
- [ ] GitHub/GitLab integration

### Q4 2026 (Oct → Jan 2027)
- [ ] Enterprise features
- [ ] On-prem deployment
- [ ] First enterprise customers
- [ ] Series A? 🤔

---

## Success Metrics

| Metric | 3 Months | 6 Months | 12 Months |
|--------|----------|----------|-----------|
| npm downloads/mo | 5,000 | 20,000 | 100,000 |
| GitHub stars | 1,000 | 5,000 | 15,000 |
| VS Code installs | - | 10,000 | 50,000 |
| Paying customers | 10 | 100 | 500 |
| MRR | $150 | $2,000 | $15,000 |

---

## Why This Will Work

1. **Timing** — AI coding tools are exploding, context is the bottleneck
2. **Pain is real** — Every dev knows the "paste everything" problem
3. **Open source wedge** — Free CLI builds trust, cloud adds value
4. **MCP adoption** — We're early to the protocol that matters
5. **Vercel playbook** — Proven path: free tool → paid cloud → enterprise

---

## Immediate Next Steps

1. **VS Code Extension** — Biggest reach opportunity
2. **Landing page redesign** — Tell the vision story
3. **Content blitz** — Establish thought leadership
4. **MCP polish** — Make the Claude integration flawless

---

*Last updated: 2026-02-08 by Milo 🦊*
