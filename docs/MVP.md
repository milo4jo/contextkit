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
| CLI `index` | Index all sources (generate embeddings) |
| CLI `select` | Select context for a query |
| Local SQLite storage | No external dependencies |
| Local embeddings | Works offline (gte-small via transformers.js or similar) |
| Text output | Formatted context ready for LLM |

### Out of Scope ❌

| Feature | Reason |
|---------|--------|
| Cloud sync | Complexity, not needed for MVP |
| MCP Server | Build after CLI works |
| Agent Skill | Wraps CLI, do after |
| Multiple embedding providers | One good default is enough |
| Web dashboard | CLI only for MVP |
| User accounts | Local-only for MVP |
| API endpoints | CLI only |

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
   → "Indexed 147 files (23,451 chunks)"

5. Use
   $ contextkit select "How does authentication work?"
   → Returns optimized context (relevant code + docs)
   
6. Copy to LLM
   Developer pastes context into Claude/GPT/etc.
   (Or pipes it: contextkit select "..." | pbcopy)
```

---

## Technical Specification

### File Structure

```
my-project/
├── .contextkit/
│   ├── config.yaml      # Project configuration
│   ├── index.db         # SQLite database
│   └── .gitignore       # Ignore db files
├── src/
└── docs/
```

### Config File

```yaml
# .contextkit/config.yaml
version: 1

sources:
  - id: src
    path: ./src
    type: directory
    patterns:
      include: ["**/*.ts", "**/*.js", "**/*.md"]
      exclude: ["node_modules/**", "**/*.test.ts"]
  
  - id: docs
    path: ./docs
    type: directory
    patterns:
      include: ["**/*.md"]

settings:
  chunk_size: 500        # tokens per chunk
  chunk_overlap: 50      # overlap between chunks
  embedding_model: local # use local model
```

### Database Schema

```sql
-- Sources
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  type TEXT NOT NULL,
  config JSON,
  indexed_at TIMESTAMP
);

-- Chunks
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES sources(id),
  file_path TEXT,
  content TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  tokens INTEGER,
  embedding BLOB,  -- float32 array
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- For vector search (using sqlite-vss extension)
CREATE VIRTUAL TABLE chunks_vss USING vss0(embedding(384));
```

### CLI Commands

#### `contextkit init`

```
$ contextkit init

Initializing ContextKit...
Created .contextkit/config.yaml
Created .contextkit/index.db

Next steps:
  contextkit source add ./src
  contextkit index
```

#### `contextkit source add <path>`

```
$ contextkit source add ./src

Added source: src
  Path: ./src
  Type: directory
  Patterns: **/*.ts, **/*.js, **/*.md

Run 'contextkit index' to index this source.
```

#### `contextkit source list`

```
$ contextkit source list

Sources:
  src    ./src    directory   147 files   indexed 2 min ago
  docs   ./docs   directory    23 files   indexed 2 min ago
```

#### `contextkit index`

```
$ contextkit index

Indexing sources...
  [src]  Processing 147 files...
  [src]  Generated 1,234 chunks
  [docs] Processing 23 files...
  [docs] Generated 189 chunks

Done. Indexed 1,423 chunks in 12.3s
```

#### `contextkit select <query>`

```
$ contextkit select "How does the auth middleware work?" --budget 4000

# Authentication Middleware

## From: src/middleware/auth.ts (lines 1-45)
\`\`\`typescript
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  // ... relevant code
};
\`\`\`

## From: docs/architecture.md (lines 23-41)
The authentication flow works as follows:
1. Client sends JWT in Authorization header
2. Middleware validates token
// ... relevant docs

---
Context: 3,847 tokens | 8 chunks from 4 files
```

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--budget` | 8000 | Max tokens |
| `--format` | text | Output format (text/json) |
| `--sources` | all | Filter to specific sources |

---

## Selection Algorithm (v1)

Simple but effective:

```
1. EMBED query using same model as chunks

2. RETRIEVE top 50 chunks by cosine similarity

3. SCORE each chunk:
   score = (
     0.6 * semantic_similarity +
     0.2 * recency_score +      # newer files slightly preferred
     0.2 * path_relevance       # filename matches query terms
   )

4. RANK by score descending

5. SELECT chunks until budget exhausted
   - Always include highest scored
   - Prefer keeping chunks from same file together

6. FORMAT into readable output
   - Group by file
   - Include file path and line numbers
   - Add separators
```

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | DX, npm ecosystem |
| CLI Framework | Commander.js | Standard, stable |
| Database | better-sqlite3 | Fast, no deps, sync API |
| Vector Search | sqlite-vss | SQLite extension, embedded |
| Embeddings | @xenova/transformers | Local, no API needed |
| Embedding Model | gte-small (384d) | Good quality, fast, small |
| Tokenizer | js-tiktoken | Accurate counts |

### Why These Choices?

**Local-first:** No API keys needed for MVP. Works offline.

**SQLite:** Single file, no server, portable across machines.

**Transformers.js:** Runs embedding models in Node.js locally.

---

## Success Criteria

MVP is successful if:

1. **Works:** Developer can go from `init` to `select` in <5 minutes
2. **Useful:** Selected context is better than "first N files"
3. **Fast:** Indexing <1min for typical project, selection <1s
4. **Portable:** Single `npm install`, no external deps

---

## Development Phases

### Phase 1: Foundation (Days 1-3)
- [ ] Project setup (TypeScript, ESLint, tests)
- [ ] CLI skeleton with Commander.js
- [ ] Config file parsing
- [ ] SQLite setup with better-sqlite3

### Phase 2: Indexing (Days 4-6)
- [ ] File discovery and filtering
- [ ] Chunking algorithm
- [ ] Local embedding generation
- [ ] Storage in SQLite + sqlite-vss

### Phase 3: Selection (Days 7-9)
- [ ] Query embedding
- [ ] Vector similarity search
- [ ] Scoring and ranking
- [ ] Budget fitting

### Phase 4: Polish (Days 10-12)
- [ ] Output formatting
- [ ] Error handling
- [ ] Progress indicators
- [ ] Documentation
- [ ] npm package setup

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| sqlite-vss is tricky to bundle | Fallback: brute-force cosine similarity (slower but works) |
| Local embeddings too slow | Smaller model, or batch processing with progress bar |
| Chunking quality varies | Start simple, iterate based on feedback |

---

## Non-Goals for MVP

- Perfect accuracy (good enough is fine)
- Every file type (start with .ts, .js, .md, .py)
- Beautiful output (functional is fine)
- Comprehensive tests (core paths only)

---

## After MVP

Once MVP works:
1. **Agent Skill** — Wrap CLI for OpenCode/Clawdbot
2. **Iterate on selection** — Better scoring, user feedback
3. **More sources** — APIs, databases
4. **Cloud features** — Team sync, hosted embeddings
