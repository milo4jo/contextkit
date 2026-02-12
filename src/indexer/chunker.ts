/**
 * Chunking Module
 *
 * Splits files into chunks for embedding.
 * Uses AST-aware chunking for supported languages (TS/JS),
 * with token-based fallback for other files.
 */

import { createHash } from 'crypto';
import { encodingForModel } from 'js-tiktoken';
import type { DiscoveredFile } from './discovery.js';
import {
  parseFile,
  parseFileAsync,
  canParse,
  usesTreeSitter,
  type CodeUnitType,
} from '../parsers/index.js';

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
  /** Type of code unit (for AST-aware chunks) */
  chunkType?: CodeUnitType | 'file' | 'token-block';
  /** Name of the code unit (for AST-aware chunks) */
  unitName?: string;
  /** Whether the code unit is exported */
  exported?: boolean;
}

/** Chunking options */
export interface ChunkOptions {
  /** Target tokens per chunk */
  chunkSize: number;
  /** Overlap tokens between chunks */
  chunkOverlap: number;
  /** Use AST-aware chunking when available (default: true) */
  useAst?: boolean;
  /** Maximum tokens for a single code unit before splitting (default: 2x chunkSize) */
  maxUnitTokens?: number;
}

const DEFAULT_OPTIONS: ChunkOptions = {
  chunkSize: 500,
  chunkOverlap: 50,
  useAst: true,
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
 * Extract lines from content between start and end line numbers.
 */
function extractLines(lines: string[], startLine: number, endLine: number): string {
  // Convert to 0-indexed
  const start = startLine - 1;
  const end = endLine; // endLine is inclusive, so slice end is exclusive
  return lines.slice(start, end).join('\n');
}

/**
 * Chunk a file using AST-aware boundaries.
 * Falls back to token-based chunking if parsing fails.
 */
function chunkFileWithAst(file: DiscoveredFile, options: ChunkOptions): Chunk[] {
  const maxUnitTokens = options.maxUnitTokens ?? options.chunkSize * 2;
  const lines = file.content.split('\n');
  const totalLines = lines.length;

  // Try to parse the file
  const parseResult = parseFile(file.content, file.relativePath);

  if (!parseResult.success || parseResult.boundaries.length === 0) {
    // Fall back to token-based chunking
    return chunkFileTokenBased(file, options);
  }

  const chunks: Chunk[] = [];
  const boundaries = parseResult.boundaries;

  // Filter to top-level boundaries (exclude methods if their class is present)
  // This prevents duplication when a class and its methods are both boundaries
  const classBoundaries = new Set(boundaries.filter((b) => b.type === 'class').map((b) => b.name));

  const topLevelBoundaries = boundaries.filter((b) => {
    if (b.type === 'method') {
      // Include method only if its class spans more than maxUnitTokens
      const className = b.name.split('.')[0];
      const classB = boundaries.find((cb) => cb.type === 'class' && cb.name === className);
      if (classB) {
        const classContent = extractLines(lines, classB.startLine, classB.endLine);
        const classTokens = countTokens(classContent);
        return classTokens > maxUnitTokens;
      }
    }
    return true;
  });

  // Track which lines have been covered
  let lastCoveredLine = 0;

  for (const boundary of topLevelBoundaries) {
    // Check for gaps between boundaries (imports, comments, etc.)
    if (boundary.startLine > lastCoveredLine + 1) {
      const gapContent = extractLines(lines, lastCoveredLine + 1, boundary.startLine - 1);
      const gapTokens = countTokens(gapContent);

      if (gapTokens > 0 && gapContent.trim().length > 0) {
        // Add gap as a "block" chunk if it's substantial
        if (gapTokens > 20) {
          chunks.push({
            id: generateChunkId(
              file.sourceId,
              file.relativePath,
              lastCoveredLine + 1,
              boundary.startLine - 1
            ),
            sourceId: file.sourceId,
            filePath: file.relativePath,
            content: gapContent,
            startLine: lastCoveredLine + 1,
            endLine: boundary.startLine - 1,
            tokens: gapTokens,
            chunkType: 'block',
            unitName: 'imports/header',
          });
        }
      }
    }

    // Skip methods if we're not splitting classes
    if (boundary.type === 'method') {
      const className = boundary.name.split('.')[0];
      if (classBoundaries.has(className)) {
        const classB = boundaries.find((cb) => cb.type === 'class' && cb.name === className);
        if (classB) {
          const classContent = extractLines(lines, classB.startLine, classB.endLine);
          const classTokens = countTokens(classContent);
          if (classTokens <= maxUnitTokens) {
            // Class is small enough, skip individual methods
            continue;
          }
        }
      }
    }

    // Skip class if we're including its methods separately
    if (boundary.type === 'class') {
      const classContent = extractLines(lines, boundary.startLine, boundary.endLine);
      const classTokens = countTokens(classContent);
      if (classTokens > maxUnitTokens) {
        // Class is too large, we'll include methods separately
        // Just update lastCoveredLine and continue
        lastCoveredLine = Math.max(lastCoveredLine, boundary.endLine);
        continue;
      }
    }

    const content = extractLines(lines, boundary.startLine, boundary.endLine);
    const tokens = countTokens(content);

    // If the unit is too large, split it with token-based chunking
    if (tokens > maxUnitTokens) {
      const subChunks = chunkLargeUnit(
        file,
        boundary.startLine,
        boundary.endLine,
        options,
        boundary.type,
        boundary.name
      );
      chunks.push(...subChunks);
    } else {
      chunks.push({
        id: generateChunkId(file.sourceId, file.relativePath, boundary.startLine, boundary.endLine),
        sourceId: file.sourceId,
        filePath: file.relativePath,
        content,
        startLine: boundary.startLine,
        endLine: boundary.endLine,
        tokens,
        chunkType: boundary.type,
        unitName: boundary.name,
        exported: boundary.exported,
      });
    }

    lastCoveredLine = Math.max(lastCoveredLine, boundary.endLine);
  }

  // Handle any trailing content after the last boundary
  if (lastCoveredLine < totalLines) {
    const trailingContent = extractLines(lines, lastCoveredLine + 1, totalLines);
    const trailingTokens = countTokens(trailingContent);

    if (trailingTokens > 0 && trailingContent.trim().length > 0) {
      chunks.push({
        id: generateChunkId(file.sourceId, file.relativePath, lastCoveredLine + 1, totalLines),
        sourceId: file.sourceId,
        filePath: file.relativePath,
        content: trailingContent,
        startLine: lastCoveredLine + 1,
        endLine: totalLines,
        tokens: trailingTokens,
        chunkType: 'block',
        unitName: 'footer',
      });
    }
  }

  // If no chunks were created (edge case), fall back to token-based
  if (chunks.length === 0) {
    return chunkFileTokenBased(file, options);
  }

  return chunks;
}

/**
 * Split a large code unit using token-based chunking.
 */
function chunkLargeUnit(
  file: DiscoveredFile,
  startLine: number,
  endLine: number,
  options: ChunkOptions,
  unitType: CodeUnitType,
  unitName: string
): Chunk[] {
  const allLines = file.content.split('\n');
  const lines = allLines.slice(startLine - 1, endLine);

  const chunks: Chunk[] = [];
  let currentLines: string[] = [];
  let currentTokens = 0;
  let currentStartLine = startLine;
  let partNum = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTokens = countTokens(line + '\n');

    if (currentTokens + lineTokens > options.chunkSize && currentLines.length > 0) {
      const content = currentLines.join('\n');
      const chunkEndLine = currentStartLine + currentLines.length - 1;

      chunks.push({
        id: generateChunkId(file.sourceId, file.relativePath, currentStartLine, chunkEndLine),
        sourceId: file.sourceId,
        filePath: file.relativePath,
        content,
        startLine: currentStartLine,
        endLine: chunkEndLine,
        tokens: currentTokens,
        chunkType: unitType,
        unitName: `${unitName} (part ${partNum})`,
      });

      partNum++;

      // Calculate overlap
      const overlapLines: string[] = [];
      let overlapTokens = 0;

      for (let j = currentLines.length - 1; j >= 0 && overlapTokens < options.chunkOverlap; j--) {
        const overlapLine = currentLines[j];
        const overlapLineTokens = countTokens(overlapLine + '\n');
        overlapLines.unshift(overlapLine);
        overlapTokens += overlapLineTokens;
      }

      currentLines = overlapLines;
      currentTokens = overlapTokens;
      currentStartLine = chunkEndLine + 1 - overlapLines.length;
    }

    currentLines.push(line);
    currentTokens += lineTokens;
  }

  // Last chunk
  if (currentLines.length > 0) {
    const content = currentLines.join('\n');
    const chunkEndLine = currentStartLine + currentLines.length - 1;

    chunks.push({
      id: generateChunkId(file.sourceId, file.relativePath, currentStartLine, chunkEndLine),
      sourceId: file.sourceId,
      filePath: file.relativePath,
      content,
      startLine: currentStartLine,
      endLine: chunkEndLine,
      tokens: countTokens(content),
      chunkType: unitType,
      unitName: partNum > 1 ? `${unitName} (part ${partNum})` : unitName,
    });
  }

  return chunks;
}

/**
 * Chunk a file using token-based line splitting (fallback method).
 */
function chunkFileTokenBased(file: DiscoveredFile, options: ChunkOptions): Chunk[] {
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
        chunkType: 'token-block',
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
      chunkType: 'token-block',
    });
  }

  return chunks;
}

/**
 * Chunk a single file into pieces.
 * Uses AST-aware chunking for supported languages, falls back to token-based.
 */
export function chunkFile(file: DiscoveredFile, options: ChunkOptions = DEFAULT_OPTIONS): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Use AST-aware chunking if enabled and the file type is supported
  if (opts.useAst && canParse(file.relativePath)) {
    return chunkFileWithAst(file, opts);
  }

  // Fall back to token-based chunking
  return chunkFileTokenBased(file, opts);
}

/**
 * Chunk multiple files (sync version)
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

/**
 * Chunk a file using AST-aware boundaries (async version for tree-sitter).
 * Falls back to token-based chunking if parsing fails.
 */
async function chunkFileWithAstAsync(
  file: DiscoveredFile,
  options: ChunkOptions
): Promise<Chunk[]> {
  const maxUnitTokens = options.maxUnitTokens ?? options.chunkSize * 2;
  const lines = file.content.split('\n');
  const totalLines = lines.length;

  // Try to parse the file (async for tree-sitter languages)
  const parseResult = await parseFileAsync(file.content, file.relativePath);

  if (!parseResult.success || parseResult.boundaries.length === 0) {
    // Fall back to token-based chunking
    return chunkFileTokenBased(file, options);
  }

  const chunks: Chunk[] = [];
  const boundaries = parseResult.boundaries;

  // Filter to top-level boundaries (exclude methods if their class is present and small)
  const topLevelBoundaries = boundaries.filter((b) => {
    if (b.type === 'method') {
      const className = b.name.split('.')[0];
      const classB = boundaries.find((cb) => cb.type === 'class' && cb.name === className);
      if (classB) {
        const classContent = extractLines(lines, classB.startLine, classB.endLine);
        const classTokens = countTokens(classContent);
        return classTokens > maxUnitTokens;
      }
    }
    return true;
  });

  let lastCoveredLine = 0;

  for (const boundary of topLevelBoundaries) {
    if (boundary.startLine > lastCoveredLine + 1) {
      const gapContent = extractLines(lines, lastCoveredLine + 1, boundary.startLine - 1);
      const gapTokens = countTokens(gapContent);

      if (gapTokens > 0 && gapContent.trim().length > 0 && gapTokens > 20) {
        chunks.push({
          id: generateChunkId(
            file.sourceId,
            file.relativePath,
            lastCoveredLine + 1,
            boundary.startLine - 1
          ),
          sourceId: file.sourceId,
          filePath: file.relativePath,
          content: gapContent,
          startLine: lastCoveredLine + 1,
          endLine: boundary.startLine - 1,
          tokens: gapTokens,
          chunkType: 'block',
          unitName: 'header',
        });
      }
    }

    const content = extractLines(lines, boundary.startLine, boundary.endLine);
    const tokens = countTokens(content);

    if (tokens <= maxUnitTokens) {
      chunks.push({
        id: generateChunkId(file.sourceId, file.relativePath, boundary.startLine, boundary.endLine),
        sourceId: file.sourceId,
        filePath: file.relativePath,
        content,
        startLine: boundary.startLine,
        endLine: boundary.endLine,
        tokens,
        chunkType: boundary.type,
        unitName: boundary.name,
        exported: boundary.exported,
      });
    } else {
      const splitChunks = chunkLargeUnit(
        file,
        boundary.startLine,
        boundary.endLine,
        options,
        boundary.type,
        boundary.name
      );
      chunks.push(...splitChunks);
    }

    lastCoveredLine = Math.max(lastCoveredLine, boundary.endLine);
  }

  if (lastCoveredLine < totalLines) {
    const trailingContent = extractLines(lines, lastCoveredLine + 1, totalLines);
    const trailingTokens = countTokens(trailingContent);

    if (trailingTokens > 0 && trailingContent.trim().length > 0) {
      chunks.push({
        id: generateChunkId(file.sourceId, file.relativePath, lastCoveredLine + 1, totalLines),
        sourceId: file.sourceId,
        filePath: file.relativePath,
        content: trailingContent,
        startLine: lastCoveredLine + 1,
        endLine: totalLines,
        tokens: trailingTokens,
        chunkType: 'block',
        unitName: 'footer',
      });
    }
  }

  if (chunks.length === 0) {
    return chunkFileTokenBased(file, options);
  }

  return chunks;
}

/**
 * Chunk a single file into pieces (async version).
 * Uses AST-aware chunking for all supported languages including tree-sitter.
 */
export async function chunkFileAsync(
  file: DiscoveredFile,
  options: ChunkOptions = DEFAULT_OPTIONS
): Promise<Chunk[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Use AST-aware chunking if enabled and the file type is supported
  if (opts.useAst && canParse(file.relativePath)) {
    // Use async parsing for tree-sitter languages
    if (usesTreeSitter(file.relativePath)) {
      return chunkFileWithAstAsync(file, opts);
    }
    // Use sync parsing for TS/JS
    return chunkFileWithAst(file, opts);
  }

  // Fall back to token-based chunking
  return chunkFileTokenBased(file, opts);
}

/**
 * Chunk multiple files (async version, supports all languages)
 */
export async function chunkFilesAsync(
  files: DiscoveredFile[],
  options: ChunkOptions = DEFAULT_OPTIONS
): Promise<Chunk[]> {
  const allChunks: Chunk[] = [];

  for (const file of files) {
    const chunks = await chunkFileAsync(file, options);
    allChunks.push(...chunks);
  }

  return allChunks;
}
