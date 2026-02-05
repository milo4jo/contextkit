# ContextKit 🎯

> **Stop dumping your entire codebase into AI prompts.**  
> ContextKit selects the *right* context for any query — saving tokens and improving answers.

[![npm version](https://img.shields.io/npm/v/@milo4jo/contextkit)](https://www.npmjs.com/package/@milo4jo/contextkit)
[![npm downloads](https://img.shields.io/npm/dw/@milo4jo/contextkit)](https://www.npmjs.com/package/@milo4jo/contextkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**🆕 v0.5:** Import-aware scoring — files that import your selected code get boosted automatically!

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

## Commands

### `contextkit init`

Initialize ContextKit in your project. Creates `.contextkit/` directory.

```bash
contextkit init
```

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

# Pipe to clipboard (macOS)
contextkit select "query" --format plain | pbcopy
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
| `contextkit_select` | Find relevant context for any query |
| `contextkit_index` | Re-index the codebase |
| `contextkit_status` | Check index status (files, chunks, etc.) |

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

## Privacy & Security

- ✅ **All processing is local** — nothing leaves your machine
- ✅ **Embeddings stored locally** in `.contextkit/index.db`
- ✅ **No API keys required** — uses local embedding model
- ✅ **`.contextkit` is gitignored** automatically

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
- [ ] Function/class boundary awareness
- [ ] VS Code extension
- [ ] Cursor integration
- [ ] Neovim plugin

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
