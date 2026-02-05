# Changelog

All notable changes to ContextKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-04

### Added
- **MCP Server** — Model Context Protocol server for Claude Desktop integration
  - New `contextkit mcp` command to start MCP server
  - Standalone `contextkit-mcp` binary for direct MCP usage
  - Three MCP tools: `contextkit_select`, `contextkit_index`, `contextkit_status`
- Comprehensive test suite (49 tests total)
- Demo project in `examples/demo-project/`
- `CONTRIBUTING.md` guide

### Changed
- Improved README with clearer documentation
- Better error messages for uninitialized projects
- Updated package metadata for npm

### Fixed
- Repository URLs now point to pixtools monorepo

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
