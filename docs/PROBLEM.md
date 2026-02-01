# Problem Space

## The Core Problem

Developers building AI features need to give LLMs the right context. This is harder than it sounds.

## Pain Points

### 1. Context Selection is Hard

**What developers do today:**
- Naive: Dump everything in (expensive, hits limits)
- RAG: Embedding search (misses nuance, returns "similar" not "relevant")
- Manual: Hand-craft what goes in (doesn't scale)

**The pain:**
- Hours spent tuning retrieval
- Inconsistent results
- No visibility into what's working

### 2. Context Windows Are Expensive

**The math:**
- GPT-4 Turbo: $10/1M input tokens
- Claude 3 Opus: $15/1M input tokens
- 100K context window filled = $1-1.50 per request

**The pain:**
- Costs explode with scale
- No tooling to optimize token usage
- Hard to know what's actually being used

### 3. No Observability

**What developers lack:**
- Which context influenced the output?
- Is this context stale?
- Why did the model hallucinate?

**The pain:**
- Debugging is guesswork
- Can't improve systematically
- Compliance/audit is impossible

### 4. Context Versioning Doesn't Exist

**What developers need:**
- Test different context strategies
- Roll back when something breaks
- A/B test context configurations

**The pain:**
- Context is treated as code, but without git
- No experiment framework
- Changes are scary

## Who Feels This Pain?

### B2D (Developers)
- Indie hackers building AI wrappers
- Startups adding AI features
- Developers at larger companies prototyping

**Budget:** $20-200/mo for tools
**Decision:** Individual developer

### B2B (Companies)
- Companies deploying AI agents/copilots
- Enterprise with compliance requirements
- Teams with complex knowledge bases

**Budget:** $500-5000/mo
**Decision:** Engineering lead / CTO

## Quantifying the Pain

- **Time wasted:** 10-20 hours per project on context engineering
- **Cost overhead:** 30-50% of token spend on irrelevant context
- **Quality impact:** Unmeasurable (but real)

## Why Now?

1. **Context windows just got huge** — 100K-200K tokens is standard. More rope to hang yourself.
2. **AI is going mainstream** — Every app will have AI features. Scale of problem is exploding.
3. **Models are commoditizing** — Differentiation is shifting to how you use them.
4. **RAG is not enough** — People are realizing embedding search has limits.
