/**
 * Chunking Module
 *
 * Splits files into chunks for embedding.
 * Uses line-based chunking with configurable size and overlap.
 */

import { createHash } from 'crypto';
import { encodingForModel } from 'js-tiktoken';
import type { DiscoveredFile } from './discovery.js';

/** Chunk of content ready for embedding */
export interface Chunk {
  /** Unique chunk ID */
  id: string;
  /** Source this chunk belongs to */
  sourceId: string;
  /** Original file path (relative) */
  filePath: string;
  /** Chunk content */
  content: string;
  /** Start line (1-indexed) */
  startLine: number;
  /** End line (1-indexed, inclusive) */
  endLine: number;
  /** Token count */
  tokens: number;
}

/** Chunking options */
export interface ChunkOptions {
  /** Target tokens per chunk */
  chunkSize: number;
  /** Overlap tokens between chunks */
  chunkOverlap: number;
}

const DEFAULT_OPTIONS: ChunkOptions = {
  chunkSize: 500,
  chunkOverlap: 50,
};

// Use cl100k_base encoding (GPT-4/Claude compatible)
const encoder = encodingForModel('gpt-4');

/**
 * Count tokens in a string
 */
export function countTokens(text: string): number {
  return encoder.encode(text).length;
}

/**
 * Generate a unique chunk ID using SHA-256 hash
 * Includes both startLine and endLine to handle edge cases where
 * high overlap values could result in same startLine for different chunks.
 */
function generateChunkId(
  sourceId: string,
  filePath: string,
  startLine: number,
  endLine: number
): string {
  const base = `${sourceId}:${filePath}:${startLine}:${endLine}`;
  const hash = createHash('sha256').update(base).digest('hex').slice(0, 16);
  return `chunk_${hash}`;
}

/**
 * Chunk a single file into pieces
 */
export function chunkFile(file: DiscoveredFile, options: ChunkOptions = DEFAULT_OPTIONS): Chunk[] {
  const lines = file.content.split('\n');
  const chunks: Chunk[] = [];

  let currentLines: string[] = [];
  let currentTokens = 0;
  let startLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTokens = countTokens(line + '\n');

    // If adding this line exceeds chunk size, save current chunk
    if (currentTokens + lineTokens > options.chunkSize && currentLines.length > 0) {
      const content = currentLines.join('\n');
      const endLine = startLine + currentLines.length - 1;
      chunks.push({
        id: generateChunkId(file.sourceId, file.relativePath, startLine, endLine),
        sourceId: file.sourceId,
        filePath: file.relativePath,
        content,
        startLine,
        endLine,
        tokens: currentTokens,
      });

      // Calculate overlap: keep last N tokens worth of lines
      const overlapLines: string[] = [];
      let overlapTokens = 0;

      for (let j = currentLines.length - 1; j >= 0 && overlapTokens < options.chunkOverlap; j--) {
        const overlapLine = currentLines[j];
        const overlapLineTokens = countTokens(overlapLine + '\n');
        overlapLines.unshift(overlapLine);
        overlapTokens += overlapLineTokens;
      }

      // Start next chunk with overlap
      currentLines = overlapLines;
      currentTokens = overlapTokens;
      startLine =
        startLine + (chunks[chunks.length - 1].endLine - startLine + 1) - overlapLines.length;
    }

    currentLines.push(line);
    currentTokens += lineTokens;
  }

  // Don't forget the last chunk
  if (currentLines.length > 0) {
    const content = currentLines.join('\n');
    const endLine = startLine + currentLines.length - 1;
    chunks.push({
      id: generateChunkId(file.sourceId, file.relativePath, startLine, endLine),
      sourceId: file.sourceId,
      filePath: file.relativePath,
      content,
      startLine,
      endLine,
      tokens: countTokens(content),
    });
  }

  return chunks;
}

/**
 * Chunk multiple files
 */
export function chunkFiles(
  files: DiscoveredFile[],
  options: ChunkOptions = DEFAULT_OPTIONS
): Chunk[] {
  const allChunks: Chunk[] = [];

  for (const file of files) {
    const chunks = chunkFile(file, options);
    allChunks.push(...chunks);
  }

  return allChunks;
}
