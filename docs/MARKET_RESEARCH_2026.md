# ContextKit Market Research — February 2026

## Executive Summary

The AI coding assistant market has exploded. Context management is now a **critical differentiator** — tools that provide better context get better results. ContextKit needs to position itself as the **context layer** that enhances any AI tool.

---

## Market Landscape

### Tier 1: Integrated AI IDEs (The Giants)

#### **Cursor** — $400M+ funding, 40k+ enterprise users
- Full IDE with built-in AI
- Uses their own context system (proprietary)
- "Self-driving codebases" — agents that work autonomously
- **Key insight:** Salesforce has 20k engineers using it
- **Pricing:** $20/mo Pro, Enterprise custom

**What they do well:**
- Seamless integration (it IS the IDE)
- Multi-agent workflows
- "Autonomy slider" — control how much AI does

**Gap we can fill:**
- Proprietary, vendor lock-in
- Not usable outside Cursor
- No API for external tools

#### **GitHub Copilot** — Microsoft/OpenAI
- 1M+ paying users
- Integrated into VS Code, JetBrains
- Workspace context feature (recent)

**Gap we can fill:**
- Context selection is basic
- No fine-grained control
- Expensive at scale

---

### Tier 2: AI Coding Agents (Terminal-based)

#### **Aider** — 15B+ tokens/week, Open Source
- Terminal-based pair programming
- **Repo Map** — key innovation
- Works with Claude, GPT-4, DeepSeek, o1, local models
- 100+ languages via tree-sitter

**Their Repo Map approach:**
```
aider/coders/base_coder.py:
│class Coder:
│ @classmethod
│ def create(self, main_model, edit_format, io, ...)
│ def run(self, with_message=None):
```
- Shows class/function signatures, not full code
- Uses graph ranking to select most relevant parts
- Dynamic sizing based on chat context

**What we can learn:**
1. **Signatures > Full Code** — for understanding structure
2. **Graph-based ranking** — dependencies matter
3. **Dynamic budget** — adjust based on task

**Gap we can fill:**
- Aider is a full agent, we're a context tool
- No standalone context selection
- Can't use with other tools (Claude web, ChatGPT, etc.)

---

### Tier 3: Code Review & Understanding

#### **Greptile** — AI Code Review
- Reviews PRs with full codebase context
- **Learning** — adapts to team's style from reactions
- Self-hosted option for enterprise
- "Catches 3x more bugs, merge 4x faster"

**Key insight:** They index the ENTIRE codebase, including PR history and team patterns.

**Gap we can fill:**
- PR-focused, not general purpose
- SaaS only (or expensive self-host)
- Not for individual developers

#### **Continue.dev** — Open Source AI IDE Extension
- VS Code / JetBrains extension
- PR review agents
- Custom agents from markdown prompts

**Gap we can fill:**
- IDE-locked
- No CLI for automation
- No API

---

### Tier 4: Infrastructure & Frameworks

#### **LangChain / LlamaIndex**
- Full frameworks for LLM apps
- RAG pipelines, vector stores
- Very complex, steep learning curve

#### **Vector DBs (Pinecone, Chroma, Weaviate)**
- Just storage + retrieval
- No intelligence in selection
- You build the logic

**Our position:** We're NOT a framework. We're a focused tool that does one thing well.

---

## Key Insights from Research

### 1. **Repo Maps > Semantic Search Alone**
Aider's success shows that understanding **structure** (classes, functions, call signatures) is as important as **content** (actual code). We currently do semantic search on content — we should add structural awareness.

### 2. **Context Should Be Dynamic**
Aider adjusts repo map size based on:
- Current chat context
- Files already in conversation
- Task complexity

We currently use static budget. Should be smarter.

### 3. **Graph Ranking Works**
Both Cursor and Aider use graph-based approaches:
- Dependency graphs (imports/exports)
- Call graphs (who calls what)
- Reference graphs (who uses this symbol)

We have import graph — should expand to call/reference graphs.

### 4. **The "Context Layer" Gap**
Everyone builds context into their tool. Nobody offers a **standalone context layer** that works with ANY tool:
- Claude.ai web
- ChatGPT
- Local Ollama
- VS Code Copilot Chat
- Terminal LLMs
- MCP servers

**This is our opportunity.**

### 5. **Enterprise Wants Control**
Greptile offers self-hosted. Cursor has enterprise tier. Teams want:
- Data stays local
- Custom rules/patterns
- Integration with existing tools
- Audit trail

We're already local-first — emphasize this.

---

## Competitive Positioning

```
                      Integrated        ←→        Composable
                          ↑                            ↑
                          |                            |
     Cursor, Copilot      |                            |  [ContextKit]
     (Full IDEs)          |                            |  (Context Layer)
                          |                            |
                    ──────┼────────────────────────────┼──────
                          |                            |
     Aider, Continue      |                            |  LangChain
     (Agents)             |                            |  (Frameworks)
                          |                            |
                          ↓                            ↓
                      Opinionated      ←→        Flexible
```

**ContextKit's position:** Composable + Opinionated
- Works with any tool (composable)
- Best practices built-in (opinionated)
- Not a framework, not an agent

---

## Feature Gap Analysis

### What We Have ✅
- Semantic search (embeddings)
- Import graph analysis
- AST-aware chunking (TS/JS)
- Multiple output formats
- MCP server
- Query caching
- Local-first architecture

### What We're Missing ❌

#### High Priority
1. **Repo Map / Structure View**
   - Show class/function signatures without full code
   - Tree-sitter for multi-language support
   - "Map" mode vs "Content" mode

2. **Call Graph Analysis**
   - Who calls this function?
   - What does this function call?
   - Helps find related code beyond imports

3. **Dynamic Context Sizing**
   - Adjust budget based on task complexity
   - Expand when no files selected
   - Contract when focused on specific file

4. **Better Language Support**
   - Python (huge market)
   - Go, Rust (growing)
   - Use tree-sitter (universal)

#### Medium Priority
5. **VS Code Extension**
   - Right-click "Find Context"
   - Sidebar with index status
   - Command palette integration

6. **Context Recipes**
   - "Explain this codebase"
   - "Find all API endpoints"
   - "Show authentication flow"
   - Pre-built queries for common tasks

7. **Clipboard Integration**
   - `contextkit select "query" | pbcopy`
   - Direct to clipboard on macOS/Windows
   - Browser extension for paste

#### Lower Priority
8. **Team Patterns** (like Greptile's learning)
9. **PR Context** (git diff aware)
10. **Symbol Search** (find by name, not just content)

---

## Recommended Strategy

### Phase 1: Structure-Aware (v0.6)
**Goal:** Match Aider's repo map quality

1. Add "map" mode that shows signatures only
2. Integrate tree-sitter for multi-language AST
3. Add Python + Go support
4. Call graph analysis

**Outcome:** ContextKit understands code structure, not just content.

### Phase 2: Smart Context (v0.7)
**Goal:** Dynamic, intelligent context selection

1. Dynamic budget based on query complexity
2. Context recipes for common tasks
3. "Explain codebase" auto-discovery
4. Symbol search (find by name)

**Outcome:** Context that adapts to the task.

### Phase 3: Integration (v0.8)
**Goal:** Seamless workflow integration

1. VS Code extension
2. Clipboard integration
3. GitHub Action for PRs
4. Browser extension

**Outcome:** Use ContextKit anywhere.

### Phase 4: v1.0
**Goal:** Production-ready, trusted by teams

1. Stability, performance benchmarks
2. Enterprise features (audit, SSO)
3. Documentation overhaul
4. Case studies

---

## Success Metrics

### Technical
- Index 50k files in <5 minutes
- Select context in <500ms
- Support 10+ languages
- 99.9% uptime for MCP

### Adoption
- 5k+ npm downloads/week
- 50+ GitHub stars
- 10+ integrations (MCP, VS Code, etc.)
- 5+ blog posts/tutorials by others

### Revenue (if monetized)
- $500 MRR by v1.0
- 50 Pro users
- 2 Enterprise pilots

---

## Open Questions

1. **Should we offer a hosted API?**
   - Pro: Easier for users, recurring revenue
   - Con: Complexity, security concerns

2. **Tree-sitter vs custom parsers?**
   - Tree-sitter: Universal, maintained
   - Custom: More control, simpler

3. **Compete with Cursor or complement it?**
   - Current: Complement (standalone tool)
   - Future: Could be an alternative context engine

4. **Open source everything?**
   - Core: Yes (adoption)
   - Pro features: Maybe paid (sustainability)

---

*Research conducted: February 2026*
*Next review: March 2026*
