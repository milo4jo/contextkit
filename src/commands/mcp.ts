/**
 * MCP Command
 *
 * Start the Model Context Protocol server for AI assistant integration.
 */

import { Command } from "commander";
import { startMcpServer } from "../mcp/server.js";
import { writeMessage, writeError } from "../utils/streams.js";

export const mcpCommand = new Command("mcp")
  .description("Start MCP server for AI assistant integration")
  .option("--stdio", "Use stdio transport (default)")
  .action(async () => {
    try {
      writeMessage("Starting ContextKit MCP server...");
      await startMcpServer();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeError(`Failed to start MCP server: ${message}`);
      process.exit(1);
    }
  });
