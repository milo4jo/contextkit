# ContextKit Competitive Research

> Research conducted 2026-02-05 by Milo 🦊

## Executive Summary

ContextKit operates in a growing market of AI coding assistant tools. The main competitors are:

1. **Serena** (oraios/serena) - **Direct competitor, ahead of us**
2. **Context7** (upstash/context7) - Different use case (library docs, not codebase)

**Key insight:** Serena has a significant technical advantage through **LSP (Language Server Protocol) integration**, enabling symbol-level code understanding. ContextKit currently uses text embeddings, which is simpler but less precise.

---

## Competitor Analysis

### Serena (oraios/serena)
**GitHub:** ~2k+ stars, sponsored by VS Code team  
**Approach:** LSP-based semantic code retrieval and editing

#### Strengths
- **Symbol-level operations**: `find_symbol`, `find_referencing_symbols`, `replace_symbol_body`
- **30+ language support** via Language Server Protocol
- **Type hierarchy traversal** (find subtypes/supertypes)
- **JetBrains plugin** for robust IDE-level analysis
- **Memory system** for project-specific notes
- **Refactoring support** (rename symbol across codebase)
- **Strong community** - called "game changer" on Reddit

#### Weaknesses
- Complex setup (requires language servers)
- Python-only implementation
- Heavier dependencies

#### Key Tools
```
find_symbol          - Global symbol search via LSP
find_referencing_symbols - Find all references to a symbol
get_symbols_overview - Top-level symbols in a file
replace_symbol_body  - Replace entire function/class
insert_after_symbol  - Insert code after a symbol
rename_symbol        - Refactor rename across codebase
```

### Context7 (upstash/context7)
**GitHub:** 7k+ stars  
**Approach:** Cloud API for fetching library documentation

#### What It Does
- Fetches up-to-date docs for external libraries (React, Next.js, etc.)
- NOT for your codebase - for third-party library docs
- Requires API key / cloud service
- "use context7" prompt syntax

#### Why It's Not a Direct Competitor
Context7 solves: "How do I use this library?"
ContextKit solves: "Where in MY codebase does X happen?"

Different use cases - potentially complementary.

---

## Gap Analysis: ContextKit vs Serena

| Feature | ContextKit | Serena | Gap |
|---------|-----------|--------|-----|
| Semantic search | ✅ Embeddings | ✅ LSP | Different approach |
| Symbol-level ops | ❌ | ✅ | **Critical gap** |
| Find references | ❌ | ✅ | **Critical gap** |
| Type hierarchy | ❌ | ✅ | Nice to have |
| Refactoring | ❌ | ✅ | Nice to have |
| Language support | All (text-based) | 30+ (LSP) | Trade-off |
| Setup complexity | Simple | Complex | ✅ Our advantage |
| Local-first | ✅ | ✅ | Parity |
| MCP server | ✅ | ✅ | Parity |
| Memory system | ❌ | ✅ | Nice to have |
| Watch mode | ✅ | ❌ | ✅ Our advantage |
| Incremental index | ✅ | N/A | ✅ Our advantage |

---

## Strategic Options

### Option A: Compete Head-On with LSP
Add LSP integration to match Serena's capabilities.

**Pros:**
- Feature parity with leader
- Symbol-level precision

**Cons:**
- Massive engineering effort
- Complex dependencies
- Serena has 2+ year head start

**Verdict:** ❌ Not recommended short-term

### Option B: Differentiate on Simplicity
Position ContextKit as the "simple, fast" alternative.

**Pros:**
- Works with any text file
- No language server setup
- Quick 5-minute onboarding
- Embeddings catch semantic similarity LSP misses

**Cons:**
- Less precise than LSP
- Can't do refactoring

**Verdict:** ✅ Recommended - play to our strengths

### Option C: Hybrid Approach
Keep embeddings as base, add optional LSP for supported languages.

**Pros:**
- Best of both worlds
- Progressive enhancement

**Cons:**
- Engineering complexity
- Maintenance burden

**Verdict:** 🟡 Consider for v1.5+

---

## Recommended Roadmap to v1.0

### v0.4.0 - Output & UX Polish
- [ ] Multiple output formats (markdown, xml, json, clipboard)
- [ ] `--format xml` for Claude's XML preference
- [ ] Direct clipboard copy: `contextkit select "query" | pbcopy`
- [ ] Config validation with helpful errors
- [ ] Progress spinners for long operations

### v0.5.0 - Smarter Retrieval
- [ ] **Code structure awareness** (without full LSP):
  - Extract function/class names via regex/tree-sitter
  - Boost chunks containing query-mentioned symbols
  - Show "Related: function_name()" in output
- [ ] **Dependency awareness**:
  - Parse imports to understand file relationships
  - Boost files imported by already-selected files
- [ ] Respect .gitignore by default

### v0.6.0 - Developer Experience
- [ ] `contextkit doctor` - diagnose issues
- [ ] `contextkit stats` - show index statistics
- [ ] Integration tests for CLI
- [ ] Cross-platform testing (Windows, Linux)

### v0.7.0 - Advanced Features
- [ ] **Context recipes**: `contextkit init --recipe nextjs`
- [ ] **Query history**: `contextkit history`
- [ ] **Favorites**: Save frequent queries
- [ ] Performance benchmarks

### v0.8.0 - Ecosystem
- [ ] VS Code extension (basic)
- [ ] Cursor integration guide
- [ ] More MCP tools

### v0.9.0 - Production Polish
- [ ] Security audit
- [ ] Documentation overhaul
- [ ] Troubleshooting guide
- [ ] Community templates

### v1.0.0 - Launch
- [ ] Stability guarantees
- [ ] Semantic versioning commitment
- [ ] Launch marketing

---

## Unique Value Proposition

**ContextKit is the fastest way to get relevant context from your codebase into your AI prompts.**

vs Serena: "Simpler setup, works with any file type, no language server needed"
vs Context7: "For YOUR code, not just library docs"
vs Manual: "Automatic relevance ranking, token budget management"

---

## Feature Ideas from Research

### From Serena
1. **Memory system** - Store project-specific notes
2. **Onboarding command** - Auto-detect project structure
3. **Think tools** - Structured reasoning prompts

### From Context7
1. **Version-specific matching** - Query mentions "Next.js 14" → match docs
2. **Library ID shortcuts** - `/react/hooks` syntax

### From Reddit Discussions
1. **Context persistence** - Don't re-explain project structure
2. **Intelligent file grouping** - Related files together
3. **Usage examples** - Show how functions are used, not just definitions

---

## Metrics for Success

Before v1.0 launch:
- 95%+ test coverage
- <2s select time for 10k file repos  
- Works on Windows, macOS, Linux
- 5-minute setup time
- Zero-config for common project types

Post-launch:
- 500+ npm weekly downloads
- 100+ GitHub stars
- 10+ community mentions

---

## Conclusion

ContextKit should **not** try to out-feature Serena. Instead:

1. **Own simplicity** - "Just works" with any codebase
2. **Perfect the basics** - Fast, accurate, reliable
3. **Great docs** - Make it easy to understand and use
4. **Community focus** - Respond fast, ship what users want

The AI coding tools market is early. There's room for multiple approaches. ContextKit's embedding-based approach has legitimate advantages (works with any text, catches semantic similarity) that LSP-based tools miss.

---

*Research by Milo 🦊 | 2026-02-05*
