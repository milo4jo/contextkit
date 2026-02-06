/**
 * Parser Registry
 *
 * Central registry for language-specific parsers.
 * Determines which parser to use based on file extension.
 *
 * Supports:
 * - TypeScript/JavaScript (via acorn)
 * - Python, Go, Rust (via tree-sitter)
 */

import {
  parseTypeScript,
  isTypeScriptOrJavaScript,
  type ParseResult,
  type CodeBoundary,
  type CodeUnitType,
} from './typescript.js';

import {
  parseWithTreeSitter,
  canParseWithTreeSitter,
  getTreeSitterExtensions,
  getSupportedTreeSitterLanguages,
  generateRepoMap,
} from './tree-sitter.js';

import {
  parseMarkdown,
  isMarkdown,
  getMarkdownExtensions,
} from './markdown.js';

export { type ParseResult, type CodeBoundary, type CodeUnitType };
export { generateRepoMap, getSupportedTreeSitterLanguages };

/** Parser function signature (sync for TS/JS, async for tree-sitter) */
export type ParserFn = (content: string, filePath?: string) => ParseResult;
export type AsyncParserFn = (content: string, filePath: string) => Promise<ParseResult>;

/** Registered sync parsers mapped by extension */
const syncParsers: Map<string, ParserFn> = new Map();

/** Extensions that use async tree-sitter parsing */
const treeSitterExtensions = new Set(getTreeSitterExtensions());

// Register TypeScript/JavaScript parser for all supported extensions
const tsExtensions = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts'];
for (const ext of tsExtensions) {
  syncParsers.set(ext, parseTypeScript);
}

// Register Markdown parser for all supported extensions
const mdExtensions = getMarkdownExtensions();
for (const ext of mdExtensions) {
  syncParsers.set(ext, parseMarkdown);
}

/**
 * Get the sync parser for a file based on its extension.
 *
 * @param filePath - Path to the file
 * @returns Parser function or undefined if no parser is available
 */
export function getParser(filePath: string): ParserFn | undefined {
  const ext = filePath.toLowerCase().split('.').pop();
  if (!ext) return undefined;
  return syncParsers.get(ext);
}

/**
 * Check if a file uses tree-sitter (async) parsing.
 */
export function usesTreeSitter(filePath: string): boolean {
  const ext = filePath.toLowerCase().split('.').pop();
  if (!ext) return false;
  return treeSitterExtensions.has(ext);
}

/**
 * Check if a file can be parsed by any registered parser (sync or async).
 *
 * @param filePath - Path to the file
 * @returns True if a parser is available for this file type
 */
export function canParse(filePath: string): boolean {
  const ext = filePath.toLowerCase().split('.').pop();
  if (!ext) return false;
  return syncParsers.has(ext) || treeSitterExtensions.has(ext);
}

/**
 * Parse a file and extract code boundaries (sync version for TS/JS).
 *
 * @param content - File content
 * @param filePath - Path to the file (used to determine parser)
 * @returns Parse result with boundaries, or failure result if no parser available
 */
export function parseFile(content: string, filePath: string): ParseResult {
  const parser = getParser(filePath);

  if (!parser) {
    // Check if this should use tree-sitter (async)
    if (usesTreeSitter(filePath)) {
      return {
        success: false,
        boundaries: [],
        error: `File ${filePath} requires async parsing. Use parseFileAsync instead.`,
      };
    }
    return {
      success: false,
      boundaries: [],
      error: `No parser available for file type: ${filePath}`,
    };
  }

  return parser(content, filePath);
}

/**
 * Parse a file and extract code boundaries (async version, supports all languages).
 *
 * @param content - File content
 * @param filePath - Path to the file (used to determine parser)
 * @returns Parse result with boundaries, or failure result if no parser available
 */
export async function parseFileAsync(content: string, filePath: string): Promise<ParseResult> {
  // Check if this uses tree-sitter
  if (usesTreeSitter(filePath)) {
    return parseWithTreeSitter(content, filePath);
  }

  // Fall back to sync parser
  const parser = getParser(filePath);

  if (!parser) {
    return {
      success: false,
      boundaries: [],
      error: `No parser available for file type: ${filePath}`,
    };
  }

  return parser(content, filePath);
}

/**
 * Register a custom parser for a file extension.
 *
 * @param extension - File extension (without dot)
 * @param parser - Parser function
 */
export function registerParser(extension: string, parser: ParserFn): void {
  syncParsers.set(extension.toLowerCase(), parser);
}

/**
 * Get list of supported file extensions (all parsers).
 */
export function getSupportedExtensions(): string[] {
  const syncExts = Array.from(syncParsers.keys());
  const asyncExts = Array.from(treeSitterExtensions);
  return [...new Set([...syncExts, ...asyncExts])];
}

// Re-export utility functions
export { isTypeScriptOrJavaScript, canParseWithTreeSitter, isMarkdown, getMarkdownExtensions };
