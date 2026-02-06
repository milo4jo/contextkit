# ContextKit Roadmap 2026

> From v0.5 to v1.0 — Becoming the Context Layer for AI Coding

## Vision

**ContextKit is the context layer that makes any AI coding tool better.**

Not an IDE. Not an agent. The missing piece that connects your codebase to AI — regardless of which AI you use.

---

## Current State (v0.5.5)

### ✅ Done
- **Core CLI:** init, source, index, select, watch, cache
- **Semantic Search:** Local embeddings, cosine similarity
- **AST-Aware Chunking:** TypeScript/JavaScript, Python, Go, Rust
- **Markdown Parser:** Structure-aware for .md, .mdx, .markdown, .qmd
- **Repo Map Mode:** `--mode map` for signatures only (like Aider)
- **Symbol Search:** Find code by name with `contextkit symbol`
- **Call Graph:** Show callers/callees with `contextkit graph`
- **Import Graph:** Boost files that import selected code
- **Multi-Format Output:** markdown, xml, json, plain
- **MCP Server:** Claude Desktop integration
- **Query Caching:** Instant repeat queries
- **Incremental Indexing:** Only re-index changed files
- **Documentation:** Getting started, MCP setup, examples

### 📊 Metrics
- 223 tests passing
- ~130 npm downloads/week
- Local-first, no API keys needed

---

## Phase 1: Structure-Aware (v0.6) — Target: Feb 2026

**Goal:** Understand code STRUCTURE, not just content. Match Aider's repo map quality.

### Features

#### 1. Repo Map Mode ✅ DONE (v0.5.4)
```bash
# Show signatures only (like Aider)
contextkit select "auth system" --mode map

# Output:
📄 src/auth/middleware.ts
│ export function authMiddleware(req, res, next): void
│ export function validateToken(token: string): User | null

📄 src/auth/jwt.ts
│ export class JWTService
│   sign(payload: object): string
│   verify(token: string): object
```

**Why:** LLMs need structure to understand large codebases. Full code is expensive and often unnecessary.

#### 2. Tree-sitter Integration ✅ DONE (v0.5.2)
- Universal AST parsing via web-tree-sitter (WASM)
- Extract: functions, classes, methods, types
- Language-agnostic chunking

**Supported Languages:**
- ✅ TypeScript/JavaScript (acorn)
- ✅ Python (tree-sitter)
- ✅ Go (tree-sitter)
- ✅ Rust (tree-sitter)
- ✅ Markdown (.md, .mdx, .qmd)

#### 3. Call Graph Analysis ✅ DONE (v0.5.5)
```bash
contextkit graph "handlePayment"

# Output:
🎯 Call graph for: handlePayment
📥 Callers (2):
   ← processOrder (src/orders/service.ts:45)
   ← checkout (src/cart/checkout.ts:89)
📤 Calls (3):
   → validateCard (src/payments/validation.ts)
   → chargeCard (src/payments/stripe.ts)
   → sendReceipt (src/notifications/email.ts)
```
- Find what calls a function (callers)
- Find what a function calls (callees)
- Multi-language support

#### 4. Symbol Search ✅ DONE (v0.5.5)
```bash
contextkit symbol "UserService"

# Output:
📄 src/services/user.ts
│ ◆ UserService (line 12)
│   export class UserService
```
- Find by name, not just content similarity
- Exact and fuzzy matching
- Type icons (𝑓 function, ◆ class, ◈ interface, ⊤ type)

### Success Criteria
- [x] 5 languages supported (TS, JS, Python, Go, Rust) ✅
- [x] Map mode produces useful signatures ✅
- [x] Call graph works for 4 languages ✅
- [x] Symbol search implemented ✅
- [ ] 10% faster than v0.5 on large repos

---

## Phase 2: Smart Context (v0.7) — Target: Mar 2026

**Goal:** Context that adapts to the task.

### Features

#### 1. Dynamic Budget
- Auto-expand for "explain codebase" queries
- Auto-contract when focused on specific files
- Learn optimal budget from usage patterns

#### 2. Context Recipes
```bash
contextkit recipe api-endpoints    # Find all API routes
contextkit recipe auth-flow        # Trace authentication
contextkit recipe database-schema  # Find models/migrations
contextkit recipe test-coverage    # Find tests for a module
```

Pre-built queries for common tasks.

#### 3. Codebase Overview
```bash
contextkit overview
# Generates: architecture summary, main modules, entry points
```

Auto-discover project structure without a query.

#### 4. Smart Follow-up
```bash
contextkit select "payment processing"
# ContextKit remembers context

contextkit followup "how does refund work?"
# Builds on previous context
```

### Success Criteria
- [ ] 5+ recipes that users actually use
- [ ] Overview mode works for 3 project types
- [ ] Follow-up reduces repeat work by 50%

---

## Phase 3: Integration (v0.8) — Target: Apr 2026

**Goal:** Use ContextKit anywhere — IDE, terminal, browser.

### Features

#### 1. VS Code Extension
- **Sidebar:** Index status, recent queries
- **Command Palette:** "ContextKit: Select Context"
- **Right-click:** "Find Related Context"
- **Inline:** Hover for symbol context

#### 2. Clipboard Integration
```bash
contextkit select "query" --clipboard
# macOS: pbcopy
# Linux: xclip
# Windows: clip
```

One command to clipboard.

#### 3. GitHub Action
```yaml
- uses: milo4jo/contextkit-action@v1
  with:
    query: "changes in this PR"
    output: pr-comment
```

Auto-comment relevant context on PRs.

#### 4. Browser Extension
- Paste context into Claude.ai, ChatGPT, etc.
- One-click from VS Code to browser

### Success Criteria
- [ ] VS Code extension with 100+ installs
- [ ] GitHub Action used in 10+ repos
- [ ] Browser extension works with 3+ AI chat UIs

---

## Phase 4: Production Ready (v1.0) — Target: May 2026

**Goal:** Stable, trusted, documented.

### Requirements

#### Stability
- [ ] No breaking changes from v1.0 onward
- [ ] Semantic versioning commitment
- [ ] 99.9% test pass rate
- [ ] Zero known data loss bugs

#### Performance
- [ ] Index 50k files in <5 minutes
- [ ] Select context in <500ms
- [ ] Memory usage <500MB for 100k file repos

#### Documentation
- [ ] Complete API reference
- [ ] Video tutorials
- [ ] Case studies (3+)
- [ ] Troubleshooting guide

#### Enterprise Ready
- [ ] Self-hosted deployment guide
- [ ] Audit logging
- [ ] SSO support (optional)
- [ ] Enterprise support tier

### Success Criteria
- [ ] 1,500 GitHub stars
- [ ] 15k npm downloads/month
- [ ] 5+ case studies published
- [ ] $500 MRR (if monetized)

---

## Backlog (Post-1.0)

- **Cursor Plugin:** Native Cursor integration
- **Neovim Plugin:** For the terminal enthusiasts
- **Cloud Sync:** Optional sync across machines
- **Team Patterns:** Learn from team's coding style
- **Custom Scorers:** Plugin system for scoring logic
- **Streaming Output:** For large context selections
- **Multi-repo:** Index multiple related repos

---

## Technical Decisions

### Confirmed
- **Local-first:** All processing on user's machine
- **SQLite:** Simple, portable, fast enough
- **Tree-sitter:** For multi-language AST
- **MCP:** For AI assistant integration

### Open
- **Hosted API?** Maybe for v1.1+
- **Pro tier?** Features TBD
- **Telemetry?** Opt-in analytics

---

## Non-Goals

Things we explicitly WON'T do:

1. **Become an IDE** — Use with your existing tools
2. **Become an agent** — We find context, you decide what to do
3. **Require cloud** — Works fully offline
4. **Framework complexity** — Stay simple, stay focused

---

## Timeline

```
Feb 2026  ━━━━━━━━━━  v0.6 Structure-Aware
                      ├── Tree-sitter
                      ├── Repo Map mode
                      └── Python/Go support

Mar 2026  ━━━━━━━━━━  v0.7 Smart Context
                      ├── Dynamic budget
                      ├── Recipes
                      └── Codebase overview

Apr 2026  ━━━━━━━━━━  v0.8 Integration
                      ├── VS Code extension
                      ├── GitHub Action
                      └── Browser extension

May 2026  ━━━━━━━━━━  v1.0 Production Ready
                      ├── Stability
                      ├── Performance
                      └── Documentation
```

---

*Last updated: 2026-02-06*
*Owner: Milo 🦊*
