# MVP Specification

> The smallest useful version of ContextKit.

## Goal

**Ship something useful in 1-2 weeks.**

A developer can install ContextKit, point it at their codebase, and get better context for their LLM queries than naive "dump everything" or basic RAG.

---

## MVP Scope

### In Scope ✅

| Feature | Description |
|---------|-------------|
| CLI `init` | Initialize ContextKit in a directory |
| CLI `source add` | Add a directory as a source |
| CLI `source list` | List configured sources |
| CLI `index` | Index all sources (generate embeddings) |
| CLI `select` | Select context for a query |
| Local SQLite storage | No external dependencies |
| Local embeddings | Works offline (gte-small via transformers.js) |
| Human-friendly output | Formatted context with progress indicators |
| Machine-readable output | `--json` flag for scripting |

### Out of Scope ❌

| Feature | Reason |
|---------|--------|
| Cloud sync | Complexity, not needed for MVP |
| MCP Server | Build after CLI works |
| Agent Skill | Wraps CLI, do after |
| Multiple embedding providers | One good default is enough |
| Web dashboard | CLI only for MVP |
| User accounts | Local-only for MVP |

---

## CLI Design (Following clig.dev)

See [CLI-DESIGN.md](./CLI-DESIGN.md) for full principles. Key requirements:

### Exit Codes
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid usage |

### Output Streams
- **stdout**: Data output (context, lists)
- **stderr**: Progress, logs, errors

### Required Flags (all commands)
| Flag | Description |
|------|-------------|
| `-h, --help` | Show help |
| `-v, --version` | Show version (root only) |
| `--json` | JSON output |
| `--plain` | Plain output (no colors/formatting) |
| `--quiet` | Suppress non-essential output |

---

## User Journey

```
Developer has a codebase, wants better LLM context.

1. Install
   $ npm install -g contextkit

2. Initialize
   $ cd my-project
   $ contextkit init
   → Creates .contextkit/ directory

3. Add sources
   $ contextkit source add ./src
   $ contextkit source add ./docs
   → Registers directories

4. Index
   $ contextkit index
   → Processes files, generates embeddings
   → Shows progress bar
   → "✓ Indexed 1,423 chunks in 12.3s"

5. Use
   $ contextkit select "How does authentication work?"
   → Returns optimized context
   
6. Pipe to clipboard or file
   $ contextkit select "auth" | pbcopy
   $ contextkit select "auth" > context.md
```

---

## CLI Commands

### `contextkit` (no args)

Shows concise help. Doesn't hang, doesn't error.

```
$ contextkit

contextkit - Smart context selection for LLMs

Usage: contextkit <command> [options]

Commands:
  init          Initialize ContextKit in current directory
  source        Manage sources
  index         Index all sources
  select        Select context for a query

Examples:
  $ contextkit init
  $ contextkit source add ./src
  $ contextkit index
  $ contextkit select "How does auth work?"

Run 'contextkit <command> --help' for details.
```

### `contextkit init`

```
$ contextkit init

✓ Created .contextkit/config.yaml
✓ Created .contextkit/index.db
✓ Added .contextkit to .gitignore

Next steps:
  1. Add sources:    contextkit source add ./src
  2. Index:          contextkit index
  3. Select context: contextkit select "your query"
```

**Errors:**
```
$ contextkit init
Error: Already initialized

A .contextkit directory already exists.
Use --force to reinitialize (this will delete existing index).
```

### `contextkit source add <path>`

```
$ contextkit source add ./src

✓ Added source 'src'
  Path:     ./src
  Files:    147 (ts, js, md)
  
Run 'contextkit index' to index this source.
```

**With options:**
```
$ contextkit source add ./src --include "**/*.ts" --exclude "**/*.test.ts"
```

**Error handling:**
```
$ contextkit source add ./nonexistent
Error: Path not found

'./nonexistent' does not exist.
Did you mean './src'?
```

### `contextkit source list`

```
$ contextkit source list

Sources:
  NAME   PATH      FILES   INDEXED
  src    ./src     147     2 min ago
  docs   ./docs    23      2 min ago

Total: 170 files in 2 sources
```

**JSON output:**
```
$ contextkit source list --json
{
  "sources": [
    {"id": "src", "path": "./src", "files": 147, "indexed_at": "2024-..."},
    {"id": "docs", "path": "./docs", "files": 23, "indexed_at": "2024-..."}
  ]
}
```

**Plain output (for scripting):**
```
$ contextkit source list --plain
src	./src	147
docs	./docs	23
```

### `contextkit index`

Shows progress for long operations.

```
$ contextkit index

Indexing sources...

[src] Reading files...
  ████████████████████ 147/147

[src] Generating embeddings...
  ████████████████████ 1,234/1,234 chunks

[docs] Reading files...
  ████████████████████ 23/23

[docs] Generating embeddings...
  ████████████████████ 189/189 chunks

✓ Indexed 1,423 chunks from 170 files in 12.3s
```

**When piped (no TTY):**
```
$ contextkit index 2>&1 | tee log.txt
Indexing src: 147 files, 1234 chunks
Indexing docs: 23 files, 189 chunks
Done: 1423 chunks in 12.3s
```

**Quiet mode:**
```
$ contextkit index --quiet
# No output on success, exit code 0
```

### `contextkit select <query>`

The main command.

```
$ contextkit select "How does the auth middleware work?"

# Authentication Middleware

## src/middleware/auth.ts (lines 1-45)
```typescript
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  // ... 
};
```

## docs/architecture.md (lines 23-41)
The authentication flow:
1. Client sends JWT in Authorization header
2. Middleware validates token signature
3. Decoded user attached to request

---
📊 3,847 tokens | 8 chunks | 4 files
```

**Options:**
```
$ contextkit select "auth" --budget 4000 --format json --sources src
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--budget` | `-b` | 8000 | Max tokens |
| `--format` | `-f` | text | Output: text, json |
| `--sources` | `-s` | all | Filter sources (comma-separated) |
| `--explain` | | false | Show scoring details |
| `--plain` | | false | No formatting (for pipes) |

**JSON output:**
```
$ contextkit select "auth" --format json
{
  "id": "sel_abc123",
  "query": "auth",
  "context": "# Authentication...",
  "chunks": [
    {
      "file": "src/middleware/auth.ts",
      "lines": [1, 45],
      "tokens": 487,
      "score": 0.92
    }
  ],
  "stats": {
    "total_tokens": 3847,
    "chunks_considered": 50,
    "chunks_included": 8,
    "files": 4,
    "time_ms": 234
  }
}
```

**Error when not initialized:**
```
$ contextkit select "auth"
Error: Not initialized

No .contextkit directory found.
Run 'contextkit init' first.
```

**Error when not indexed:**
```
$ contextkit select "auth"
Error: No index found

Sources haven't been indexed yet.
Run 'contextkit index' first.
```

---

## File Structure

```
my-project/
├── .contextkit/
│   ├── config.yaml      # Configuration
│   ├── index.db         # SQLite database
│   └── .gitignore       # Ignore db
├── src/
└── docs/
```

### config.yaml

```yaml
version: 1

sources:
  - id: src
    path: ./src
    patterns:
      include: ["**/*.ts", "**/*.js", "**/*.md"]
      exclude: ["node_modules/**", "**/*.test.ts"]
  
  - id: docs
    path: ./docs
    patterns:
      include: ["**/*.md"]

settings:
  chunk_size: 500
  chunk_overlap: 50
```

---

## Database Schema

```sql
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  config JSON,
  file_count INTEGER DEFAULT 0,
  indexed_at TIMESTAMP
);

CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES sources(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  tokens INTEGER NOT NULL,
  embedding BLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chunks_source ON chunks(source_id);
CREATE INDEX idx_chunks_file ON chunks(file_path);
```

---

## Selection Algorithm (v1)

```
1. EMBED query using same model as chunks

2. RETRIEVE top 50 chunks by cosine similarity

3. SCORE each chunk:
   score = (
     0.6 × semantic_similarity +
     0.2 × recency_bonus +
     0.2 × path_match_bonus
   )

4. RANK by score descending

5. SELECT until budget exhausted
   - Prefer keeping chunks from same file together
   - Never split mid-chunk

6. FORMAT output
   - Group by file
   - Include file path + line numbers
   - Show stats at end
```

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | DX, npm ecosystem |
| CLI Framework | Commander.js | Standard, well-documented |
| Database | better-sqlite3 | Fast, zero deps |
| Vector Search | sqlite-vss or brute-force | Start simple |
| Embeddings | @xenova/transformers | Local, no API key |
| Model | gte-small (384d) | Good quality/speed balance |
| Tokenizer | js-tiktoken | Accurate counts |
| Progress | ora + cli-progress | Nice spinners/bars |
| Colors | chalk | Respects NO_COLOR |

---

## Development Phases

### Phase 1: Foundation ✅
- [x] Project setup (TypeScript, ESLint, Prettier)
- [x] CLI skeleton with Commander.js
- [x] Help text for all commands
- [x] Config file read/write
- [x] SQLite setup

### Phase 2: Indexing ✅
- [x] File discovery with glob
- [x] Chunking algorithm
- [x] Local embedding generation
- [x] Progress indicators
- [x] Storage in SQLite

### Phase 3: Selection ✅
- [x] Query embedding
- [x] Similarity search
- [x] Scoring and ranking
- [x] Budget fitting
- [x] Output formatting

### Phase 4: Polish ✅
- [x] Error messages with suggestions
- [x] TTY detection
- [x] JSON/plain output modes
- [x] --help improvements
- [x] README and docs
- [x] npm publish setup

---

## Success Criteria

| Criteria | Target |
|----------|--------|
| Time to first select | < 5 minutes |
| Index speed | < 1 min for 1000 files |
| Select speed | < 1 second |
| Context quality | Better than random/first-N |
| Works offline | ✓ |
| Single install | `npm i -g contextkit` |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| sqlite-vss bundling issues | Fallback to brute-force cosine |
| Slow local embeddings | Batch + progress bar, cache |
| Poor chunk boundaries | Start with line-based, iterate |
| Large file handling | Skip files > 100KB initially |

---

## After MVP

1. **Agent Skill** — Package for OpenCode/Clawdbot
2. **MCP Server** — For Claude Desktop
3. **Better selection** — User feedback, ML ranking
4. **More sources** — URLs, APIs, databases
5. **Cloud** — Team sync, hosted embeddings
