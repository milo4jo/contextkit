/**
 * Output Formatter Module
 *
 * Formats selected chunks for display.
 */

import type { RankedChunk } from './scoring.js';
import type { BudgetResult } from './budget.js';

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
    const { similarity, recency, pathMatch } = chunk.scoreBreakdown;
    return `  ${chunk.filePath}:${chunk.startLine}
    similarity: ${(similarity * 100).toFixed(1)}%
    recency:    ${(recency * 100).toFixed(1)}%
    path_match: ${(pathMatch * 100).toFixed(1)}%
    → score:    ${(chunk.score * 100).toFixed(1)}%`;
  });

  const explainSection = '\n\n## Scoring Details\n\n' + explanations.join('\n\n');

  return {
    text: base.text + explainSection,
    data: base.data,
  };
}
