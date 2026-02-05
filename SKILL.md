---
name: contextkit
description: Use ContextKit CLI to intelligently select code context for LLM prompts. Use when you need to find relevant code chunks for a query, index a codebase for semantic search, or optimize context for token budgets. Triggers on "find relevant code", "select context", "index codebase", "semantic code search", "optimize context window", or when preparing code context for AI assistants.
license: MIT
metadata:
  author: milo4jo
  version: "1.0.0"
  homepage: https://contextkit-site.vercel.app
  repository: https://github.com/milo4jo/contextkit
---

# ContextKit

Intelligent context selection for LLM applications. Stop dumping your entire codebase into AI prompts.

## Install

```bash
npm install -g @milo4jo/contextkit
```

## Quick Start

```bash
# Initialize in project root
contextkit init

# Add source directories
contextkit source add ./src

# Build the index (creates local embeddings)
contextkit index

# Find relevant context for a query
contextkit select "How does authentication work?"
```

## Commands

### init

Initialize ContextKit in current directory. Creates `.contextkit/` folder with config and database.

```bash
contextkit init
```

### source

Manage source directories to index.

```bash
contextkit source add ./src
contextkit source add ./lib --name "Library Code"
contextkit source list
contextkit source remove ./src
```

### index

Build or update the semantic index. Processes files into chunks and generates embeddings locally.

```bash
contextkit index
contextkit index --force  # Re-index everything
```

### select

Find relevant code chunks for a query. Returns formatted context ready for LLM prompts.

```bash
contextkit select "How does the payment flow work?"
contextkit select "authentication" --budget 4000  # Token budget
contextkit select "database queries" --format markdown
```

Options:
- `--budget <tokens>`: Maximum tokens to return (default: 8000)
- `--format <type>`: Output format (markdown|plain|json)
- `--top <n>`: Maximum chunks to return

### status

Show index status and statistics.

```bash
contextkit status
```

## MCP Server

ContextKit includes an MCP server for Claude Desktop integration.

### Setup

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "contextkit": {
      "command": "contextkit-mcp"
    }
  }
}
```

### Available Tools

- `contextkit_select`: Find relevant context for a query
- `contextkit_index`: Rebuild the codebase index
- `contextkit_status`: Check index status

## Best Practices

1. **Index frequently changed code**: Re-run `contextkit index` after significant changes
2. **Use specific queries**: "How does JWT validation work?" beats "authentication"
3. **Adjust token budget**: Match your model's context window minus other content
4. **Combine with manual context**: Use ContextKit output alongside specific files you know are relevant

## Typical Workflow

```bash
# Before asking Claude about your codebase:
contextkit select "your question here" | pbcopy

# Then paste into your prompt alongside the question
```

Or with MCP: Claude automatically calls `contextkit_select` when it needs code context.
