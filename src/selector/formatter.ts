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

/**
 * Format output in specified format
 */
export function formatInFormat(
  format: OutputFormat,
  query: string,
  result: BudgetResult,
  totalConsidered: number,
  timeMs: number,
  explain: boolean = false
): FormattedOutput {
  switch (format) {
    case 'xml':
      return formatAsXml(query, result, totalConsidered, timeMs);
    case 'json': {
      // JSON format returns the data structure directly
      const base = formatOutput(query, result, totalConsidered, timeMs);
      return {
        text: JSON.stringify(base.data, null, 2),
        data: base.data,
      };
    }
    case 'plain':
      return formatAsPlain(query, result, totalConsidered, timeMs);
    case 'markdown':
    default:
      return explain
        ? formatWithExplanation(query, result, totalConsidered, timeMs)
        : formatOutput(query, result, totalConsidered, timeMs);
  }
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
