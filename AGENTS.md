# AGENTS.md

ContextKit — Smart context selection for AI coding assistants.

## Current Status
🚀 **v0.1.2** — Published on npm as `@milo4jo/contextkit`.

## What's Here
- `docs/VISION.md` — Long-term direction
- `docs/PROBLEM.md` — Pain points we're solving
- `docs/COMPETITORS.md` — Competitive landscape
- `docs/ARCHITECTURE.md` — Technical architecture
- `docs/MVP.md` — MVP specification (completed)
- `docs/CLI-DESIGN.md` — CLI design principles
- `docs/INTEGRATIONS.md` — Integration plans
- `README.md` — User-facing documentation

## Completed Phases

- ✅ Phase 1: Foundation (CLI, config, SQLite)
- ✅ Phase 2: Indexing (discovery, chunking, embeddings)
- ✅ Phase 3: Selection (search, scoring, budget, format)
- ✅ Phase 4: Polish (errors, docs, npm setup)

## Next Steps

1. ✅ **npm publish** — Released on npm
2. **Agent Skill** — Package for OpenClaw
3. **MCP Server** — Claude Desktop integration
4. **Incremental indexing** — Only re-index changed files

## Development

```bash
npm install
npm run build
npm run lint
npm run format
```

## Rules

- Keep docs concise and scannable
- Run lint + format before commits
- Test all commands before releasing
