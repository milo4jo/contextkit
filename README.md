# ContextKit 🎯

> **Stop dumping your entire codebase into AI prompts.**  
> ContextKit selects the *right* context for any query — saving tokens and improving answers.

[![npm version](https://img.shields.io/npm/v/@milo4jo/contextkit)](https://www.npmjs.com/package/@milo4jo/contextkit)
[![npm downloads](https://img.shields.io/npm/dw/@milo4jo/contextkit)](https://www.npmjs.com/package/@milo4jo/contextkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**🆕 v0.6.9:** Query history, config presets, interactive mode, and index export/import!

---

## The Problem

AI coding assistants are only as good as the context you give them. But:

- **Too much context** = expensive, slow, diluted focus
- **Too little context** = hallucinations, wrong answers
- **Manual selection** = tedious, doesn't scale

**ContextKit fixes this.** It indexes your code and intelligently selects the most relevant chunks for any query.

## How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Your Code   │ ──▶ │   Index      │ ──▶ │   Select     │
│  (files)     │     │  (local db)  │     │  (semantic)  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │  Optimized   │
                                          │   Context    │
                                          └──────────────┘
```

1. **Index** your codebase (embeddings stored locally)
2. **Query** in natural language
3. **Get** the most relevant code chunks, ready to paste

## Install

```bash
npm install -g @milo4jo/contextkit
```

## Quick Start

```bash
# Initialize in your project
cd your-project
contextkit init

# Add directories to index
contextkit source add ./src
contextkit source add ./lib

# Build the index
contextkit index

# Find relevant context for any query
contextkit select "How does authentication work?"
```

**Output:**

```markdown
## src/auth/middleware.ts (lines 1-45)
```typescript
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  // ...
}
```

## src/auth/utils.ts (lines 12-30)
```typescript
export function validateToken(token: string): User | null {
  // ...
}
```

---
📊 2,847 tokens | 6 chunks | 2 files
```

## Why ContextKit?

**Real example:** A 50k line codebase needs ~200k tokens to include everything. ContextKit gives you the **relevant 3-8k tokens** for any query. That's **96% token savings** and better answers.

| Approach | Problem |
|----------|---------|
| **Dump everything** | 💸 Expensive, hits token limits, dilutes focus |
| **Basic RAG** | Returns "similar" chunks, misses dependencies |
| **Manual selection** | Tedious, inconsistent, doesn't scale |
| **ContextKit** | ✅ Smart selection, import-aware, local-first |

### Why Not LSP-Based Tools?

Tools like [Serena](https://github.com/oramasearch/serena) use Language Server Protocol for deep code understanding. Great for complex refactoring, but:

- **Heavy setup** — requires language servers per language
- **Slow startup** — LSP initialization takes seconds
- **Complex** — more moving parts to configure

**ContextKit takes a different approach:** Semantic search + import graph analysis. Works instantly on any codebase, any language. No language servers needed.

### vs. LangChain / LlamaIndex

Those are full frameworks. ContextKit does **one thing well**: context selection. No lock-in, no complexity.

### vs. Vector Databases (Pinecone, Chroma)

They're storage. ContextKit adds the **intelligence layer** — scoring, budgeting, code-aware formatting.

---

## Performance

Benchmarks on a MacBook Pro M4 (ContextKit's own codebase: 40 files, 166 chunks):

| Operation | Time | Notes |
|-----------|------|-------|
| **Initial index** | ~14s | Includes embedding generation |
| **Incremental index** | <1s | Only changed files |
| **Query (cold)** | ~200ms | First query loads model |
| **Query (warm)** | ~50ms | Subsequent queries |
| **Query (cached)** | <5ms | Identical queries |

Scaling (tested on larger codebases):

| Codebase Size | Index Time | Query Time |
|---------------|------------|------------|
| 100 files | ~30s | ~60ms |
| 500 files | ~2min | ~80ms |
| 1000 files | ~4min | ~100ms |

**Key optimizations:**
- Incremental indexing (content hashing)
- Query caching with automatic invalidation
- Local embeddings (no API latency)
- SQLite for fast reads

---

## Commands

### `contextkit init`

Initialize ContextKit in your project. Creates `.contextkit/` directory.

```bash
contextkit init                    # Start fresh (then add sources manually)
contextkit init --preset react     # React/Next.js projects
contextkit init --preset node      # Node.js/TypeScript projects  
contextkit init --preset python    # Python projects
contextkit init --preset monorepo  # Monorepo (packages/*, apps/*)
contextkit init --preset fullstack # Full-stack (src + api)
contextkit init --list-presets     # Show all presets
contextkit init --force            # Reinitialize (deletes existing index)
```

Presets provide optimized configurations with pre-defined sources, file patterns, and chunk settings for your project type.

### `contextkit source`

Manage which directories to index.

```bash
contextkit source add ./src        # Add a source
contextkit source list             # List all sources
contextkit source remove src       # Remove a source
```

### `contextkit index`

Build or rebuild the index. Uses incremental indexing by default (only re-indexes changed files).

```bash
contextkit index                   # Incremental index (fast)
contextkit index --force           # Full re-index
contextkit index --source src      # Index specific source
```

### `contextkit watch`

Watch sources and auto-reindex on changes.

```bash
contextkit watch                   # Watch with 1s debounce
contextkit watch --debounce 2000   # Custom debounce (ms)
```

Press `Ctrl+C` to stop watching.

### `contextkit select`

Find relevant context for a query.

```bash
# Basic usage
contextkit select "How does the auth middleware work?"

# Set token budget (default: 8000)
contextkit select "error handling" --budget 4000

# Filter to specific sources
contextkit select "database queries" --sources src,lib

# Show scoring details
contextkit select "user validation" --explain

# Output formats
contextkit select "query" --format markdown  # Default, with code blocks
contextkit select "query" --format xml       # XML structure (Claude prefers this)
contextkit select "query" --format json      # JSON for scripts/integrations
contextkit select "query" --format plain     # Plain text, no formatting

# Include imported files (follows dependency graph)
contextkit select "query" --include-imports

# Repo map mode (signatures only, saves tokens)
contextkit select "query" --mode map

# Pipe to clipboard (macOS)
contextkit select "query" --format plain | pbcopy
```

### `contextkit symbol`

Search for code by symbol name (faster than semantic search when you know the name).

```bash
# Find a function or class by name
contextkit symbol "UserService"

# Exact match only
contextkit symbol "handleAuth" --exact

# Limit results
contextkit symbol "parse" --limit 10
```

**Output:**
```
📄 src/services/user.ts
│ ◆ UserService (line 12)
│   export class UserService
```

### `contextkit graph`

Show call relationships for a function.

```bash
contextkit graph "handlePayment"
```

**Output:**
```
🎯 Call graph for: handlePayment

📥 Callers (2):
   ← processOrder (src/orders/service.ts:45)
   ← checkout (src/cart/checkout.ts:89)

📤 Calls (3):
   → validateCard (src/payments/validation.ts)
   → chargeCard (src/payments/stripe.ts)
   → sendReceipt (src/notifications/email.ts)
```

### `contextkit interactive` (alias: `i`)

REPL-style mode for exploring context without re-initializing for each query.

```bash
contextkit interactive              # Start interactive mode
contextkit i                        # Short alias
contextkit i --budget 4000          # Set default token budget
```

**Available commands in interactive mode:**
```
contextkit> authentication          # Select context (default)
contextkit> /symbol UserService     # Find symbols
contextkit> /graph handlePayment    # Show call graph
contextkit> /diff                   # Show changes since last index
contextkit> /status                 # Project status
contextkit> /help                   # Show all commands
contextkit> /exit                   # Exit
```

### `contextkit diff`

Show what has changed since the last index. Helps decide if re-indexing is needed.

```bash
contextkit diff                     # Show all changes
contextkit diff --source src        # Check specific source
```

**Output:**
```
📊 Changes since last index

📁 src (2 modified, 1 added, 0 removed)
  Modified:
    • src/auth/middleware.ts (3 chunks)
    • src/utils/helpers.ts (2 chunks)
  Added:
    + src/services/new-service.ts

💡 Run 'contextkit index' to update
```

### `contextkit export`

Export your index to a JSON file for sharing or backup.

```bash
contextkit export                        # Export to contextkit-export.json
contextkit export my-index.json          # Export to custom file
contextkit export --no-embeddings        # Smaller file, but requires re-indexing
```

Useful for:
- Sharing indexes with teammates
- Backing up before major changes
- Migrating to another machine

### `contextkit import`

Import an index from a JSON export file.

```bash
contextkit import my-index.json          # Import index
contextkit import backup.json --force    # Overwrite existing without asking
```

### `contextkit history`

View and re-run past queries. Helpful for repeating common searches.

```bash
contextkit history                       # Show recent queries (last 20)
contextkit history -n 50                 # Show more entries
contextkit history --run 5               # View details for query #5
contextkit history --clear               # Clear all history
contextkit history --json                # Output as JSON
```

**Output:**
```
📜 Query History

  #  5  How does authentication work?
       2h ago  6 chunks, 2847 tokens

  #  4  database connection setup
       3h ago  4 chunks, 1523 tokens

  #  3  error handling patterns
       1d ago  8 chunks, 3201 tokens

Use `contextkit history --run <id>` to see full details.
```

---

## 🤖 MCP Server (Claude Desktop Integration)

ContextKit includes an **MCP server** for seamless integration with Claude Desktop and other MCP-compatible AI assistants.

### What is MCP?

[Model Context Protocol](https://modelcontextprotocol.io/) is a standard for connecting AI assistants to external tools. With MCP, Claude can directly use ContextKit to find relevant code.

### Setup for Claude Desktop

**1. Find your config file:**

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**2. Add ContextKit:**

```json
{
  "mcpServers": {
    "contextkit": {
      "command": "contextkit-mcp",
      "args": [],
      "env": {
        "CONTEXTKIT_PROJECT": "/path/to/your/project"
      }
    }
  }
}
```

**3. Restart Claude Desktop**

### Available Tools

Once configured, Claude can use these tools:

| Tool | Description |
|------|-------------|
| `contextkit_select` | Find relevant context for any query. Supports `mode: "map"` for signatures only. |
| `contextkit_symbol` | Search for functions, classes, types by name. Faster than semantic search. |
| `contextkit_graph` | Show call graph: what calls a function, what it calls. |
| `contextkit_index` | Re-index the codebase after changes. |
| `contextkit_status` | Check index status (files, chunks, version). |

### Example: Symbol Search

> **You:** Find the UserService class
>
> **Claude:** *[Uses contextkit_symbol]* Found it in `src/services/user.ts`:
> ```typescript
> export class UserService {
>   async findById(id: string): Promise<User | null>
>   async create(data: CreateUserDto): Promise<User>
> }
> ```

### Example: Call Graph

> **You:** What calls the `validateToken` function?
>
> **Claude:** *[Uses contextkit_graph]* `validateToken` is called by:
> - `authMiddleware` in `src/middleware/auth.ts`
> - `refreshSession` in `src/auth/session.ts`
>
> And it calls:
> - `decodeJwt` from `src/utils/jwt.ts`
> - `getUserById` from `src/services/user.ts`

### Example: Map Mode

> **You:** Give me an overview of the codebase structure
>
> **Claude:** *[Uses contextkit_select with mode: "map"]* Here's the structure:
> ```
> src/auth/
>   ├── middleware.ts
>   │   └── 𝑓 authMiddleware(req, res, next)
>   │   └── 𝑓 requireRole(role)
>   ├── jwt.ts
>   │   └── 𝑓 signToken(payload)
>   │   └── 𝑓 verifyToken(token)
> ```

### Example Conversation

> **You:** Find all code related to user authentication
>
> **Claude:** *[Uses contextkit_select]* I found the relevant code. Here's what handles authentication:
> - `src/auth/middleware.ts` - The main auth middleware
> - `src/auth/jwt.ts` - Token validation
> - ...

### Manual Server Start

For debugging or other MCP clients:

```bash
# Start the MCP server
contextkit mcp

# With a specific project
CONTEXTKIT_PROJECT=/path/to/project contextkit mcp
```

---

## Configuration

Edit `.contextkit/config.yaml`:

```yaml
version: 1

sources:
  - id: src
    path: ./src
    patterns:
      include:
        - "**/*.ts"
        - "**/*.js"
        - "**/*.tsx"
      exclude:
        - "**/node_modules/**"
        - "**/*.test.ts"
        - "**/*.spec.ts"

settings:
  chunk_size: 500        # Target tokens per chunk
  chunk_overlap: 50      # Overlap between chunks
  embedding_model: gte-small
```

---

## ☁️ Cloud Sync (NEW!)

Sync your index to the cloud and access it from any machine. Perfect for teams and multi-device workflows.

### Quick Start

```bash
# 1. Get your API key from the dashboard
#    https://contextkit-site.vercel.app/dashboard/api-keys

# 2. Login
contextkit cloud login
# Paste your API key when prompted

# 3. Sync your index
contextkit cloud sync

# 4. On another machine
contextkit cloud pull --project my-project
```

### Commands

| Command | Description |
|---------|-------------|
| `contextkit cloud login` | Authenticate with your API key |
| `contextkit cloud sync` | Upload your index to the cloud |
| `contextkit cloud pull` | Download an index from the cloud |
| `contextkit cloud status` | Check sync status |
| `contextkit cloud logout` | Remove stored credentials |

### Pricing

| Plan | Projects | Storage | Rate Limit |
|------|----------|---------|------------|
| **Free** | 1 | 100 MB | 20/min |
| **Pro** | 5 | 1 GB | 100/min |
| **Team** | 50 | 10 GB | 500/min |

Get started free at [contextkit-site.vercel.app/dashboard](https://contextkit-site.vercel.app/dashboard).

---

## Privacy & Security

- ✅ **All processing is local** — nothing leaves your machine
- ✅ **Embeddings stored locally** in `.contextkit/index.db`
- ✅ **No API keys required** — uses local embedding model
- ✅ **`.contextkit` is gitignored** automatically

---

## 📚 Documentation

- **[Getting Started Guide](./docs/getting-started.md)** — Detailed walkthrough
- **[MCP Setup Guide](./docs/mcp-setup.md)** — Claude Desktop integration
- **[Examples](./examples/README.md)** — Real-world use cases
  - [Bug Investigation](./examples/bug-investigation.md)
  - [Scripting & Automation](./examples/scripting.md)
- **[Architecture](./docs/ARCHITECTURE.md)** — How ContextKit works

---

## Troubleshooting

### Quick Diagnosis

```bash
contextkit doctor
```

This checks your setup and shows any issues:

```
🩺 ContextKit Doctor

Running diagnostics...

✓ Node.js version: v20.10.0
✓ Configuration: 2 source(s) configured
✓ Index database: 166 chunks, 40 files (12.5 MB)
✓ Embeddings: 166/166 chunks (100%)
✓ Query cache: 5 cached queries
✓ Disk space: OK

✓ All checks passed! ContextKit is ready to use.
```

### Common Issues

**"Not initialized"**
```bash
contextkit init
contextkit source add ./src
contextkit index
```

**"No sources configured"**
```bash
contextkit source add ./src
```

**"No embeddings generated"**
```bash
contextkit index --force  # Re-index with embeddings
```

**Slow queries?**
```bash
contextkit cache clear    # Clear query cache
contextkit index --force  # Rebuild index
```

---

## Technical Details

### How Selection Works

1. **Chunking** — Files split into ~500 token chunks with overlap
2. **Embedding** — Each chunk embedded with [gte-small](https://huggingface.co/thenlper/gte-small) (runs locally)
3. **Similarity** — Query embedded and compared via cosine similarity
4. **Import Analysis** — Parses ES6/CommonJS/dynamic imports to build dependency graph
5. **Multi-Factor Scoring** — Chunks ranked by:
   - Semantic similarity (40%)
   - Query term matches (25%)
   - Path relevance (20%)
   - Recency (10%)
   - **Import boost** (5%) — files imported by selected code get boosted
6. **Budgeting** — Top chunks selected until token budget filled

### Requirements

- Node.js 18+
- ~500MB disk space (embedding model downloaded on first run)

---

## Try the Demo

Want to see ContextKit in action? Check out the [demo project](./examples/demo-project/):

```bash
cd examples/demo-project
contextkit init
contextkit source add ./src
contextkit index
contextkit select "How does authentication work?"
```

---

## Roadmap

- [x] CLI with init, source, index, select
- [x] MCP server for Claude Desktop
- [x] Incremental indexing (only changed files)
- [x] Watch mode (auto-reindex on save)
- [x] Multi-factor scoring algorithm
- [x] Multiple output formats (markdown, XML, JSON, plain)
- [x] **Import-aware scoring** — understands code dependencies
- [x] **Doctor command** — diagnose setup issues
- [ ] ~~Function/class boundary awareness~~ (done via AST chunking)
- [x] **VS Code extension** — [in development](https://github.com/milo4jo/contextkit-vscode)
- [x] **Cloud sync for teams** — Sync indexes across machines
- [ ] Cursor integration
- [ ] Neovim plugin
- [ ] Team collaboration features

---

## Contributing

Contributions welcome! Please read the [contributing guide](./CONTRIBUTING.md) first.

```bash
# Clone and setup
git clone https://github.com/milo4jo/contextkit.git
cd contextkit
npm install
npm run build

# Run tests
npm test

# Link for local development
npm link
```

---

## License

MIT © [Milo](https://github.com/milo4jo)

---

<p align="center">
  Built with 🦊 by Milo
</p>
