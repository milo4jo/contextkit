# Vision

## One-Liner

ContextKit is the missing infrastructure layer between your data and your LLM.

## The Future We're Building

Every AI application will need context management. Today, developers cobble together RAG pipelines, vector databases, and custom logic. It's complex, error-prone, and expensive.

**ContextKit makes it simple:**

```typescript
import { ContextKit } from 'contextkit';

const ctx = new ContextKit({
  sources: [codebase, docs, userHistory],
});

// Automatically selects optimal context for any query
const response = await ctx.complete({
  model: 'claude-3',
  query: userMessage,
  maxContextTokens: 8000,
});
```

## Core Beliefs

1. **Context is the moat** — The model is commoditizing. How you feed it information is the differentiator.

2. **Relevance ≠ Similarity** — Embedding distance is a proxy, not the answer. True relevance requires understanding intent.

3. **Context should be observable** — You can't improve what you can't measure. Every token should be traceable.

4. **Developer experience matters** — If it's hard to use, people will build their own (badly).

## Where We Want to Be in 2 Years

- Standard tool in the AI developer stack (like Sentry for errors)
- Powers context for 10,000+ AI applications
- Clear path to $1M ARR through B2D + B2B

## Principles

- **Start small, do one thing well** — Context selection first, expand later
- **Open core** — SDK is open source, advanced features are paid
- **Eat our own dogfood** — Use ContextKit to build ContextKit
