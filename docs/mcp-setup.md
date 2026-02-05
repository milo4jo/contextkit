# MCP Setup Guide — Claude Desktop Integration

ContextKit includes a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for seamless integration with Claude Desktop and other MCP-compatible AI assistants.

## What is MCP?

MCP is an open protocol that allows AI assistants to interact with external tools. With ContextKit's MCP server, Claude can:

- **Select context** from your indexed codebase
- **Re-index** when files change
- **Check status** of your ContextKit configuration

All without leaving the Claude Desktop app.

## Setup

### 1. Install ContextKit Globally

```bash
npm install -g @milo4jo/contextkit
```

### 2. Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add ContextKit as an MCP server:

```json
{
  "mcpServers": {
    "contextkit": {
      "command": "contextkit-mcp",
      "env": {
        "CONTEXTKIT_PROJECT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

> **Important:** Use the absolute path to your project directory.

### 3. Restart Claude Desktop

Quit and reopen Claude Desktop to load the new MCP configuration.

### 4. Initialize Your Project

Make sure your project is initialized:

```bash
cd /path/to/your/project
contextkit init
contextkit source add ./src
contextkit index
```

## Usage in Claude Desktop

Once configured, Claude can use ContextKit tools directly. Try prompts like:

> "Use contextkit to find code related to authentication"

> "Search my codebase for database connection handling"

> "Index my project and then find the payment processing code"

### Available Tools

| Tool | Description |
|------|-------------|
| `contextkit_select` | Select relevant context for a query |
| `contextkit_index` | Re-index the codebase |
| `contextkit_status` | Show configuration and index stats |

## Multiple Projects

To configure multiple projects, add multiple MCP server entries:

```json
{
  "mcpServers": {
    "contextkit-myapp": {
      "command": "contextkit-mcp",
      "env": {
        "CONTEXTKIT_PROJECT": "/Users/me/projects/my-app"
      }
    },
    "contextkit-api": {
      "command": "contextkit-mcp",
      "env": {
        "CONTEXTKIT_PROJECT": "/Users/me/projects/api-server"
      }
    }
  }
}
```

Then specify which project in your prompts:

> "Use contextkit-myapp to find the login component"

## Troubleshooting

### Claude doesn't see the contextkit tools

1. Verify the config file location is correct for your OS
2. Check that `contextkit-mcp` is in your PATH:
   ```bash
   which contextkit-mcp
   ```
3. Restart Claude Desktop completely (not just reload)

### "Not initialized" errors

The MCP server runs in the directory specified by `CONTEXTKIT_PROJECT`. Make sure you've run `contextkit init` there.

### Permission errors

If you get permission errors, check that:
- The project path exists and is accessible
- Your shell environment variables are available to Claude Desktop

On macOS, you may need to launch Claude Desktop from terminal:
```bash
open -a "Claude"
```

### Checking logs

Claude Desktop MCP logs are typically at:
- **macOS:** `~/Library/Logs/Claude/mcp*.log`

## Alternative: npx Approach

If you don't want to install globally, use npx:

```json
{
  "mcpServers": {
    "contextkit": {
      "command": "npx",
      "args": ["@milo4jo/contextkit", "mcp"],
      "env": {
        "CONTEXTKIT_PROJECT": "/path/to/project"
      }
    }
  }
}
```

This downloads ContextKit on first use but may be slower to start.

## Security Notes

- ContextKit runs locally — your code never leaves your machine
- Embeddings are stored in a local SQLite database
- The MCP server only exposes three tools (select, index, status)
- No network requests except for embedding generation (using local model by default)
