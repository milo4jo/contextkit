# Competitive Landscape

## Direct Competitors

### LlamaIndex
**What it is:** Framework for connecting LLMs to data
**Strengths:**
- Comprehensive
- Large community
- Many integrations

**Weaknesses:**
- Complex, steep learning curve
- Framework lock-in
- No hosted option (DIY)

**Our angle:** Simpler, opinionated, hosted-first

---

### LangChain
**What it is:** Framework for building LLM applications
**Strengths:**
- Very popular
- Lots of examples
- Broad scope

**Weaknesses:**
- Complexity explosion
- Abstractions leak
- Jack of all trades

**Our angle:** Focused purely on context, does one thing well

---

### Pinecone / Weaviate / Chroma
**What it is:** Vector databases
**Strengths:**
- Good at similarity search
- Scalable
- Well-documented

**Weaknesses:**
- Just storage + retrieval
- No intelligence in selection
- You still need to build the logic

**Our angle:** We use vector DBs under the hood, but add the intelligence layer

---

## Adjacent Players

### Helicone / Portkey
**What it is:** LLM observability/gateway
**Focus:** Logging, caching, cost tracking
**Gap:** No context management

### Dust.tt
**What it is:** Internal AI assistant builder
**Focus:** Non-technical users
**Gap:** Not a developer tool

### Vellum.ai
**What it is:** Prompt engineering platform
**Focus:** Prompt management, testing
**Gap:** Context is manual

## Market Positioning

```
                    Developer-Focused
                          ↑
                          |
        LangChain    [ContextKit]     Dust
              ╲           |           ╱
               ╲          |          ╱
    Framework ←──────────────────────→ Platform
               ╱          |          ╲
              ╱           |           ╲
        LlamaIndex    Pinecone     Vellum
                          |
                          ↓
                    Infrastructure
```

## Our Differentiation

1. **Focused** — Only context, nothing else
2. **Simple** — Works in 5 minutes, not 5 hours
3. **Observable** — See exactly what's happening
4. **Opinionated** — Best practices built-in

## Open Questions

- [ ] Is "context management" a category people search for?
- [ ] What's the wedge? (First feature that gets adoption)
- [ ] Open source core vs. fully proprietary?
