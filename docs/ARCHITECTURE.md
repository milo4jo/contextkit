# Architecture

> Living document. Updated as design evolves.

## Design Principles

1. **Single Responsibility** — ContextKit selects context. Nothing more.
2. **Separation of Concerns** — Clear boundaries between components
3. **Dependency Inversion** — Abstract over storage, embeddings, etc.
4. **Offline-First** — Core works locally, cloud enhances
5. **Deterministic** — Same inputs → same outputs (for testing)
6. **Observable** — Every decision is traceable

---

## Core Concepts

### Sources
Where information comes from.

```typescript
interface Source {
  id: string;
  type: 'file' | 'directory' | 'api' | 'database';
  uri: string;
  config: SourceConfig;
}
```

**Types:**
- `file` — Single file (markdown, code, etc.)
- `directory` — Folder of files
- `api` — REST/GraphQL endpoint
- `database` — SQL/NoSQL query

### Chunks
Atomic units of context.

```typescript
interface Chunk {
  id: string;
  sourceId: string;
  content: string;
  metadata: {
    path?: string;
    line?: number;
    timestamp?: Date;
    tokens: number;
  };
  embedding?: number[];
}
```

### Layers
Priority levels for context.

```typescript
enum Layer {
  SYSTEM = 1,    // Always included, never trimmed
  CRITICAL = 2,  // High priority, rarely trimmed
  RELEVANT = 3,  // Query-relevant, may be trimmed
  BACKGROUND = 4 // Nice to have, first to trim
}
```

### Budget
Token allocation.

```typescript
interface Budget {
  total: number;          // Max tokens for context
  reserved: {
    system: number;       // Reserved for system layer
    buffer: number;       // Safety margin
  };
}
```

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ContextKit Core                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Ingester  │     │   Indexer   │     │  Selector   │       │
│  │             │     │             │     │             │       │
│  │ • Parse     │ ──▶ │ • Chunk     │ ──▶ │ • Score     │       │
│  │ • Validate  │     │ • Embed     │     │ • Rank      │       │
│  │ • Normalize │     │ • Store     │     │ • Fit       │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                   │                   │               │
│         └───────────────────┴───────────────────┘               │
│                             │                                   │
│                             ▼                                   │
│                    ┌─────────────┐                              │
│                    │  Formatter  │                              │
│                    │             │                              │
│                    │ • Structure │                              │
│                    │ • Template  │                              │
│                    │ • Output    │                              │
│                    └─────────────┘                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                        Adapters (Pluggable)                     │
├───────────────┬───────────────┬───────────────┬─────────────────┤
│   Embedding   │    Storage    │    Tokenizer  │     Output      │
│   • OpenAI    │    • SQLite   │    • Tiktoken │     • Text      │
│   • Voyage    │    • Postgres │    • Claude   │     • JSON      │
│   • Local     │    • Memory   │    • Llama    │     • XML       │
└───────────────┴───────────────┴───────────────┴─────────────────┘
```

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. INGEST                                                    │
│    Sources → Chunks                                          │
│    • Read files/APIs                                         │
│    • Parse content                                           │
│    • Extract metadata                                        │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. INDEX                                                     │
│    Chunks → Indexed Chunks                                   │
│    • Generate embeddings                                     │
│    • Store in vector DB                                      │
│    • Build search index                                      │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. SELECT (per query)                                        │
│    Query + Budget → Ranked Chunks                            │
│    • Parse query intent                                      │
│    • Retrieve candidates (embedding search)                  │
│    • Score by multiple signals (relevance, recency, etc.)    │
│    • Rank and fit to budget                                  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. FORMAT                                                    │
│    Ranked Chunks → Structured Context                        │
│    • Order by layer/priority                                 │
│    • Apply template                                          │
│    • Output as string/JSON                                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Public API

### Core Interface

```typescript
interface ContextKit {
  // Setup
  addSource(source: Source): Promise<void>;
  removeSource(id: string): Promise<void>;
  
  // Index management
  index(): Promise<IndexStats>;
  reindex(sourceId?: string): Promise<void>;
  
  // Selection (the main function)
  select(options: SelectOptions): Promise<SelectResult>;
  
  // Observability
  explain(resultId: string): Explanation;
}

interface SelectOptions {
  query: string;
  budget: number;
  layers?: Layer[];
  sources?: string[];       // Filter to specific sources
  includeMetadata?: boolean;
}

interface SelectResult {
  id: string;               // For tracking/explain
  context: string;          // The formatted context
  chunks: ChunkInfo[];      // What was included
  stats: {
    totalTokens: number;
    chunksConsidered: number;
    chunksIncluded: number;
    processingTimeMs: number;
  };
}
```

### CLI Interface

```bash
# Initialize in a project
contextkit init

# Add sources
contextkit source add ./src --type directory
contextkit source add ./docs --type directory

# Index sources
contextkit index

# Select context for a query
contextkit select "How does authentication work?" --budget 8000

# Explain a selection
contextkit explain <result-id>
```

---

## Storage Architecture

### Local Mode (Default)
```
~/.contextkit/
├── config.yaml           # Global config
└── projects/
    └── <project-hash>/
        ├── index.db      # SQLite with chunks + embeddings
        └── cache/        # Embedding cache
```

### Cloud Mode (Optional)
- Hosted API for heavy lifting
- Sync local ↔ cloud
- Team collaboration features

---

## Error Handling

```typescript
// All errors extend ContextKitError
class ContextKitError extends Error {
  code: string;
  recoverable: boolean;
}

// Specific errors
class SourceNotFoundError extends ContextKitError {}
class BudgetExceededError extends ContextKitError {}
class IndexNotReadyError extends ContextKitError {}
class EmbeddingFailedError extends ContextKitError {}
```

**Strategy:**
- Fail fast for configuration errors
- Graceful degradation for runtime errors
- Always return partial results when possible

---

## Caching Strategy

| What | Where | TTL | Invalidation |
|------|-------|-----|--------------|
| Embeddings | Local SQLite | Forever | On content change |
| Index | Local SQLite | Forever | On reindex |
| Query results | Memory | 5 min | Manual or TTL |

---

## Security Considerations

- **API Keys**: Stored in OS keychain, never in config files
- **Source Access**: Respects file system permissions
- **Cloud Sync**: E2E encrypted, opt-in only
- **No Telemetry**: By default, nothing phones home

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | DX, ecosystem, cross-platform |
| Local Storage | SQLite + sqlite-vss | Portable, no deps |
| Default Embeddings | Local model (gte-small) | Offline-first |
| Tokenizer | tiktoken (WASM) | Accurate, fast |
| CLI Framework | Commander.js | Standard, stable |

---

## Testing Strategy

- **Unit Tests**: Every component in isolation
- **Integration Tests**: Full flow with fixtures
- **Snapshot Tests**: Context output stability
- **Determinism Tests**: Same input → same output
- **Performance Tests**: Selection under <100ms for typical queries

---

## Open Questions

- [ ] How to handle very large codebases (>100K files)?
- [ ] Incremental indexing vs full reindex?
- [ ] Plugin system for custom scorers?
