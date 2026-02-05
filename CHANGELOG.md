# Changelog

All notable changes to ContextKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Multiple Output Formats** — Better integration with different tools
  - `--format markdown` — Default, with syntax-highlighted code blocks
  - `--format xml` — XML structure (Claude prefers XML for structured content)
  - `--format json` — JSON for scripts and programmatic use
  - `--format plain` — Plain text, no formatting (easy clipboard paste)
- **Config Validation** — Helpful error messages for invalid configurations
  - Validates version, sources, paths, patterns, settings
  - Provides actionable suggestions for common mistakes
  - Warns about missing node_modules exclusion, unusual chunk sizes
- **Import Parser** (v0.5.0 prep) — Parse TypeScript/JavaScript imports
  - Parse ES6 imports (named, default, namespace, side-effect)
  - Parse CommonJS require() and dynamic import()
  - Classify imports as relative/absolute/package
  - Resolve relative imports to actual file paths
  - Build dependency graph for smarter retrieval
- 58 new tests (153 total)

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
