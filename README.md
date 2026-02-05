# ContextKit 🎯

> **Stop dumping your entire codebase into AI prompts.**  
> ContextKit selects the *right* context for any query — saving tokens and improving answers.

[![npm version](https://img.shields.io/npm/v/@milo4jo/contextkit)](https://www.npmjs.com/package/@milo4jo/contextkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

| Approach | Problem |
|----------|---------|
| **Dump everything** | Expensive, hits token limits, noisy |
| **Basic RAG** | Returns "similar" not "relevant" |
| **Manual selection** | Tedious, doesn't scale |
| **ContextKit** | ✅ Intelligent, fast, local-first |

### vs. LangChain / LlamaIndex

Those are full frameworks. ContextKit does **one thing well**: context selection. No lock-in, no complexity.

### vs. Vector Databases (Pinecone, Chroma)

They're storage. ContextKit adds the **intelligence layer** — scoring, budgeting, formatting.

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

Build or rebuild the index. Run after code changes.

```bash
contextkit index                   # Index everything
contextkit index --source src      # Index specific source
```

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

# JSON output (for scripts/integrations)
contextkit select "API routes" --json
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
4. **Scoring** — Chunks ranked by similarity + path relevance + recency
5. **Budgeting** — Top chunks selected until token budget filled

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
- [x] Demo project for testing
- [ ] Incremental indexing (only changed files)
- [ ] Watch mode (auto-reindex on save)
- [ ] VS Code extension
- [ ] Cursor integration
- [ ] Cloud sync (optional)

---

## Contributing

Contributions welcome! Please read the [contributing guide](./CONTRIBUTING.md) first.

```bash
# Clone and setup
git clone https://github.com/milo4jo/pixtools.git
cd pixtools/packages/contextkit
pnpm install
pnpm build

# Run tests
pnpm test

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
