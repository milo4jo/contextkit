/**
 * Parser Registry
 *
 * Central registry for language-specific parsers.
 * Determines which parser to use based on file extension.
 */

import {
  parseTypeScript,
  isTypeScriptOrJavaScript,
  type ParseResult,
  type CodeBoundary,
  type CodeUnitType,
} from './typescript.js';

export { type ParseResult, type CodeBoundary, type CodeUnitType };

/** Parser function signature */
export type ParserFn = (content: string, filePath?: string) => ParseResult;

/** Registered parsers mapped by extension */
const parsers: Map<string, ParserFn> = new Map();

// Register TypeScript/JavaScript parser for all supported extensions
const tsExtensions = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts'];
for (const ext of tsExtensions) {
  parsers.set(ext, parseTypeScript);
}

/**
 * Get the parser for a file based on its extension.
 *
 * @param filePath - Path to the file
 * @returns Parser function or undefined if no parser is available
 */
export function getParser(filePath: string): ParserFn | undefined {
  const ext = filePath.toLowerCase().split('.').pop();
  if (!ext) return undefined;
  return parsers.get(ext);
}

/**
 * Check if a file can be parsed by any registered parser.
 *
 * @param filePath - Path to the file
 * @returns True if a parser is available for this file type
 */
export function canParse(filePath: string): boolean {
  return getParser(filePath) !== undefined;
}

/**
 * Parse a file and extract code boundaries.
 *
 * @param content - File content
 * @param filePath - Path to the file (used to determine parser)
 * @returns Parse result with boundaries, or failure result if no parser available
 */
export function parseFile(content: string, filePath: string): ParseResult {
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
  parsers.set(extension.toLowerCase(), parser);
}

/**
 * Get list of supported file extensions.
 */
export function getSupportedExtensions(): string[] {
  return Array.from(parsers.keys());
}

// Re-export utility functions
export { isTypeScriptOrJavaScript };
