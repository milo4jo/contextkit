# Architecture (Draft)

> ⚠️ This is early thinking. Everything is subject to change.

## High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                        ContextKit                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Sources   │  │   Engine    │  │     Analytics       │ │
│  │             │  │             │  │                     │ │
│  │ • Files     │  │ • Selector  │  │ • Token tracking    │ │
│  │ • APIs      │→ │ • Ranker    │→ │ • Usage patterns    │ │
│  │ • DBs       │  │ • Compressor│  │ • Quality signals   │ │
│  │ • Memory    │  │ • Formatter │  │ • Cost analysis     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                          ↓                                  │
│                   ┌─────────────┐                          │
│                   │   Output    │                          │
│                   │             │                          │
│                   │ Optimized   │                          │
│                   │ Context     │                          │
│                   └─────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Context Sources
Where information comes from:
- **Static**: Files, documents, system prompts
- **Dynamic**: User data, session history, API responses
- **Computed**: Summaries, aggregations

### 2. Context Layers
How information is prioritized:

```typescript
const layers = {
  system: {        // Always included, never trimmed
    priority: 1,
    content: systemPrompt,
  },
  user: {          // User-specific, high priority
    priority: 2,
    content: userProfile,
  },
  task: {          // Current task context
    priority: 3,
    content: relevantDocs,
  },
  history: {       // Conversation history, can be trimmed
    priority: 4,
    content: recentMessages,
  },
};
```

### 3. Selection Strategies
How we pick what goes in:

- **Relevance**: Semantic similarity to query
- **Recency**: Newer = more relevant
- **Frequency**: Often accessed = important
- **Explicit**: Developer-defined rules
- **Learned**: ML model based on feedback

### 4. Token Budget
How we manage limits:

```typescript
const budget = {
  total: 8000,
  reserved: {
    system: 500,      // Always reserved
    response: 2000,   // Leave room for output
  },
  available: 5500,    // For dynamic content
};
```

## Data Flow

```
User Query
    ↓
┌───────────────────┐
│ 1. Parse Intent   │  What is the user trying to do?
└───────────────────┘
    ↓
┌───────────────────┐
│ 2. Gather         │  Pull from all registered sources
│    Candidates     │
└───────────────────┘
    ↓
┌───────────────────┐
│ 3. Score &        │  Rank by relevance + other signals
│    Rank           │
└───────────────────┘
    ↓
┌───────────────────┐
│ 4. Fit to         │  Select top items within budget
│    Budget         │
└───────────────────┘
    ↓
┌───────────────────┐
│ 5. Format         │  Structure for optimal LLM parsing
└───────────────────┘
    ↓
Optimized Context
```

## API Sketch

```typescript
import { ContextKit } from 'contextkit';

// Initialize
const ctx = new ContextKit({
  apiKey: 'ck_...',
});

// Register sources
ctx.addSource('codebase', {
  type: 'github',
  repo: 'myorg/myrepo',
  sync: 'realtime',
});

ctx.addSource('docs', {
  type: 'notion',
  workspace: 'xxx',
});

// Build context for a query
const context = await ctx.build({
  query: 'How do I deploy to production?',
  budget: 8000,
  layers: ['system', 'docs', 'codebase'],
});

// Use with any LLM
const response = await anthropic.messages.create({
  model: 'claude-3-sonnet',
  messages: [
    { role: 'user', content: context.formatted + '\n\n' + userQuery },
  ],
});

// Track what worked
await ctx.feedback({
  contextId: context.id,
  rating: 'positive', // or 'negative'
});
```

## Tech Stack (Tentative)

- **Language**: TypeScript (SDK), Python (ML components)
- **API**: Next.js API routes or Hono
- **Database**: Supabase (Postgres + pgvector)
- **Queue**: Inngest or Trigger.dev
- **Hosting**: Vercel
- **Embeddings**: OpenAI or Voyage

## Open Technical Questions

- [ ] How to handle real-time source updates?
- [ ] Caching strategy for embeddings?
- [ ] How to measure context "quality"?
- [ ] Self-hosted vs cloud-only?
