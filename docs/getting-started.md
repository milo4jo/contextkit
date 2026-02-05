# Getting Started with ContextKit

This guide walks you through setting up ContextKit and using it effectively with your codebase.

## Prerequisites

- **Node.js 18+** (v20+ recommended)
- A codebase you want to index

## Installation

```bash
# Global install (recommended)
npm install -g @milo4jo/contextkit

# Or use npx without installing
npx @milo4jo/contextkit --help
```

Verify the installation:

```bash
contextkit --version
```

## Step 1: Initialize Your Project

Navigate to your project's root directory and initialize ContextKit:

```bash
cd ~/projects/my-app
contextkit init
```

This creates a `.contextkit/` directory containing:
- `config.yaml` — Configuration file
- `index.db` — Local SQLite database (auto-generated on index)

The `.contextkit/index.db` is automatically added to `.gitignore`.

## Step 2: Add Source Directories

Tell ContextKit which directories to index:

```bash
# Add your main source code
contextkit source add ./src

# Add additional directories
contextkit source add ./lib
contextkit source add ./packages

# View configured sources
contextkit source list
```

**What gets indexed:**
- TypeScript/JavaScript files (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`)
- Excludes `node_modules`, `dist`, `.git` by default

## Step 3: Index Your Code

Build the search index:

```bash
contextkit index
```

**Sample output:**
```
Indexing sources...

Reading files   [src]: 35/35
Chunking        [src]: 35/35
Embedding       [src]: 95/95
Storing         [src]: 95/95

✓ Indexed 95 chunks from 35 files in 10.2s
```

### Incremental Indexing

Subsequent runs are incremental — only changed files are re-indexed:

```bash
contextkit index
# ✓ Indexed 2 chunks from 1 file (34 unchanged) in 0.8s
```

To force a full re-index:

```bash
contextkit index --force
```

## Step 4: Query Your Code

Now the fun part! Ask questions in natural language:

```bash
contextkit select "How does user authentication work?"
```

**Sample output:**
```markdown
## src/auth/middleware.ts (lines 1-45)
```typescript
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  // ...
}
\```

---
📊 2,847 tokens | 6 chunks | 2 files
```

### Controlling Token Budget

By default, ContextKit returns up to 8,000 tokens. Adjust with `--budget`:

```bash
# Get more context
contextkit select "explain the database schema" --budget 16000

# Get less for quick questions
contextkit select "where is the API key stored?" --budget 2000
```

### Output Formats

```bash
# Markdown (default) - great for pasting into AI chats
contextkit select "query"

# JSON - for programmatic use
contextkit select "query" --format json

# XML - some AI models prefer this
contextkit select "query" --format xml

# Plain text - minimal formatting
contextkit select "query" --format plain
```

### Include Import Graph

Boost scores for files that import your selected code:

```bash
contextkit select "payment processing" --include-imports
```

This helps pull in related files that depend on the primary results.

## Step 5: Integrate with AI Assistants

### Copy-Paste Workflow

The simplest approach:

1. Run `contextkit select "your question"`
2. Copy the output
3. Paste into Claude, ChatGPT, or your preferred AI assistant
4. Add your actual question below the context

### MCP Integration (Claude Desktop)

For seamless Claude Desktop integration, see [MCP Setup Guide](./mcp-setup.md).

### Use in Scripts

```bash
# Pipe to clipboard (macOS)
contextkit select "auth flow" | pbcopy

# Save to file
contextkit select "database queries" > context.md

# Use in a pipeline
contextkit select "API routes" --format json | jq '.chunks[].file'
```

## Configuration Reference

Edit `.contextkit/config.yaml` to customize behavior:

```yaml
version: 1

sources:
  - id: src
    path: ./src
    patterns:
      include:
        - "**/*.ts"
        - "**/*.tsx"
      exclude:
        - "**/node_modules/**"
        - "**/*.test.ts"
        - "**/*.spec.ts"

settings:
  chunk_size: 500      # Target tokens per chunk
  chunk_overlap: 50    # Overlap between chunks
```

### Source Patterns

Use glob patterns to control what gets indexed:

```yaml
sources:
  - id: backend
    path: ./server
    patterns:
      include:
        - "**/*.ts"
        - "**/*.py"
      exclude:
        - "**/migrations/**"
        - "**/__pycache__/**"
```

## Common Commands

```bash
# Initialize
contextkit init

# Sources
contextkit source add ./path
contextkit source list
contextkit source remove <id>

# Indexing
contextkit index
contextkit index --force

# Selection
contextkit select "your query"
contextkit select "query" --budget 4000
contextkit select "query" --format json

# Cache management
contextkit cache stats
contextkit cache clear

# Watch mode (auto-reindex on changes)
contextkit watch

# MCP server (for AI assistant integration)
contextkit mcp
```

## Troubleshooting

### "Not initialized" error

Run `contextkit init` in your project root first.

### Index seems stale

Force a full re-index:
```bash
contextkit index --force
```

### Query returns irrelevant results

1. Check if the right files are indexed: `contextkit source list`
2. Try a more specific query
3. Increase the budget to see more candidates

### Slow indexing

The first index run generates embeddings which takes time. Subsequent runs are incremental and much faster.

## Next Steps

- [MCP Setup Guide](./mcp-setup.md) — Integrate with Claude Desktop
- [Architecture](./ARCHITECTURE.md) — How ContextKit works under the hood
- [CLI Reference](./CLI-DESIGN.md) — Full command documentation
