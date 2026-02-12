/**
 * Symbol Search Command
 *
 * Find code by symbol name (exact/fuzzy match).
 * Faster than semantic search when you know the name.
 */

import { Command } from 'commander';
import Database from 'better-sqlite3';
import { ensureInitialized } from '../config/index.js';
import { openDatabase } from '../db/index.js';
import { writeData, writeMessage } from '../utils/streams.js';
import { formatDim } from '../utils/format.js';
import { getGlobalOpts } from '../utils/cli.js';

/** Symbol match result */
interface SymbolMatch {
  filePath: string;
  symbolName: string;
  symbolType: 'function' | 'class' | 'method' | 'interface' | 'type' | 'constant' | 'variable';
  startLine: number;
  endLine: number;
  signature: string;
  content: string;
}

/** Extract symbols from chunk content */
function extractSymbols(
  content: string,
  filePath: string,
  chunkStartLine: number = 1
): SymbolMatch[] {
  const symbols: SymbolMatch[] = [];
  const lines = content.split('\n');
  const ext = filePath.split('.').pop()?.toLowerCase();

  // Helper to convert relative end line to absolute
  const toAbsoluteLine = (relativeEnd: number) => chunkStartLine + relativeEnd - 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // Calculate absolute line number (chunk start + offset within chunk)
    const lineNum = chunkStartLine + i;

    // TypeScript/JavaScript patterns
    if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
      // Function declaration
      const funcMatch = trimmed.match(/^(export\s+)?(async\s+)?function\s+(\w+)/);
      if (funcMatch) {
        symbols.push({
          filePath,
          symbolName: funcMatch[3],
          symbolType: 'function',
          startLine: lineNum,
          endLine: toAbsoluteLine(findBlockEnd(lines, i)),
          signature: extractSignatureLine(trimmed),
          content: '',
        });
        continue;
      }

      // Class declaration
      const classMatch = trimmed.match(/^(export\s+)?(abstract\s+)?class\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          filePath,
          symbolName: classMatch[3],
          symbolType: 'class',
          startLine: lineNum,
          endLine: toAbsoluteLine(findBlockEnd(lines, i)),
          signature: extractSignatureLine(trimmed),
          content: '',
        });
        continue;
      }

      // Interface declaration
      const interfaceMatch = trimmed.match(/^(export\s+)?interface\s+(\w+)/);
      if (interfaceMatch) {
        symbols.push({
          filePath,
          symbolName: interfaceMatch[2],
          symbolType: 'interface',
          startLine: lineNum,
          endLine: toAbsoluteLine(findBlockEnd(lines, i)),
          signature: extractSignatureLine(trimmed),
          content: '',
        });
        continue;
      }

      // Type alias
      const typeMatch = trimmed.match(/^(export\s+)?type\s+(\w+)/);
      if (typeMatch) {
        symbols.push({
          filePath,
          symbolName: typeMatch[2],
          symbolType: 'type',
          startLine: lineNum,
          endLine: toAbsoluteLine(findTypeEnd(lines, i)),
          signature: trimmed,
          content: '',
        });
        continue;
      }

      // Const/let/var with arrow function or value
      const constMatch = trimmed.match(/^(export\s+)?(const|let|var)\s+(\w+)/);
      if (constMatch) {
        const isFunction = trimmed.includes('=>') || trimmed.includes('function');
        symbols.push({
          filePath,
          symbolName: constMatch[3],
          symbolType: isFunction ? 'function' : 'constant',
          startLine: lineNum,
          endLine: toAbsoluteLine(findStatementEnd(lines, i)),
          signature: extractSignatureLine(trimmed),
          content: '',
        });
        continue;
      }
    }

    // Python patterns
    if (ext === 'py') {
      // Function/method definition
      const pyFuncMatch = trimmed.match(/^(async\s+)?def\s+(\w+)/);
      if (pyFuncMatch) {
        symbols.push({
          filePath,
          symbolName: pyFuncMatch[2],
          symbolType: 'function',
          startLine: lineNum,
          endLine: toAbsoluteLine(findPythonBlockEnd(lines, i)),
          signature: trimmed.replace(/:$/, ''),
          content: '',
        });
        continue;
      }

      // Class definition
      const pyClassMatch = trimmed.match(/^class\s+(\w+)/);
      if (pyClassMatch) {
        symbols.push({
          filePath,
          symbolName: pyClassMatch[1],
          symbolType: 'class',
          startLine: lineNum,
          endLine: toAbsoluteLine(findPythonBlockEnd(lines, i)),
          signature: trimmed.replace(/:$/, ''),
          content: '',
        });
        continue;
      }
    }

    // Go patterns
    if (ext === 'go') {
      // Function declaration
      const goFuncMatch = trimmed.match(/^func\s+(\w+)/);
      if (goFuncMatch) {
        symbols.push({
          filePath,
          symbolName: goFuncMatch[1],
          symbolType: 'function',
          startLine: lineNum,
          endLine: toAbsoluteLine(findBlockEnd(lines, i)),
          signature: trimmed.replace(/\s*\{$/, ''),
          content: '',
        });
        continue;
      }

      // Method declaration (func (r Receiver) Name)
      const goMethodMatch = trimmed.match(/^func\s+\([^)]+\)\s+(\w+)/);
      if (goMethodMatch) {
        symbols.push({
          filePath,
          symbolName: goMethodMatch[1],
          symbolType: 'method',
          startLine: lineNum,
          endLine: toAbsoluteLine(findBlockEnd(lines, i)),
          signature: trimmed.replace(/\s*\{$/, ''),
          content: '',
        });
        continue;
      }

      // Type declaration
      const goTypeMatch = trimmed.match(/^type\s+(\w+)/);
      if (goTypeMatch) {
        symbols.push({
          filePath,
          symbolName: goTypeMatch[1],
          symbolType: 'type',
          startLine: lineNum,
          endLine: toAbsoluteLine(findBlockEnd(lines, i)),
          signature: trimmed.replace(/\s*\{$/, ''),
          content: '',
        });
        continue;
      }
    }

    // Rust patterns
    if (ext === 'rs') {
      // Function
      const rustFuncMatch = trimmed.match(/^(pub\s+)?(async\s+)?fn\s+(\w+)/);
      if (rustFuncMatch) {
        symbols.push({
          filePath,
          symbolName: rustFuncMatch[3],
          symbolType: 'function',
          startLine: lineNum,
          endLine: toAbsoluteLine(findBlockEnd(lines, i)),
          signature: trimmed.replace(/\s*\{$/, ''),
          content: '',
        });
        continue;
      }

      // Struct/Enum
      const rustStructMatch = trimmed.match(/^(pub\s+)?(struct|enum)\s+(\w+)/);
      if (rustStructMatch) {
        symbols.push({
          filePath,
          symbolName: rustStructMatch[3],
          symbolType: 'class',
          startLine: lineNum,
          endLine: toAbsoluteLine(findBlockEnd(lines, i)),
          signature: trimmed.replace(/\s*\{$/, ''),
          content: '',
        });
        continue;
      }

      // Trait
      const rustTraitMatch = trimmed.match(/^(pub\s+)?trait\s+(\w+)/);
      if (rustTraitMatch) {
        symbols.push({
          filePath,
          symbolName: rustTraitMatch[2],
          symbolType: 'interface',
          startLine: lineNum,
          endLine: toAbsoluteLine(findBlockEnd(lines, i)),
          signature: trimmed.replace(/\s*\{$/, ''),
          content: '',
        });
        continue;
      }
    }
  }

  return symbols;
}

/** Find end of a brace-delimited block */
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

/** Find end of a Python indented block */
function findPythonBlockEnd(lines: string[], startIdx: number): number {
  const startLine = lines[startIdx];
  const startIndent = startLine.length - startLine.trimStart().length;

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue; // Skip empty lines

    const indent = line.length - line.trimStart().length;
    if (indent <= startIndent) {
      return i;
    }
  }
  return lines.length;
}

/** Find end of a type declaration */
function findTypeEnd(lines: string[], startIdx: number): number {
  // Types can span multiple lines until semicolon
  for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes(';')) {
      return i + 1;
    }
  }
  return startIdx + 1;
}

/** Find end of a const/let/var statement */
function findStatementEnd(lines: string[], startIdx: number): number {
  // Check if it's a simple one-liner
  const startLine = lines[startIdx];
  if (startLine.trim().endsWith(';')) {
    return startIdx + 1;
  }

  // Check for arrow function or object literal
  if (startLine.includes('=>') || startLine.includes('{')) {
    return findBlockEnd(lines, startIdx);
  }

  // Multi-line statement ending with semicolon
  for (let i = startIdx; i < Math.min(startIdx + 20, lines.length); i++) {
    if (lines[i].trim().endsWith(';')) {
      return i + 1;
    }
  }
  return startIdx + 1;
}

/** Extract signature from a line (remove body) */
function extractSignatureLine(line: string): string {
  const braceIdx = line.indexOf('{');
  if (braceIdx > 0) {
    return line.substring(0, braceIdx).trim();
  }
  return line.trim();
}

/** Search for symbols by name */
function searchSymbols(
  db: Database.Database,
  query: string,
  options: { exact?: boolean; limit?: number; sources?: string[] }
): SymbolMatch[] {
  const { exact = false, limit = 20, sources } = options;

  // Build SQL query - include start_line for correct line number calculation
  let sql = 'SELECT DISTINCT file_path, content, start_line FROM chunks';
  const params: string[] = [];

  if (sources && sources.length > 0) {
    sql += ' WHERE source_id IN (' + sources.map(() => '?').join(',') + ')';
    params.push(...sources);
  }

  const rows = db.prepare(sql).all(...params) as Array<{
    file_path: string;
    content: string;
    start_line: number;
  }>;

  // Extract and filter symbols
  const allSymbols: SymbolMatch[] = [];
  const queryLower = query.toLowerCase();

  for (const row of rows) {
    // Pass chunk's start_line so symbol line numbers are absolute, not relative
    const chunkStartLine = row.start_line || 1;
    const symbols = extractSymbols(row.content, row.file_path, chunkStartLine);

    for (const sym of symbols) {
      const nameLower = sym.symbolName.toLowerCase();

      if (exact) {
        if (nameLower === queryLower) {
          allSymbols.push(sym);
        }
      } else {
        // Fuzzy match: name must contain the query as a substring
        // Skip very short names (< 3 chars) unless exact match
        const isExactMatch = nameLower === queryLower;
        const containsQuery = nameLower.includes(queryLower);
        const isSignificantName = sym.symbolName.length >= 3;

        if (isExactMatch || (containsQuery && isSignificantName)) {
          allSymbols.push(sym);
        }
      }
    }
  }

  // Sort by relevance (exact matches first, then by name length)
  allSymbols.sort((a, b) => {
    const aExact = a.symbolName.toLowerCase() === queryLower;
    const bExact = b.symbolName.toLowerCase() === queryLower;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return a.symbolName.length - b.symbolName.length;
  });

  return allSymbols.slice(0, limit);
}

/** Format symbol output */
function formatSymbolOutput(symbols: SymbolMatch[], json: boolean): string {
  if (json) {
    return JSON.stringify(symbols, null, 2);
  }

  if (symbols.length === 0) {
    return '';
  }

  const lines: string[] = [];

  // Group by file
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
      lines.push(`│ ${typeIcon} ${sym.symbolName} (line ${sym.startLine})`);
      lines.push(`│   ${sym.signature}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Get icon for symbol type */
function getTypeIcon(type: SymbolMatch['symbolType']): string {
  switch (type) {
    case 'function':
      return '𝑓';
    case 'class':
      return '◆';
    case 'method':
      return '◇';
    case 'interface':
      return '◈';
    case 'type':
      return '⊤';
    case 'constant':
      return '●';
    case 'variable':
      return '○';
    default:
      return '•';
  }
}

// Export for use in interactive mode
export { searchSymbols, formatSymbolOutput, SymbolMatch };

export const symbolCommand = new Command('symbol')
  .alias('find')
  .description('Search for symbols by name')
  .argument('<name>', 'Symbol name to search for')
  .option('-e, --exact', 'Exact match only')
  .option('-l, --limit <n>', 'Maximum results', '20')
  .option('-s, --sources <sources>', 'Filter sources (comma-separated)')
  .action(async (name: string, options) => {
    ensureInitialized();

    const opts = getGlobalOpts(symbolCommand);
    const limit = parseInt(options.limit, 10) || 20;
    const sources = options.sources
      ? options.sources.split(',').map((s: string) => s.trim())
      : undefined;

    const db = openDatabase();

    try {
      const symbols = searchSymbols(db, name, {
        exact: options.exact,
        limit,
        sources,
      });

      if (symbols.length === 0) {
        writeMessage('');
        writeMessage(formatDim(`No symbols found matching "${name}"`));
        writeMessage(formatDim('Try a different name or remove --exact flag.'));
        writeMessage('');
        return;
      }

      const output = formatSymbolOutput(symbols, opts.json ?? false);
      writeData(output);

      // Summary
      if (!opts.json) {
        writeMessage('');
        writeMessage(formatDim(`Found ${symbols.length} symbol(s)`));
      }
    } finally {
      db.close();
    }
  });
