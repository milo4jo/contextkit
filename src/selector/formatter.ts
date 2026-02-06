/**
 * Output Formatter Module
 *
 * Formats selected chunks for display.
 * Supports multiple output formats: markdown, xml, json, plain
 */

import type { RankedChunk } from './scoring.js';
import type { BudgetResult } from './budget.js';

/** Supported output formats */
export type OutputFormat = 'markdown' | 'xml' | 'json' | 'plain';

/** Formatted output */
export interface FormattedOutput {
  /** Human-readable text output */
  text: string;
  /** Structured data for JSON output */
  data: SelectionData;
}

/** Structured selection data */
export interface SelectionData {
  query: string;
  context: string;
  chunks: ChunkInfo[];
  stats: SelectionStats;
}

/** Chunk info for JSON output */
export interface ChunkInfo {
  file: string;
  lines: [number, number];
  tokens: number;
  score: number;
}

/** Selection statistics */
export interface SelectionStats {
  totalTokens: number;
  chunksConsidered: number;
  chunksIncluded: number;
  filesIncluded: number;
  timeMs: number;
}

/**
 * Format selection results for output
 */
export function formatOutput(
  query: string,
  result: BudgetResult,
  totalConsidered: number,
  timeMs: number
): FormattedOutput {
  const { chunks, totalTokens } = result;

  // Group chunks by file
  const fileGroups = new Map<string, RankedChunk[]>();
  for (const chunk of chunks) {
    const existing = fileGroups.get(chunk.filePath) || [];
    existing.push(chunk);
    fileGroups.set(chunk.filePath, existing);
  }

  // Build text output
  const textParts: string[] = [];

  for (const [filePath, fileChunks] of fileGroups) {
    // Sort chunks by line number within file
    fileChunks.sort((a, b) => a.startLine - b.startLine);

    for (const chunk of fileChunks) {
      const header = `## ${filePath} (lines ${chunk.startLine}-${chunk.endLine})`;
      const codeBlock = formatCodeBlock(chunk.content, filePath);
      textParts.push(`${header}\n${codeBlock}`);
    }
  }

  // Add stats footer
  const filesCount = fileGroups.size;
  const statsLine = `📊 ${totalTokens.toLocaleString()} tokens | ${chunks.length} chunks | ${filesCount} files`;

  const text = textParts.join('\n\n') + '\n\n---\n' + statsLine;

  // Build structured data
  const chunkInfos: ChunkInfo[] = chunks.map((c) => ({
    file: c.filePath,
    lines: [c.startLine, c.endLine],
    tokens: c.tokens,
    score: Math.round(c.score * 1000) / 1000,
  }));

  const data: SelectionData = {
    query,
    context: textParts.join('\n\n'),
    chunks: chunkInfos,
    stats: {
      totalTokens,
      chunksConsidered: totalConsidered,
      chunksIncluded: chunks.length,
      filesIncluded: filesCount,
      timeMs,
    },
  };

  return { text, data };
}

/**
 * Format content as a code block with language hint
 */
function formatCodeBlock(content: string, filePath: string): string {
  const lang = getLanguage(filePath);
  return '```' + lang + '\n' + content + '\n```';
}

/**
 * Get language hint from file extension
 */
function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';

  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    md: 'markdown',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
  };

  return langMap[ext] || '';
}

/**
 * Format output with --explain details
 */
export function formatWithExplanation(
  query: string,
  result: BudgetResult,
  totalConsidered: number,
  timeMs: number
): FormattedOutput {
  const base = formatOutput(query, result, totalConsidered, timeMs);

  // Add explanation section
  const explanations = result.chunks.map((chunk) => {
    const { similarity, pathMatch, contentMatch, symbolMatch, fileTypeBoost } = chunk.scoreBreakdown;
    return `  ${chunk.filePath}:${chunk.startLine}
    similarity:     ${(similarity * 100).toFixed(1)}%
    path_match:     ${(pathMatch * 100).toFixed(1)}%
    content_match:  ${(contentMatch * 100).toFixed(1)}%
    symbol_match:   ${(symbolMatch * 100).toFixed(1)}%
    file_type:      ${(fileTypeBoost * 100).toFixed(1)}%
    → score:        ${(chunk.score * 100).toFixed(1)}%`;
  });

  const explainSection = '\n\n## Scoring Details\n\n' + explanations.join('\n\n');

  return {
    text: base.text + explainSection,
    data: base.data,
  };
}

/**
 * Format output as XML (Claude prefers XML for structured content)
 */
export function formatAsXml(
  query: string,
  result: BudgetResult,
  totalConsidered: number,
  timeMs: number
): FormattedOutput {
  const { chunks, totalTokens } = result;

  // Group chunks by file
  const fileGroups = new Map<string, RankedChunk[]>();
  for (const chunk of chunks) {
    const existing = fileGroups.get(chunk.filePath) || [];
    existing.push(chunk);
    fileGroups.set(chunk.filePath, existing);
  }

  // Build XML output
  const xmlParts: string[] = ['<context>'];
  xmlParts.push(`  <query>${escapeXml(query)}</query>`);
  xmlParts.push('  <files>');

  for (const [filePath, fileChunks] of fileGroups) {
    // Sort chunks by line number within file
    fileChunks.sort((a, b) => a.startLine - b.startLine);

    xmlParts.push(`    <file path="${escapeXml(filePath)}">`);
    
    for (const chunk of fileChunks) {
      xmlParts.push(`      <chunk lines="${chunk.startLine}-${chunk.endLine}" tokens="${chunk.tokens}">`);
      xmlParts.push(`<![CDATA[${chunk.content}]]>`);
      xmlParts.push('      </chunk>');
    }
    
    xmlParts.push('    </file>');
  }

  xmlParts.push('  </files>');
  xmlParts.push(`  <stats tokens="${totalTokens}" chunks="${chunks.length}" files="${fileGroups.size}" time_ms="${timeMs}" />`);
  xmlParts.push('</context>');

  const text = xmlParts.join('\n');

  // Build structured data (same as markdown)
  const chunkInfos: ChunkInfo[] = chunks.map((c) => ({
    file: c.filePath,
    lines: [c.startLine, c.endLine],
    tokens: c.tokens,
    score: Math.round(c.score * 1000) / 1000,
  }));

  const data: SelectionData = {
    query,
    context: text,
    chunks: chunkInfos,
    stats: {
      totalTokens,
      chunksConsidered: totalConsidered,
      chunksIncluded: chunks.length,
      filesIncluded: fileGroups.size,
      timeMs,
    },
  };

  return { text, data };
}

/**
 * Format output as plain text (optimized for clipboard/pasting)
 */
export function formatAsPlain(
  query: string,
  result: BudgetResult,
  totalConsidered: number,
  timeMs: number
): FormattedOutput {
  const { chunks, totalTokens } = result;

  // Group chunks by file
  const fileGroups = new Map<string, RankedChunk[]>();
  for (const chunk of chunks) {
    const existing = fileGroups.get(chunk.filePath) || [];
    existing.push(chunk);
    fileGroups.set(chunk.filePath, existing);
  }

  // Build plain text output (no markdown formatting)
  const textParts: string[] = [];

  for (const [filePath, fileChunks] of fileGroups) {
    // Sort chunks by line number within file
    fileChunks.sort((a, b) => a.startLine - b.startLine);

    for (const chunk of fileChunks) {
      const header = `// ${filePath} (lines ${chunk.startLine}-${chunk.endLine})`;
      textParts.push(`${header}\n${chunk.content}`);
    }
  }

  const text = textParts.join('\n\n');

  // Build structured data
  const chunkInfos: ChunkInfo[] = chunks.map((c) => ({
    file: c.filePath,
    lines: [c.startLine, c.endLine],
    tokens: c.tokens,
    score: Math.round(c.score * 1000) / 1000,
  }));

  const data: SelectionData = {
    query,
    context: text,
    chunks: chunkInfos,
    stats: {
      totalTokens,
      chunksConsidered: totalConsidered,
      chunksIncluded: chunks.length,
      filesIncluded: fileGroups.size,
      timeMs,
    },
  };

  return { text, data };
}

/** Selection mode */
type SelectMode = 'full' | 'map';

/**
 * Format output in specified format
 */
export function formatInFormat(
  format: OutputFormat,
  query: string,
  result: BudgetResult,
  totalConsidered: number,
  timeMs: number,
  explain: boolean = false,
  mode: SelectMode = 'full'
): FormattedOutput {
  // If map mode, transform chunks to signatures only
  const effectiveResult = mode === 'map' ? transformToSignatures(result) : result;

  switch (format) {
    case 'xml':
      return formatAsXml(query, effectiveResult, totalConsidered, timeMs);
    case 'json': {
      // JSON format returns the data structure directly
      const base = formatOutput(query, effectiveResult, totalConsidered, timeMs);
      return {
        text: JSON.stringify(base.data, null, 2),
        data: base.data,
      };
    }
    case 'plain':
      return formatAsPlain(query, effectiveResult, totalConsidered, timeMs);
    case 'markdown':
    default:
      if (mode === 'map') {
        return formatAsRepoMap(query, effectiveResult, totalConsidered, timeMs);
      }
      return explain
        ? formatWithExplanation(query, effectiveResult, totalConsidered, timeMs)
        : formatOutput(query, effectiveResult, totalConsidered, timeMs);
  }
}

/**
 * Transform chunks to show only signatures/structure
 */
function transformToSignatures(result: BudgetResult): BudgetResult {
  const transformedChunks = result.chunks.map(chunk => {
    const signature = extractSignatureFromContent(chunk.content, chunk.filePath);
    return {
      ...chunk,
      content: signature,
      // Recalculate tokens (rough estimate: 1 token per 4 chars)
      tokens: Math.ceil(signature.length / 4),
    };
  });

  const totalTokens = transformedChunks.reduce((sum, c) => sum + c.tokens, 0);

  return {
    chunks: transformedChunks,
    totalTokens,
    excluded: result.excluded,
  };
}

/**
 * Extract signature from chunk content by analyzing the content itself
 */
function extractSignatureFromContent(content: string, filePath: string): string {
  const lines = content.split('\n');
  const ext = filePath.split('.').pop()?.toLowerCase();
  const isMarkdown = ext === 'md' || ext === 'mdx' || ext === 'markdown';

  // For markdown, return headers
  if (isMarkdown) {
    const headers = lines.filter(l => l.trim().startsWith('#'));
    if (headers.length > 0) {
      return headers.join('\n');
    }
    // Return first non-empty line for markdown without headers
    const firstLine = lines.find(l => l.trim());
    return firstLine ? firstLine.substring(0, 100) : '(markdown content)';
  }

  // Try to detect and extract code signatures
  const signatures: string[] = [];
  let inClass = false;
  let classIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') && !isMarkdown || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }

    // TypeScript/JavaScript class
    if (trimmed.match(/^(export\s+)?(abstract\s+)?class\s+\w+/)) {
      signatures.push(trimmed.replace(/\s*\{$/, ''));
      inClass = true;
      classIndent = indent;
      continue;
    }

    // TypeScript/JavaScript function
    if (trimmed.match(/^(export\s+)?(async\s+)?function\s+\w+/)) {
      signatures.push(extractFunctionSignature(trimmed));
      continue;
    }

    // Arrow function or const
    if (trimmed.match(/^(export\s+)?(const|let|var)\s+\w+\s*[=:]/)) {
      const arrowSig = extractArrowSignature(trimmed, lines.slice(i));
      signatures.push(arrowSig);
      continue;
    }

    // Python class
    if (trimmed.match(/^class\s+\w+/)) {
      signatures.push(trimmed.replace(/:$/, ''));
      inClass = true;
      classIndent = indent;
      continue;
    }

    // Python function/method
    if (trimmed.match(/^(async\s+)?def\s+\w+/)) {
      const sig = trimmed.replace(/:$/, '');
      if (inClass && indent > classIndent) {
        signatures.push('  ' + sig);
      } else {
        signatures.push(sig);
        inClass = false;
      }
      continue;
    }

    // Go function
    if (trimmed.match(/^func\s+/)) {
      signatures.push(trimmed.replace(/\s*\{$/, ''));
      continue;
    }

    // Rust function
    if (trimmed.match(/^(pub\s+)?(async\s+)?fn\s+/)) {
      signatures.push(trimmed.replace(/\s*\{$/, ''));
      continue;
    }

    // TypeScript interface or type
    if (trimmed.match(/^(export\s+)?(interface|type)\s+\w+/)) {
      signatures.push(trimmed.replace(/\s*[{=]$/, ''));
      continue;
    }

    // Method in class (TypeScript)
    if (inClass && indent > classIndent && trimmed.match(/^(public|private|protected|static|async|get|set)?\s*(async\s+)?\w+\s*\(/)) {
      signatures.push('  ' + extractFunctionSignature(trimmed));
      continue;
    }
  }

  if (signatures.length > 0) {
    return signatures.join('\n');
  }

  // Fallback: return first meaningful line
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
      return trimmed.length > 100 ? trimmed.substring(0, 100) + '...' : trimmed;
    }
  }

  return '(content)';
}

/**
 * Extract function signature (up to opening brace or colon)
 */
function extractFunctionSignature(line: string): string {
  // Remove body start
  const braceIdx = line.indexOf('{');
  if (braceIdx > 0) {
    return line.substring(0, braceIdx).trim();
  }
  return line;
}

/**
 * Extract arrow function signature
 */
function extractArrowSignature(firstLine: string, lines: string[]): string {
  // For single-line arrow functions
  const arrowIdx = firstLine.indexOf('=>');
  if (arrowIdx > 0) {
    return firstLine.substring(0, arrowIdx + 2).trim() + ' ...';
  }
  // Multi-line: look for arrow on next lines
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i];
    const idx = line.indexOf('=>');
    if (idx > 0) {
      return line.substring(0, idx + 2).trim() + ' ...';
    }
  }
  return firstLine;
}

/**
 * Format as repo map (signatures grouped by file)
 */
function formatAsRepoMap(
  query: string,
  result: BudgetResult,
  totalConsidered: number,
  timeMs: number
): FormattedOutput {
  const { chunks, totalTokens } = result;

  // Group chunks by file
  const fileGroups = new Map<string, typeof chunks>();
  for (const chunk of chunks) {
    const existing = fileGroups.get(chunk.filePath) || [];
    existing.push(chunk);
    fileGroups.set(chunk.filePath, existing);
  }

  // Build text output in tree format
  const textParts: string[] = [];

  for (const [filePath, fileChunks] of fileGroups) {
    fileChunks.sort((a, b) => a.startLine - b.startLine);

    textParts.push(`📄 ${filePath}`);
    for (const chunk of fileChunks) {
      const lines = chunk.content.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          textParts.push(`│ ${line}`);
        }
      }
    }
    textParts.push('');
  }

  // Add stats footer
  const filesCount = fileGroups.size;
  const statsLine = `📊 ${totalTokens.toLocaleString()} tokens | ${chunks.length} symbols | ${filesCount} files`;

  const text = textParts.join('\n') + '\n---\n' + statsLine;

  // Build structured data
  const chunkInfos: ChunkInfo[] = chunks.map((c) => ({
    file: c.filePath,
    lines: [c.startLine, c.endLine],
    tokens: c.tokens,
    score: Math.round(c.score * 1000) / 1000,
  }));

  return {
    text,
    data: {
      query,
      context: textParts.join('\n'),
      chunks: chunkInfos,
      stats: {
        totalTokens,
        chunksConsidered: totalConsidered,
        chunksIncluded: chunks.length,
        filesIncluded: filesCount,
        timeMs,
      },
    },
  };
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
