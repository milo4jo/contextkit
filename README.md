# ContextKit 🎯

> Smart context selection for AI coding assistants

ContextKit indexes your codebase and selects the most relevant chunks for any query — fitting them into your token budget.

## Why?

AI coding assistants work better with relevant context. But dumping your entire codebase into the prompt wastes tokens and dilutes focus.

ContextKit solves this:
1. **Index** your code locally (embeddings stay on your machine)
2. **Query** with natural language
3. **Get** the most relevant chunks, formatted and ready to paste

## Install

```bash
npm install -g @milo4jo/contextkit
```

## Quick Start

```bash
# Initialize in your project
cd your-project
contextkit init

# Add source directories
contextkit source add ./src
contextkit source add ./lib

# Index everything
contextkit index

# Find relevant context
contextkit select "How does authentication work?"
```

## Commands

### `contextkit init`

Initialize ContextKit in your project. Creates `.contextkit/` directory with config and database.

```bash
contextkit init
```

### `contextkit source`

Manage source directories to index.

```bash
# Add a source
contextkit source add ./src

# List sources
contextkit source list

# Remove a source
contextkit source remove src
```

### `contextkit index`

Index all configured sources. Re-run after code changes.

```bash
# Index everything
contextkit index

# Index specific source
contextkit index --source src
```

### `contextkit select`

Find relevant context for a query.

```bash
# Basic usage
contextkit select "How does the auth middleware work?"

# Limit token budget (default: 8000)
contextkit select "error handling" --budget 4000

# Filter to specific sources
contextkit select "database queries" --sources src,lib

# Show scoring details
contextkit select "user validation" --explain

# JSON output for scripts
contextkit select "API routes" --json
```

## Output Format

```markdown
## src/auth/middleware.ts (lines 1-45)
```typescript
export const authMiddleware = async (req, res, next) => {
  // ... relevant code
}
```

## src/auth/utils.ts (lines 12-30)
```typescript
export function validateToken(token: string) {
  // ... relevant code
}
```

---
📊 3,847 tokens | 8 chunks | 2 files
```

## How It Works

1. **Chunking**: Files are split into ~500 token chunks with overlap
2. **Embedding**: Each chunk is embedded using [gte-small](https://huggingface.co/thenlper/gte-small) (runs locally)
3. **Search**: Your query is embedded and compared via cosine similarity
4. **Scoring**: Chunks are ranked by similarity + path relevance
5. **Budget**: Top chunks are selected until token budget is filled

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
      exclude:
        - "**/node_modules/**"
        - "**/*.test.ts"

settings:
  chunk_size: 500      # Target tokens per chunk
  chunk_overlap: 50    # Overlap between chunks
```

## Global Options

All commands support:

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |
| `--plain` | No colors (or set `NO_COLOR=1`) |
| `--quiet` | Suppress non-essential output |

## Privacy

- All processing happens locally
- Embeddings are stored in `.contextkit/index.db`
- No data leaves your machine
- Add `.contextkit` to `.gitignore` (done automatically)

## Requirements

- Node.js 18+
- ~500MB disk space for embedding model (downloaded on first run)

## Coming Soon

- MCP server for Claude Desktop
- Agent skill for OpenCode/Clawdbot
- Configurable embedding models
- Incremental indexing

## License

MIT
