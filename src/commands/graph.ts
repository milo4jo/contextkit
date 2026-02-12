/**
 * Call Graph Command
 *
 * Analyze function call relationships:
 * - What functions call a given function (callers)
 * - What functions a given function calls (callees)
 */

import { Command } from 'commander';
import Database from 'better-sqlite3';
import { ensureInitialized } from '../config/index.js';
import { openDatabase } from '../db/index.js';
import { writeData, writeMessage, writeWarning } from '../utils/streams.js';
import { formatDim } from '../utils/format.js';
import { getGlobalOpts } from '../utils/cli.js';

/** Call graph result */
interface CallGraphResult {
  target: string;
  callers: Array<{
    file: string;
    function: string;
    line: number;
    context: string;
  }>;
  callees: Array<{
    file: string;
    function: string;
    line: number;
    context: string;
  }>;
}

/** Extract function definitions from content */
function extractFunctionDefs(
  content: string,
  filePath: string
): Map<string, { startLine: number; endLine: number }> {
  const functions = new Map<string, { startLine: number; endLine: number }>();
  const lines = content.split('\n');
  const ext = filePath.split('.').pop()?.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // TypeScript/JavaScript
    if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
      // function name()
      const funcMatch = trimmed.match(/^(export\s+)?(async\s+)?function\s+(\w+)/);
      if (funcMatch) {
        const name = funcMatch[3];
        const endLine = findBlockEnd(lines, i);
        functions.set(name, { startLine: i + 1, endLine });
        continue;
      }

      // const name = () =>
      const arrowMatch = trimmed.match(/^(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(/);
      if (arrowMatch) {
        const name = arrowMatch[3];
        const endLine = findBlockEnd(lines, i);
        functions.set(name, { startLine: i + 1, endLine });
        continue;
      }

      // Method in class: name() or async name() (trimmed already removes leading whitespace)
      const methodMatch = trimmed.match(
        /^(public|private|protected|static|async\s+)*(async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/
      );
      if (methodMatch && !['if', 'while', 'for', 'switch', 'catch'].includes(methodMatch[3])) {
        const name = methodMatch[3];
        const endLine = findBlockEnd(lines, i);
        functions.set(name, { startLine: i + 1, endLine });
        continue;
      }
    }

    // Python
    if (ext === 'py') {
      const defMatch = trimmed.match(/^(async\s+)?def\s+(\w+)/);
      if (defMatch) {
        const name = defMatch[2];
        const endLine = findPythonBlockEnd(lines, i);
        functions.set(name, { startLine: i + 1, endLine });
        continue;
      }
    }

    // Go
    if (ext === 'go') {
      const funcMatch = trimmed.match(/^func\s+(?:\([^)]+\)\s+)?(\w+)/);
      if (funcMatch) {
        const name = funcMatch[1];
        const endLine = findBlockEnd(lines, i);
        functions.set(name, { startLine: i + 1, endLine });
        continue;
      }
    }

    // Rust
    if (ext === 'rs') {
      const fnMatch = trimmed.match(/^(pub\s+)?(async\s+)?fn\s+(\w+)/);
      if (fnMatch) {
        const name = fnMatch[3];
        const endLine = findBlockEnd(lines, i);
        functions.set(name, { startLine: i + 1, endLine });
        continue;
      }
    }
  }

  return functions;
}

/** Find function calls in a range of lines */
function findFunctionCalls(
  content: string,
  startLine: number,
  endLine: number,
  knownFunctions: Set<string>
): Array<{ name: string; line: number; context: string }> {
  const calls: Array<{ name: string; line: number; context: string }> = [];
  const lines = content.split('\n');

  // Simple regex to find function calls: name(
  const callPattern = /\b(\w+)\s*\(/g;

  for (let i = startLine - 1; i < Math.min(endLine, lines.length); i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
      continue;
    }

    let match;
    while ((match = callPattern.exec(line)) !== null) {
      const name = match[1];

      // Skip keywords and common non-function patterns
      const keywords = [
        'if',
        'else',
        'while',
        'for',
        'switch',
        'catch',
        'return',
        'throw',
        'new',
        'typeof',
        'import',
        'export',
        'const',
        'let',
        'var',
        'function',
        'class',
        'interface',
        'type',
        'async',
        'await',
        'try',
        'finally',
      ];
      if (keywords.includes(name)) continue;

      // Only include if it's a known function or looks like a function call
      if (knownFunctions.has(name) || name[0] === name[0].toLowerCase()) {
        calls.push({
          name,
          line: i + 1,
          context: trimmed.substring(0, 80),
        });
      }
    }
  }

  return calls;
}

/** Find block end (brace-delimited) */
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

/** Find Python block end (indentation-based) */
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

/** Build call graph for a target function */
function buildCallGraph(
  db: Database.Database,
  targetName: string,
  options: { sources?: string[] }
): CallGraphResult {
  const { sources } = options;

  // Get all chunks
  let sql = 'SELECT file_path, content FROM chunks';
  const params: string[] = [];

  if (sources && sources.length > 0) {
    sql += ' WHERE source_id IN (' + sources.map(() => '?').join(',') + ')';
    params.push(...sources);
  }

  const rows = db.prepare(sql).all(...params) as Array<{ file_path: string; content: string }>;

  // Build function index (file -> functions)
  // Note: Multiple chunks may exist for the same file, so we need to merge
  const functionsByFile = new Map<
    string,
    Map<string, { startLine: number; endLine: number; chunkContent: string }>
  >();
  const allFunctions = new Set<string>();

  for (const row of rows) {
    const funcs = extractFunctionDefs(row.content, row.file_path);
    if (funcs.size > 0) {
      const existing = functionsByFile.get(row.file_path) || new Map();
      for (const [name, info] of funcs) {
        // Only store if we don't already have this function
        // (prevents chunk overlap from overwriting with wrong content/line numbers)
        if (!existing.has(name)) {
          existing.set(name, { ...info, chunkContent: row.content });
        }
        allFunctions.add(name);
      }
      functionsByFile.set(row.file_path, existing);
    }
  }

  // Find callers (who calls targetName)
  const callers: CallGraphResult['callers'] = [];

  for (const [filePath, fileFuncs] of functionsByFile) {
    for (const [funcName, { startLine, endLine, chunkContent }] of fileFuncs) {
      // Skip the target function itself
      if (funcName === targetName) continue;

      const calls = findFunctionCalls(chunkContent, startLine, endLine, allFunctions);

      for (const call of calls) {
        if (call.name === targetName) {
          callers.push({
            file: filePath,
            function: funcName,
            line: call.line,
            context: call.context,
          });
        }
      }
    }
  }

  // Find callees (what targetName calls)
  const callees: CallGraphResult['callees'] = [];

  for (const [, fileFuncs] of functionsByFile) {
    const targetFunc = fileFuncs.get(targetName);
    if (!targetFunc) continue;

    const calls = findFunctionCalls(
      targetFunc.chunkContent,
      targetFunc.startLine,
      targetFunc.endLine,
      allFunctions
    );

    for (const call of calls) {
      if (call.name !== targetName) {
        // Find where this function is defined
        let definedIn = '';
        for (const [file, funcs] of functionsByFile) {
          if (funcs.has(call.name)) {
            definedIn = file;
            break;
          }
        }

        callees.push({
          file: definedIn || '(external)',
          function: call.name,
          line: call.line,
          context: call.context,
        });
      }
    }
  }

  // Deduplicate
  const uniqueCallers = Array.from(
    new Map(callers.map((c) => [`${c.file}:${c.function}`, c])).values()
  );
  const uniqueCallees = Array.from(
    new Map(callees.map((c) => [`${c.file}:${c.function}`, c])).values()
  );

  return {
    target: targetName,
    callers: uniqueCallers,
    callees: uniqueCallees,
  };
}

/** Format call graph output */
function formatCallGraph(result: CallGraphResult, json: boolean): string {
  if (json) {
    return JSON.stringify(result, null, 2);
  }

  const lines: string[] = [];

  lines.push(`🎯 Call graph for: ${result.target}`);
  lines.push('');

  // Callers
  lines.push(`📥 Callers (${result.callers.length}):`);
  if (result.callers.length === 0) {
    lines.push('   (none found)');
  } else {
    for (const caller of result.callers) {
      lines.push(`   ← ${caller.function} (${caller.file}:${caller.line})`);
    }
  }
  lines.push('');

  // Callees
  lines.push(`📤 Calls (${result.callees.length}):`);
  if (result.callees.length === 0) {
    lines.push('   (none found)');
  } else {
    for (const callee of result.callees) {
      const location = callee.file === '(external)' ? '(external)' : `${callee.file}`;
      lines.push(`   → ${callee.function} (${location})`);
    }
  }

  return lines.join('\n');
}

// Export for use in interactive mode
export { buildCallGraph, formatCallGraph, CallGraphResult };

export const graphCommand = new Command('graph')
  .description('Show call graph for a function')
  .argument('<function>', 'Function name to analyze')
  .option('-s, --sources <sources>', 'Filter sources (comma-separated)')
  .action(async (functionName: string, options) => {
    ensureInitialized();

    const opts = getGlobalOpts(graphCommand);
    const sources = options.sources
      ? options.sources.split(',').map((s: string) => s.trim())
      : undefined;

    const db = openDatabase();

    try {
      const result = buildCallGraph(db, functionName, { sources });

      if (result.callers.length === 0 && result.callees.length === 0) {
        writeWarning(`No call relationships found for "${functionName}"`);
        writeMessage(formatDim('Make sure the function exists and the codebase is indexed.'));
        return;
      }

      const output = formatCallGraph(result, opts.json ?? false);
      writeData(output);
    } finally {
      db.close();
    }
  });
