# Vision

## One-Liner

ContextKit is the intelligent layer that selects and structures the right context for any LLM query.

## What We Are (and Aren't)

**We ARE:**
- A context selection and optimization engine
- A library/service that returns optimized context
- Model-agnostic — works with any LLM

**We are NOT:**
- An LLM gateway (use Helicone, Portkey for that)
- A vector database (we use them under the hood)
- A full RAG framework (we focus only on context)

## Core Principle: Single Responsibility

ContextKit does ONE thing: **Select the optimal context for a query.**

```
Input:  Query + Sources + Budget
Output: Optimized Context (structured text)
```

The developer decides what to do with that context — send it to Claude, GPT, Llama, whatever.

## The Future We're Building

Every AI application needs to answer: "What context should I give the model?"

Today, developers:
- Dump everything in (expensive, noisy)
- Use basic RAG (misses nuance)
- Hand-craft rules (doesn't scale)

**ContextKit makes it simple:**

```typescript
import { ContextKit } from 'contextkit';

const ctx = new ContextKit({ sources: [codebase, docs] });

// Get optimized context
const result = await ctx.select({
  query: userMessage,
  budget: 8000,
});

// Use with any LLM
const response = await llm.complete({
  prompt: result.context + '\n\n' + userMessage,
});
```

## Core Beliefs

1. **Context is the moat** — Models commoditize. How you feed them differentiates.

2. **Relevance ≠ Similarity** — Embedding distance is a proxy. True relevance requires understanding intent.

3. **Observability is essential** — You can't improve what you can't measure.

4. **Developer experience matters** — If it's hard, people build their own (badly).

5. **Offline-first** — Core functionality must work without internet.

## Where We Want to Be in 2 Years

- Standard tool in the AI developer stack
- Powers context for 10,000+ applications
- $1M ARR through B2D + B2B

## Principles

- **Do one thing well** — Context selection only
- **Open core** — CLI/SDK open source, cloud features paid
- **Local-first** — Works offline, cloud enhances
- **Eat our own dogfood** — Build ContextKit with ContextKit
