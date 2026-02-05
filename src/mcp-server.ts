#!/usr/bin/env node
/**
 * ContextKit MCP Server (Standalone)
 *
 * Start the MCP server directly without the CLI wrapper.
 * This is useful for Claude Desktop configuration.
 *
 * Usage in claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "contextkit": {
 *       "command": "contextkit-mcp"
 *     }
 *   }
 * }
 */

import { startMcpServer } from "./mcp/server.js";

startMcpServer().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
