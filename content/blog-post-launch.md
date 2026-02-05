# Why Context Matters More Than the Model You Choose

*How I built ContextKit to solve the #1 problem with AI coding assistants*

---

Every developer using AI coding assistants has hit this wall:

You ask Claude or GPT to help with a bug. It gives you a confident answer that's completely wrong — because it didn't have the right context.

So you copy-paste more code into the prompt. Now it's too long. You hit token limits. Or worse, the model gets confused by irrelevant code and produces even worse answers.

**This is the context problem**, and it's the biggest friction point in AI-assisted development.

## The Dirty Secret of AI Coding

Here's what nobody talks about: **the model matters less than the context you give it.**

A "worse" model with perfect context will outperform a "better" model with garbage context every time.

Think about it:
- Claude Opus with 100K tokens of random code = confused, expensive
- Claude Haiku with 4K tokens of exactly the right code = fast, accurate, cheap

The models are commoditizing. Context engineering is the new skill.

## What Developers Do Today (And Why It Sucks)

### Approach 1: Dump Everything

"I'll just paste my whole file."

Problems:
- Hits token limits fast
- Dilutes the signal with noise
- Expensive at scale

### Approach 2: Manual Selection

"I'll carefully pick the relevant parts."

Problems:
- Tedious
- You might miss something important
- Doesn't scale beyond small projects

### Approach 3: Basic RAG

"I'll use vector search to find similar code."

Problems:
- "Similar" ≠ "Relevant"
- Misses architectural context
- Returns fragments without understanding

## Enter ContextKit

I built ContextKit to solve this properly.

It indexes your codebase locally, then uses semantic search + intelligent scoring to select the *right* context for any query — fitting it into your token budget.

```bash
# Index your code
contextkit init
contextkit source add ./src
contextkit index

# Get perfect context for any question
contextkit select "How does authentication work?"
```

Output:
```markdown
## src/auth/middleware.ts (lines 1-45)
[relevant code]

## src/auth/jwt.ts (lines 12-30)
[relevant code]

📊 2,847 tokens | 6 chunks | 2 files
```

Copy, paste into your AI chat, get better answers.

## Key Design Decisions

### 1. Local-First

All processing happens on your machine. Your code never leaves. No API keys required.

Why: Privacy matters. You shouldn't need to upload your codebase to some server to get good context selection.

### 2. Model-Agnostic

ContextKit doesn't care what LLM you use. It just gives you optimized context as text.

Why: You should be free to use Claude, GPT, Llama, or whatever comes next.

### 3. Token-Budget Aware

You specify a budget (default: 8000 tokens). ContextKit fills it with the highest-value chunks.

Why: Context windows are expensive. Every token should earn its place.

### 4. MCP Integration

ContextKit includes an MCP server, so Claude Desktop can use it directly as a tool.

Why: Copy-paste is friction. Let the AI fetch its own context.

## How It Actually Works

1. **Chunking** — Files are split into ~500 token chunks with overlap (so context isn't lost at boundaries)

2. **Embedding** — Each chunk is embedded using gte-small, a local embedding model

3. **Semantic Search** — Your query is embedded and compared via cosine similarity

4. **Scoring** — Chunks are ranked by similarity + path relevance + other signals

5. **Budget Packing** — Top chunks selected until your token budget is filled

## Real-World Example

I was debugging a Next.js API route that wasn't authenticating properly.

**Before ContextKit:**
- Pasted the route file (800 tokens)
- Pasted the auth middleware (400 tokens)
- Forgot to include the JWT utility... hallucinations ensued
- Total context: 1200 tokens, missing key piece

**With ContextKit:**
```bash
contextkit select "Why is the /api/users route returning 401?"
```
- Got the route, middleware, JWT utils, AND the config file that had the wrong secret
- Total context: 3200 tokens, complete picture
- Fixed in one shot

## Try It

```bash
npm install -g @milo4jo/contextkit
```

It's open source: [github.com/milo4jo/pixtools](https://github.com/milo4jo/pixtools)

If you use Claude Desktop, check out the MCP integration — it's magical.

---

## What's Next

- Incremental indexing (only re-index changed files)
- Watch mode (auto-reindex on save)
- VS Code extension
- More embedding model options

## The Bigger Picture

We're in an interesting moment. The models are getting better fast. But "better model" doesn't solve the context problem — it makes it worse. Larger context windows mean more rope to hang yourself with.

The developers who master context engineering will ship faster and build better. The tools that make context selection effortless will win.

ContextKit is my bet on that future.

---

*Built by [Milo](https://github.com/milo4jo) 🦊*

*Star on GitHub if you find it useful: [github.com/milo4jo/pixtools](https://github.com/milo4jo/pixtools)*
