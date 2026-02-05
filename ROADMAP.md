# ContextKit v1.0 Roadmap

> From MVP to Production-Ready Release

## Current Status (v0.2.0)

✅ **Done:**
- Core CLI (init, source, index, select)
- Local-first architecture (embeddings stored locally)
- MCP Server for Claude Desktop
- 83 tests passing
- Agent Skill for skills.sh
- Landing page (contextkit-site.vercel.app)
- npm package (@milo4jo/contextkit)

## v1.0 Requirements

### 🔴 Critical (Must Have)

#### 1. Incremental Indexing
**Problem:** Currently re-indexes everything on every `contextkit index` call.
**Solution:** Track file hashes, only re-index changed files.
**Impact:** 10x faster for large codebases.

```typescript
// Store file hash in DB
interface FileRecord {
  path: string;
  hash: string;  // SHA-256 of content
  indexed_at: Date;
}

// On index: skip files where hash matches
```

#### 2. Watch Mode
**Problem:** Manual re-indexing is friction.
**Solution:** `contextkit watch` that auto-reindexes on file save.
**Impact:** Seamless developer experience.

```bash
contextkit watch              # Watch all sources
contextkit watch --debounce 2s  # Debounce rapid saves
```

#### 3. Better Scoring Algorithm
**Problem:** Pure cosine similarity misses nuance.
**Solution:** Multi-factor scoring:
- Semantic similarity (embeddings)
- Path relevance (query mentions "auth" → boost auth/)
- Recency (recently modified files)
- Dependency graph (imported by relevant files)

#### 4. Proper Error Messages
**Problem:** Generic errors confuse users.
**Solution:** Actionable error messages with suggested fixes.

```
❌ Before: "Database error"
✅ After:  "Index not found. Run `contextkit index` first."
```

### 🟡 Important (Should Have)

#### 5. Config Validation
- Validate config.yaml on load
- Warn about invalid patterns
- Suggest fixes for common mistakes

#### 6. Ignore Patterns
- Respect .gitignore by default
- Support .contextkitignore
- Smart defaults for node_modules, dist, etc.

#### 7. Multiple Output Formats
```bash
contextkit select "query" --format markdown  # Current
contextkit select "query" --format xml       # For Claude
contextkit select "query" --format json      # For scripts
contextkit select "query" --format clipboard # Direct to clipboard
```

#### 8. Progress Indicators
- Show indexing progress (files, chunks)
- Estimated time remaining
- Spinner for long operations

### 🟢 Nice to Have (v1.1+)

#### 9. VS Code Extension
- Sidebar showing indexed status
- Quick select from command palette
- Inline context suggestions

#### 10. Cursor Integration
- Custom MCP server for Cursor
- Direct integration via settings

#### 11. Context Recipes
Pre-built configurations:
- `contextkit init --recipe typescript`
- `contextkit init --recipe python`
- `contextkit init --recipe monorepo`

#### 12. Cloud Sync (Optional)
- Sync index across machines
- Team sharing
- Paid feature for sustainability

---

## Technical Debt

### Must Fix Before v1.0

1. **Test Coverage Gaps:**
   - Integration tests for full CLI flow
   - E2E tests with real embedding model
   - Error path testing

2. **Documentation:**
   - API documentation for programmatic use
   - Architecture diagram
   - Troubleshooting guide

3. **Performance:**
   - Benchmark suite
   - Memory profiling for large repos
   - Startup time optimization

4. **Cross-Platform:**
   - Test on Windows
   - Test on Linux
   - Path handling edge cases

---

## Release Plan

### v0.3.0 — Incremental + Watch
- [x] Incremental indexing
- [x] Watch mode
- [x] File hash tracking
- [ ] Better progress indicators

### v0.4.0 — Scoring + Formats
- [x] Multi-factor scoring
- [ ] Output format options
- [ ] Config validation
- [ ] Improved error messages

### v0.5.0 — Polish
- [ ] Respect .gitignore
- [ ] Integration tests
- [ ] Documentation overhaul
- [ ] Cross-platform testing

### v1.0.0 — Production Ready
- [ ] Stability guarantees
- [ ] Semantic versioning commitment
- [ ] Performance benchmarks
- [ ] Security audit
- [ ] Final documentation review

---

## Success Metrics for v1.0

1. **Reliability:** Zero data loss, graceful error handling
2. **Performance:** Index 10K files in <60s, select in <1s
3. **Usability:** 5-minute setup, intuitive commands
4. **Adoption:** 100+ npm installs, 50+ GitHub stars

---

## Open Questions

- [ ] Should we support multiple embedding models?
- [ ] How to handle very large files (>10K lines)?
- [ ] Streaming output for MCP?
- [ ] Plugin system for custom scorers?

---

*Last updated: 2026-02-05*
