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
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { isInitialized, loadConfig } from "../config/index.js";
import { openDatabase } from "../db/index.js";
import { selectContext, type SelectOptions } from "../selector/index.js";
import { indexSources } from "../indexer/index.js";
import type Database from "better-sqlite3";

// Get version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));
const VERSION = pkg.version;

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
    .prepare("SELECT COUNT(DISTINCT source_id) as count FROM chunks")
    .get() as { count: number };

  return {
    totalChunks: chunkCount.count,
    totalSources: sourceCount.count,
  };
}

// ============================================================================
// Symbol Search (extracted from commands/symbol.ts for MCP use)
// ============================================================================

interface SymbolMatch {
  filePath: string;
  symbolName: string;
  symbolType: 'function' | 'class' | 'method' | 'interface' | 'type' | 'constant' | 'variable';
  startLine: number;
  endLine: number;
  signature: string;
}

function extractSymbols(content: string, filePath: string): SymbolMatch[] {
  const symbols: SymbolMatch[] = [];
  const lines = content.split('\n');
  const ext = filePath.split('.').pop()?.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // TypeScript/JavaScript patterns
    if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
      const funcMatch = trimmed.match(/^(export\s+)?(async\s+)?function\s+(\w+)/);
      if (funcMatch) {
        symbols.push({
          filePath,
          symbolName: funcMatch[3],
          symbolType: 'function',
          startLine: lineNum,
          endLine: findBlockEnd(lines, i),
          signature: extractSignatureLine(trimmed),
        });
        continue;
      }

      const classMatch = trimmed.match(/^(export\s+)?(abstract\s+)?class\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          filePath,
          symbolName: classMatch[3],
          symbolType: 'class',
          startLine: lineNum,
          endLine: findBlockEnd(lines, i),
          signature: extractSignatureLine(trimmed),
        });
        continue;
      }

      const interfaceMatch = trimmed.match(/^(export\s+)?interface\s+(\w+)/);
      if (interfaceMatch) {
        symbols.push({
          filePath,
          symbolName: interfaceMatch[2],
          symbolType: 'interface',
          startLine: lineNum,
          endLine: findBlockEnd(lines, i),
          signature: extractSignatureLine(trimmed),
        });
        continue;
      }

      const typeMatch = trimmed.match(/^(export\s+)?type\s+(\w+)/);
      if (typeMatch) {
        symbols.push({
          filePath,
          symbolName: typeMatch[2],
          symbolType: 'type',
          startLine: lineNum,
          endLine: findTypeEnd(lines, i),
          signature: trimmed,
        });
        continue;
      }

      const constMatch = trimmed.match(/^(export\s+)?(const|let|var)\s+(\w+)/);
      if (constMatch) {
        const isFunction = trimmed.includes('=>') || trimmed.includes('function');
        symbols.push({
          filePath,
          symbolName: constMatch[3],
          symbolType: isFunction ? 'function' : 'constant',
          startLine: lineNum,
          endLine: findStatementEnd(lines, i),
          signature: extractSignatureLine(trimmed),
        });
        continue;
      }
    }

    // Python patterns
    if (ext === 'py') {
      const pyFuncMatch = trimmed.match(/^(async\s+)?def\s+(\w+)/);
      if (pyFuncMatch) {
        symbols.push({
          filePath,
          symbolName: pyFuncMatch[2],
          symbolType: 'function',
          startLine: lineNum,
          endLine: findPythonBlockEnd(lines, i),
          signature: trimmed.replace(/:$/, ''),
        });
        continue;
      }

      const pyClassMatch = trimmed.match(/^class\s+(\w+)/);
      if (pyClassMatch) {
        symbols.push({
          filePath,
          symbolName: pyClassMatch[1],
          symbolType: 'class',
          startLine: lineNum,
          endLine: findPythonBlockEnd(lines, i),
          signature: trimmed.replace(/:$/, ''),
        });
        continue;
      }
    }

    // Go patterns
    if (ext === 'go') {
      const goFuncMatch = trimmed.match(/^func\s+(\w+)/);
      if (goFuncMatch) {
        symbols.push({
          filePath,
          symbolName: goFuncMatch[1],
          symbolType: 'function',
          startLine: lineNum,
          endLine: findBlockEnd(lines, i),
          signature: trimmed.replace(/\s*\{$/, ''),
        });
        continue;
      }

      const goMethodMatch = trimmed.match(/^func\s+\([^)]+\)\s+(\w+)/);
      if (goMethodMatch) {
        symbols.push({
          filePath,
          symbolName: goMethodMatch[1],
          symbolType: 'method',
          startLine: lineNum,
          endLine: findBlockEnd(lines, i),
          signature: trimmed.replace(/\s*\{$/, ''),
        });
        continue;
      }
    }

    // Rust patterns
    if (ext === 'rs') {
      const rustFuncMatch = trimmed.match(/^(pub\s+)?(async\s+)?fn\s+(\w+)/);
      if (rustFuncMatch) {
        symbols.push({
          filePath,
          symbolName: rustFuncMatch[3],
          symbolType: 'function',
          startLine: lineNum,
          endLine: findBlockEnd(lines, i),
          signature: trimmed.replace(/\s*\{$/, ''),
        });
        continue;
      }
    }
  }

  return symbols;
}

function findBlockEnd(lines: string[], startIdx: number): number {
  let braceCount = 0;
  let started = false;
  
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
      if (char === '{') {
        braceCount++;
        started = true;
      } else if (char === '}') {
        braceCount--;
        if (started && braceCount === 0) {
          return i + 1;
        }
      }
    }
  }
  return lines.length;
}

function findPythonBlockEnd(lines: string[], startIdx: number): number {
  const startLine = lines[startIdx];
  const startIndent = startLine.length - startLine.trimStart().length;
  
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const indent = line.length - line.trimStart().length;
    if (indent <= startIndent) {
      return i;
    }
  }
  return lines.length;
}

function findTypeEnd(lines: string[], startIdx: number): number {
  for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes(';')) {
      return i + 1;
    }
  }
  return startIdx + 1;
}

function findStatementEnd(lines: string[], startIdx: number): number {
  const startLine = lines[startIdx];
  if (startLine.trim().endsWith(';')) {
    return startIdx + 1;
  }
  
  if (startLine.includes('=>') || startLine.includes('{')) {
    return findBlockEnd(lines, startIdx);
  }
  
  for (let i = startIdx; i < Math.min(startIdx + 20, lines.length); i++) {
    if (lines[i].trim().endsWith(';')) {
      return i + 1;
    }
  }
  return startIdx + 1;
}

function extractSignatureLine(line: string): string {
  const braceIdx = line.indexOf('{');
  if (braceIdx > 0) {
    return line.substring(0, braceIdx).trim();
  }
  return line.trim();
}

function searchSymbols(
  db: Database.Database,
  query: string,
  options: { exact?: boolean; limit?: number; sources?: string[] }
): SymbolMatch[] {
  const { exact = false, limit = 20, sources } = options;
  
  let sql = 'SELECT DISTINCT file_path, content FROM chunks';
  const params: string[] = [];
  
  if (sources && sources.length > 0) {
    sql += ' WHERE source_id IN (' + sources.map(() => '?').join(',') + ')';
    params.push(...sources);
  }
  
  const rows = db.prepare(sql).all(...params) as Array<{ file_path: string; content: string }>;
  
  const allSymbols: SymbolMatch[] = [];
  const queryLower = query.toLowerCase();
  
  for (const row of rows) {
    const symbols = extractSymbols(row.content, row.file_path);
    
    for (const sym of symbols) {
      const nameLower = sym.symbolName.toLowerCase();
      
      if (exact) {
        if (nameLower === queryLower) {
          allSymbols.push(sym);
        }
      } else {
        const isExactMatch = nameLower === queryLower;
        const containsQuery = nameLower.includes(queryLower);
        const isSignificantName = sym.symbolName.length >= 3;
        
        if (isExactMatch || (containsQuery && isSignificantName)) {
          allSymbols.push(sym);
        }
      }
    }
  }
  
  allSymbols.sort((a, b) => {
    const aExact = a.symbolName.toLowerCase() === queryLower;
    const bExact = b.symbolName.toLowerCase() === queryLower;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return a.symbolName.length - b.symbolName.length;
  });
  
  return allSymbols.slice(0, limit);
}

function getTypeIcon(type: SymbolMatch['symbolType']): string {
  switch (type) {
    case 'function': return '𝑓';
    case 'class': return '◆';
    case 'method': return '◇';
    case 'interface': return '◈';
    case 'type': return '⊤';
    case 'constant': return '●';
    case 'variable': return '○';
    default: return '•';
  }
}

function formatSymbolsForMcp(symbols: SymbolMatch[]): string {
  if (symbols.length === 0) {
    return 'No symbols found.';
  }
  
  const lines: string[] = [];
  const byFile = new Map<string, SymbolMatch[]>();
  
  for (const sym of symbols) {
    const existing = byFile.get(sym.filePath) || [];
    existing.push(sym);
    byFile.set(sym.filePath, existing);
  }
  
  for (const [filePath, fileSymbols] of byFile) {
    lines.push(`📄 ${filePath}`);
    for (const sym of fileSymbols) {
      const typeIcon = getTypeIcon(sym.symbolType);
      lines.push(`  ${typeIcon} ${sym.symbolName} (line ${sym.startLine})`);
      lines.push(`    ${sym.signature}`);
    }
    lines.push('');
  }
  
  lines.push(`Found ${symbols.length} symbol(s)`);
  return lines.join('\n');
}

// ============================================================================
// Call Graph (extracted from commands/graph.ts for MCP use)
// ============================================================================

interface CallGraphResult {
  target: string;
  callers: Array<{ file: string; function: string; line: number }>;
  callees: Array<{ file: string; function: string }>;
}

function extractFunctionDefs(content: string, filePath: string): Map<string, { startLine: number; endLine: number }> {
  const functions = new Map<string, { startLine: number; endLine: number }>();
  const lines = content.split('\n');
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
      const funcMatch = trimmed.match(/^(export\s+)?(async\s+)?function\s+(\w+)/);
      if (funcMatch) {
        functions.set(funcMatch[3], { startLine: i + 1, endLine: findBlockEnd(lines, i) });
        continue;
      }
      
      const arrowMatch = trimmed.match(/^(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(/);
      if (arrowMatch) {
        functions.set(arrowMatch[3], { startLine: i + 1, endLine: findBlockEnd(lines, i) });
        continue;
      }
    }
    
    if (ext === 'py') {
      const defMatch = trimmed.match(/^(async\s+)?def\s+(\w+)/);
      if (defMatch) {
        functions.set(defMatch[2], { startLine: i + 1, endLine: findPythonBlockEnd(lines, i) });
        continue;
      }
    }
    
    if (ext === 'go') {
      const funcMatch = trimmed.match(/^func\s+(?:\([^)]+\)\s+)?(\w+)/);
      if (funcMatch) {
        functions.set(funcMatch[1], { startLine: i + 1, endLine: findBlockEnd(lines, i) });
        continue;
      }
    }
    
    if (ext === 'rs') {
      const fnMatch = trimmed.match(/^(pub\s+)?(async\s+)?fn\s+(\w+)/);
      if (fnMatch) {
        functions.set(fnMatch[3], { startLine: i + 1, endLine: findBlockEnd(lines, i) });
        continue;
      }
    }
  }
  
  return functions;
}

function findFunctionCalls(
  content: string,
  startLine: number,
  endLine: number,
  knownFunctions: Set<string>
): Array<{ name: string; line: number }> {
  const calls: Array<{ name: string; line: number }> = [];
  const lines = content.split('\n');
  const callPattern = /\b(\w+)\s*\(/g;
  const keywords = new Set(['if', 'else', 'while', 'for', 'switch', 'catch', 'return', 'throw', 'new', 'typeof', 'import', 'export', 'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'async', 'await', 'try', 'finally']);
  
  for (let i = startLine - 1; i < Math.min(endLine, lines.length); i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
      continue;
    }
    
    let match;
    while ((match = callPattern.exec(line)) !== null) {
      const name = match[1];
      if (!keywords.has(name) && (knownFunctions.has(name) || name[0] === name[0].toLowerCase())) {
        calls.push({ name, line: i + 1 });
      }
    }
  }
  
  return calls;
}

function buildCallGraph(db: Database.Database, targetName: string, sources?: string[]): CallGraphResult {
  let sql = 'SELECT file_path, content FROM chunks';
  const params: string[] = [];
  
  if (sources && sources.length > 0) {
    sql += ' WHERE source_id IN (' + sources.map(() => '?').join(',') + ')';
    params.push(...sources);
  }
  
  const rows = db.prepare(sql).all(...params) as Array<{ file_path: string; content: string }>;
  
  const functionsByFile = new Map<string, Map<string, { startLine: number; endLine: number }>>();
  const allFunctions = new Set<string>();
  
  for (const row of rows) {
    const funcs = extractFunctionDefs(row.content, row.file_path);
    if (funcs.size > 0) {
      functionsByFile.set(row.file_path, funcs);
      for (const name of funcs.keys()) {
        allFunctions.add(name);
      }
    }
  }
  
  const callers: CallGraphResult['callers'] = [];
  const callees: CallGraphResult['callees'] = [];
  
  for (const row of rows) {
    const fileFuncs = functionsByFile.get(row.file_path);
    if (!fileFuncs) continue;
    
    for (const [funcName, { startLine, endLine }] of fileFuncs) {
      const calls = findFunctionCalls(row.content, startLine, endLine, allFunctions);
      
      for (const call of calls) {
        if (call.name === targetName && funcName !== targetName) {
          callers.push({ file: row.file_path, function: funcName, line: call.line });
        }
      }
    }
    
    const targetFunc = fileFuncs.get(targetName);
    if (targetFunc) {
      const calls = findFunctionCalls(row.content, targetFunc.startLine, targetFunc.endLine, allFunctions);
      for (const call of calls) {
        if (call.name !== targetName) {
          let definedIn = '(external)';
          for (const [file, funcs] of functionsByFile) {
            if (funcs.has(call.name)) {
              definedIn = file;
              break;
            }
          }
          callees.push({ file: definedIn, function: call.name });
        }
      }
    }
  }
  
  const uniqueCallers = Array.from(new Map(callers.map(c => [`${c.file}:${c.function}`, c])).values());
  const uniqueCallees = Array.from(new Map(callees.map(c => [`${c.file}:${c.function}`, c])).values());
  
  return { target: targetName, callers: uniqueCallers, callees: uniqueCallees };
}

function formatCallGraphForMcp(result: CallGraphResult): string {
  const lines: string[] = [];
  
  lines.push(`🎯 Call graph for: ${result.target}`);
  lines.push('');
  
  lines.push(`📥 Callers (${result.callers.length}):`);
  if (result.callers.length === 0) {
    lines.push('   (none found)');
  } else {
    for (const caller of result.callers) {
      lines.push(`   ← ${caller.function} (${caller.file}:${caller.line})`);
    }
  }
  lines.push('');
  
  lines.push(`📤 Calls (${result.callees.length}):`);
  if (result.callees.length === 0) {
    lines.push('   (none found)');
  } else {
    for (const callee of result.callees) {
      lines.push(`   → ${callee.function} (${callee.file})`);
    }
  }
  
  return lines.join('\n');
}

// ============================================================================
// MCP Server
// ============================================================================

/**
 * Create and configure the MCP server
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: "contextkit",
      version: VERSION,
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
              mode: {
                type: "string",
                enum: ["full", "map"],
                description: "Selection mode: 'full' for complete code (default), 'map' for signatures only (uses fewer tokens)",
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
          name: "contextkit_symbol",
          description:
            "Search for code symbols (functions, classes, interfaces, types) by name. Faster than semantic search when you know the symbol name.",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Symbol name to search for (e.g., 'handleAuth', 'UserService')",
              },
              exact: {
                type: "boolean",
                description: "Require exact match (default: false, uses fuzzy matching)",
              },
              limit: {
                type: "number",
                description: "Maximum number of results (default: 20)",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "contextkit_graph",
          description:
            "Show call graph for a function: what functions call it (callers) and what it calls (callees). Useful for understanding code flow and dependencies.",
          inputSchema: {
            type: "object",
            properties: {
              function: {
                type: "string",
                description: "Function name to analyze",
              },
            },
            required: ["function"],
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
          const mode = (args?.mode as 'full' | 'map') || 'full';
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
              mode,
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

            return {
              content: [{ type: "text", text: result.output.text }],
            };
          } finally {
            db.close();
          }
        }

        case "contextkit_symbol": {
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

          const symbolName = (args?.name as string) || "";
          const exact = (args?.exact as boolean) || false;
          const limit = (args?.limit as number) || 20;

          if (!symbolName) {
            return {
              content: [{ type: "text", text: "Error: name is required" }],
              isError: true,
            };
          }

          const db = openDatabase();

          try {
            const symbols = searchSymbols(db, symbolName, { exact, limit });
            const output = formatSymbolsForMcp(symbols);
            return {
              content: [{ type: "text", text: output }],
            };
          } finally {
            db.close();
          }
        }

        case "contextkit_graph": {
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

          const functionName = (args?.function as string) || "";

          if (!functionName) {
            return {
              content: [{ type: "text", text: "Error: function name is required" }],
              isError: true,
            };
          }

          const db = openDatabase();

          try {
            const result = buildCallGraph(db, functionName);
            
            if (result.callers.length === 0 && result.callees.length === 0) {
              return {
                content: [
                  {
                    type: "text",
                    text: `No call relationships found for "${functionName}". Make sure the function exists and the codebase is indexed.`,
                  },
                ],
              };
            }
            
            const output = formatCallGraphForMcp(result);
            return {
              content: [{ type: "text", text: output }],
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
              `Version: ${VERSION}`,
              `Sources configured: ${config.sources.length}`,
              `Chunks indexed: ${stats.totalChunks}`,
              "",
              "Available tools:",
              "  • contextkit_select - Semantic context search",
              "  • contextkit_symbol - Symbol name search",
              "  • contextkit_graph  - Function call graph",
              "  • contextkit_index  - Re-index codebase",
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
