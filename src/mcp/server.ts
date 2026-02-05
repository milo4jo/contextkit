/**
 * ContextKit MCP Server
 *
 * Model Context Protocol server for ContextKit.
 * Allows AI assistants (Claude Desktop, etc.) to use ContextKit for context selection.
 *
 * Usage:
 *   contextkit mcp          # Start MCP server (stdio)
 *   contextkit-mcp          # Standalone MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { isInitialized, loadConfig } from "../config/index.js";
import { openDatabase } from "../db/index.js";
import { selectContext, type SelectOptions } from "../selector/index.js";
import { indexSources } from "../indexer/index.js";
import type Database from "better-sqlite3";

/**
 * Get index statistics from database
 */
function getIndexStats(db: Database.Database): {
  totalChunks: number;
  totalSources: number;
} {
  const chunkCount = db
    .prepare("SELECT COUNT(*) as count FROM chunks")
    .get() as { count: number };
  const sourceCount = db
    .prepare("SELECT COUNT(DISTINCT source) as count FROM chunks")
    .get() as { count: number };

  return {
    totalChunks: chunkCount.count,
    totalSources: sourceCount.count,
  };
}

/**
 * Create and configure the MCP server
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: "contextkit",
      version: "0.2.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "contextkit_select",
          description:
            "Select optimal context chunks for a query from indexed codebase. Returns the most relevant code and documentation for your task.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "What you need context for (e.g., 'How does authentication work?')",
              },
              budget: {
                type: "number",
                description: "Maximum tokens to return (default: 8000)",
              },
              sources: {
                type: "string",
                description:
                  "Comma-separated list of sources to filter (optional)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "contextkit_index",
          description:
            "Index or re-index the codebase. Run this after making changes to ensure context is up to date.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "contextkit_status",
          description:
            "Get the current status of the ContextKit index, including chunk counts and source information.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "contextkit_select": {
          if (!isInitialized()) {
            return {
              content: [
                {
                  type: "text",
                  text: "ContextKit not initialized. Run `contextkit init` first.",
                },
              ],
              isError: true,
            };
          }

          const query = (args?.query as string) || "";
          const budget = (args?.budget as number) || 8000;
          const sourcesStr = args?.sources as string | undefined;
          const sources = sourcesStr
            ? sourcesStr.split(",").map((s) => s.trim())
            : undefined;

          if (!query) {
            return {
              content: [{ type: "text", text: "Error: query is required" }],
              isError: true,
            };
          }

          const db = openDatabase();

          try {
            const options: SelectOptions = {
              query,
              budget,
              sources,
            };

            const result = await selectContext(db, options);

            if (result.isEmpty) {
              return {
                content: [
                  {
                    type: "text",
                    text: "No indexed content. Run `contextkit index` first.",
                  },
                ],
              };
            }

            if (result.output.data.chunks.length === 0) {
              return {
                content: [
                  {
                    type: "text",
                    text: `No relevant context found for query: "${query}"`,
                  },
                ],
              };
            }

            // Return formatted output
            return {
              content: [{ type: "text", text: result.output.text }],
            };
          } finally {
            db.close();
          }
        }

        case "contextkit_index": {
          if (!isInitialized()) {
            return {
              content: [
                {
                  type: "text",
                  text: "ContextKit not initialized. Run `contextkit init` first.",
                },
              ],
              isError: true,
            };
          }

          const config = loadConfig();
          const db = openDatabase();

          try {
            const stats = await indexSources(
              config.sources,
              process.cwd(),
              db,
              {
                chunkSize: config.settings.chunk_size,
                chunkOverlap: config.settings.chunk_overlap,
              }
            );

            return {
              content: [
                {
                  type: "text",
                  text: `Indexed ${stats.chunks} chunks from ${stats.files} files.`,
                },
              ],
            };
          } finally {
            db.close();
          }
        }

        case "contextkit_status": {
          if (!isInitialized()) {
            return {
              content: [
                {
                  type: "text",
                  text: "ContextKit not initialized in current directory.",
                },
              ],
            };
          }

          const config = loadConfig();
          const db = openDatabase();

          try {
            const stats = getIndexStats(db);

            const statusText = [
              "ContextKit Status",
              "=================",
              `Sources configured: ${config.sources.length}`,
              `Chunks indexed: ${stats.totalChunks}`,
              "",
              "Sources:",
              ...config.sources.map((s) => `  - ${s.id}: ${s.path}`),
            ].join("\n");

            return {
              content: [{ type: "text", text: statusText }],
            };
          } finally {
            db.close();
          }
        }

        default:
          return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
