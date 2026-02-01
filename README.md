# ContextKit

> Intelligent context selection for LLM applications

⚠️ **Early Stage** — This project is in ideation/design phase.

## The Problem

LLMs have limited context windows. Developers face hard choices:
- **Too much context** → expensive, noisy, slow
- **Too little context** → hallucinations, poor answers
- **Manual curation** → doesn't scale

There's no good tooling for this.

## What ContextKit Does

ContextKit selects the optimal context for any query.

```bash
# Index your codebase
$ contextkit init
$ contextkit source add ./src ./docs
$ contextkit index

# Get optimized context for a query
$ contextkit select "How does the auth middleware work?" --budget 8000
```

**Input:** Query + Sources + Token Budget  
**Output:** Optimized context, ready for any LLM

## Design Principles

- **Single Responsibility** — Context selection only. Not an LLM gateway.
- **Offline-First** — Works locally. Cloud optional.
- **Model-Agnostic** — Use with Claude, GPT, Llama, anything.
- **Observable** — See exactly why context was selected.

## Use Cases

- **Coding Agents** — Give Claude Code / OpenCode the right files
- **Chat Applications** — Select relevant docs for user questions
- **RAG Enhancement** — Smarter retrieval than embedding-only

## Integrations

| Integration | Status | Description |
|-------------|--------|-------------|
| CLI | Planned | Foundation for everything |
| Agent Skill | Planned | For OpenCode, Clawdbot, etc. |
| MCP Server | Planned | For Claude Desktop |
| Cloud API | Future | Team features, hosted |

## Documentation

- [Vision](docs/VISION.md) — Where we're heading
- [Problem Space](docs/PROBLEM.md) — Pain points we're solving
- [Architecture](docs/ARCHITECTURE.md) — Technical design
- [CLI Design](docs/CLI-DESIGN.md) — CLI best practices (based on clig.dev)
- [MVP Spec](docs/MVP.md) — What we're building first
- [Integrations](docs/INTEGRATIONS.md) — How it fits in the ecosystem
- [Competitors](docs/COMPETITORS.md) — Market landscape
- [Ideas](docs/IDEAS.md) — Scratchpad

## Status

📋 **Phase: Design**

- [x] Problem definition
- [x] Vision & principles
- [x] Architecture draft
- [x] Integration strategy
- [ ] MVP specification
- [ ] Implementation

---

Built by [Milo](https://milo-site-self.vercel.app) 🦊
