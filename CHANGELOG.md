# Changelog

All notable changes to ContextKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.1] - 2026-02-08

### Fixed
- `contextkit cloud pull` now works correctly (fixed response parsing)

## [0.6.0] - 2026-02-08

### Added
- **Cloud Sync** — Sync your indexes to ContextKit Cloud
  - `contextkit cloud login` — Authenticate with API key
  - `contextkit cloud logout` — Sign out
  - `contextkit cloud sync` — Upload index to cloud
  - `contextkit cloud pull` — Download index from cloud
  - `contextkit cloud status` — Show sync status
- Credentials stored securely in `~/.contextkit/credentials`
- Plan-based limits (Free: 1 project/100MB, Pro: 5/1GB)

## [0.5.10] - 2026-02-08

### Added
- **PHP Support** — AST-aware parsing for `.php` files
  - Classes, interfaces, traits, enums
  - Functions and methods
  - Laravel/WordPress/Symfony compatible

## [0.5.9] - 2026-02-08

### Added
- **Java Support** — AST-aware parsing for `.java` files
  - Classes, interfaces, enums, records
  - Methods and constructors
  - Proper signature extraction

- **C# Support** — AST-aware parsing for `.cs` files
  - Classes, interfaces, structs, enums, records
  - Methods, constructors, local functions
  - Expression-bodied member support

## [0.5.8] - 2026-02-08

### Added
- **MCP Symbol Search** — New `contextkit_symbol` tool for AI assistants
  - Search functions, classes, interfaces by name
  - Exact or fuzzy matching
  - Multi-language support (TypeScript, Python, Go, Rust)

- **MCP Call Graph** — New `contextkit_graph` tool for AI assistants
  - Shows callers (who calls this function)
  - Shows callees (what this function calls)
  - Helps AI understand code flow

- **MCP Map Mode** — `contextkit_select` now supports `mode: "map"`
  - Returns only signatures, not full code
  - Uses fewer tokens for codebase overview

### Improved
- MCP `contextkit_status` now shows version and available tools

## [0.5.7] - 2026-02-08

### Improved
- **Better Error Messages** — More helpful errors with recovery suggestions
  - New error types: IndexEmptyError, NoSourcesError, EmbeddingError, QueryError, DatabaseError
  - All errors now suggest next steps
  - Doctor command referenced in error messages

### Documentation
- Added performance benchmarks to README
- Added troubleshooting section with common issues
- Updated roadmap

## [0.5.6] - 2026-02-08

### Added
- **Doctor Command** — Diagnose ContextKit setup and configuration
  - New `contextkit doctor` command
  - Checks: Node version, config, database, embeddings, cache, disk space
  - Color-coded output: ✓ ok, ⚠ warning, ✗ error
  - `--json` flag for programmatic use

## [0.5.5] - 2026-02-06

### Added
- **Symbol Search** — Find code by name, not just similarity
  - New `contextkit symbol <name>` command
  - Supports exact (`--exact`) and fuzzy matching
  - Shows symbol type icons (𝑓 function, ◆ class, ◈ interface, ⊤ type)
  - Multi-language: TypeScript/JavaScript, Python, Go, Rust
  
- **Call Graph** — Understand code dependencies
  - New `contextkit graph <function>` command
  - Shows callers (who calls this function)
  - Shows callees (what this function calls)
  - Helps navigate complex codebases

## [0.5.4] - 2026-02-06

### Added
- **Repo Map Mode** — Show only signatures, not full code
  - New `--mode map` option for `contextkit select`
  - Extracts function/class signatures from TS/JS, Python, Go, Rust
  - Shows markdown headers for documentation files
  - Tree-style output format with file grouping
  - Significantly reduces token usage for codebase overview

## [0.5.3] - 2026-02-06

### Added
- **Markdown Parser** — Structure-aware parsing for documentation files
  - Parses headers as semantic sections
  - Extracts code blocks with language detection
  - Parses YAML front matter as metadata
  - Supports `.md`, `.mdx`, `.markdown`, `.qmd` (Quarto)
  - Documentation content now searchable with structure awareness

## [0.5.2] - 2026-02-06

### Fixed
- Missing `acorn` dependency that caused ERR_MODULE_NOT_FOUND on fresh npx installs
- Added user documentation (getting-started.md, mcp-setup.md, examples/)

## [0.5.1] - 2026-02-06

### Added
- **AST-Aware Chunking** — Code chunks now respect language structure
  - TypeScript/JavaScript parser extracts functions, classes, interfaces as whole units
  - No more splitting functions mid-body
  - Preserves logical code boundaries for better context
  - Extensible parser architecture for future language support
- **Query Caching** — Repeated queries are instant
  - SQLite-based query cache (`query_cache` table)
  - Automatic cache invalidation on index changes
  - New `--no-cache` flag to bypass cache when needed
  - New `contextkit cache clear` to manually clear cache
  - New `contextkit cache stats` to view cache hit rates

### Changed
- Improved chunking quality for TypeScript/JavaScript files
- Better handling of overlapping content in merged chunks

### Fixed
- Edge case in AST parsing for arrow functions with implicit returns

## [0.5.0] - 2026-02-05

### Added
- **Import-Aware Scoring** — Context selection now understands code dependencies
  - Files imported by selected code get boosted automatically
  - Import boost weight (5%) in multi-factor scoring
  - New `--include-imports` flag to automatically include imported files
  - Builds dependency graph from ES6/CommonJS/dynamic imports
- **Multiple Output Formats** — Better integration with different tools
  - `--format markdown` — Default, with syntax-highlighted code blocks
  - `--format xml` — XML structure (Claude prefers XML for structured content)
  - `--format json` — JSON for scripts and programmatic use
  - `--format plain` — Plain text, no formatting (easy clipboard paste)
- **Config Validation** — Helpful error messages for invalid configurations
  - Validates version, sources, paths, patterns, settings
  - Provides actionable suggestions for common mistakes
  - Warns about missing node_modules exclusion, unusual chunk sizes
- 77 new tests (172 total)

## [0.3.0] - 2026-02-05

### Added
- **Incremental Indexing** — Only re-indexes changed/new files (10x faster)
  - File content hashing (SHA-256) for change detection
  - New `--force` flag to bypass incremental and do full re-index
  - Shows changed/unchanged/removed file counts
- **Watch Mode** — Auto-reindex on file changes
  - New `contextkit watch` command
  - Configurable debounce time (`--debounce <ms>`)
  - Graceful shutdown with Ctrl+C
- **Multi-Factor Scoring** — Smarter context ranking
  - Semantic similarity (50% weight)
  - Path match (15%) — query keywords in file path  
  - Content match (15%) — exact keyword matches in content
  - Symbol match (15%) — function/class name detection
  - File type boost (5%) — implementation > tests > config
  - Diversity penalty option to spread context
- New tests for content hashing and scoring (95 total)

## [0.2.0] - 2026-02-04

### Added
- **MCP Server** — Model Context Protocol server for Claude Desktop integration
  - New `contextkit mcp` command to start MCP server
  - Standalone `contextkit-mcp` binary for direct MCP usage
  - Three MCP tools: `contextkit_select`, `contextkit_index`, `contextkit_status`
- **Agent Skill** — SKILL.md for skills.sh ecosystem (`npx skills add milo4jo/contextkit`)
- Comprehensive test suite (83 tests)
- Demo project in `examples/demo-project/`
- `CONTRIBUTING.md` guide
- Landing page at contextkit-site.vercel.app

### Changed
- Improved README with clearer documentation
- Better error messages for uninitialized projects
- Updated package metadata for npm

### Fixed
- Duplicate content when merging overlapping chunks
- MCP server source count query

## [0.1.2] - 2026-02-01

### Fixed
- Embedding model download progress display
- Chunk ID generation for high-overlap scenarios

## [0.1.1] - 2026-01-30

### Fixed
- CLI help text formatting
- Source path resolution on Windows

## [0.1.0] - 2026-01-28

### Added
- Initial release
- `contextkit init` — Initialize in project directory
- `contextkit source add/list/remove` — Manage source directories
- `contextkit index` — Index code using local embeddings
- `contextkit select` — Find relevant context for a query
- Local-first architecture (embeddings stored in `.contextkit/`)
- Token budget management
- JSON output support for scripting
- `--explain` flag for score debugging

## [0.6.2] - 2026-02-08

### Added
- `contextkit status` command — Show project status, index stats, and cloud status
- `--copy` flag for `select` command — Copy output directly to clipboard

### Changed
- Improved help text with status command

## [0.6.3] - 2026-02-08

### Fixed
- Call graph now correctly identifies function calls across multiple chunks
- Fixed call graph showing incorrect callers due to chunk boundary issues
- Method detection in classes now works properly
