/**
 * Import Parser Module
 *
 * Parses TypeScript/JavaScript import statements to find related files.
 * Uses regex patterns instead of AST parsing for simplicity and speed.
 */

import { resolve, dirname, extname } from 'path';
import { existsSync } from 'fs';

/** Parsed import statement */
export interface ParsedImport {
  /** Original import specifier (e.g., './utils', 'lodash') */
  specifier: string;
  /** Type of import */
  type: 'relative' | 'absolute' | 'package';
  /** Line number where import appears (1-indexed) */
  line: number;
  /** Named imports (e.g., ['foo', 'bar'] from `import { foo, bar } from ...`) */
  namedImports?: string[];
  /** Default import name */
  defaultImport?: string;
  /** Whether it's a type-only import */
  isTypeOnly: boolean;
}

/** Result of import parsing */
export interface ImportParseResult {
  /** All parsed imports */
  imports: ParsedImport[];
  /** Resolved relative paths to related files */
  relatedFiles: string[];
}

/**
 * Supported import patterns:
 * - import { foo, bar } from './module'
 * - import * as name from './module'
 * - import name from './module'
 * - import './module'
 * - import type { Foo } from './module'
 * - export { foo } from './module'
 * - export * from './module'
 * - const x = require('./module')
 * - const x = await import('./module')
 */

/**
 * Parse imports from source code
 */
export function parseImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const lines = content.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineNum = lineIdx + 1;

    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Try each import pattern
    parseLineImports(line, lineNum, imports);
  }

  return imports;
}

/**
 * Parse imports from a single line
 */
function parseLineImports(line: string, lineNum: number, imports: ParsedImport[]): void {
  // ES6 imports with named imports
  const namedImportMatch = line.match(
    /^import\s+(type\s+)?{([^}]+)}\s+from\s+['"]([^'"]+)['"]/
  );
  if (namedImportMatch) {
    const isTypeOnly = !!namedImportMatch[1];
    const namedImports = namedImportMatch[2]
      .split(',')
      .map((n) => n.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    const specifier = namedImportMatch[3];

    imports.push({
      specifier,
      type: classifyImportType(specifier),
      line: lineNum,
      namedImports,
      isTypeOnly,
    });
    return;
  }

  // ES6 import with default + named: import Default, { named } from 'specifier'
  const mixedImportMatch = line.match(
    /^import\s+(\w+)\s*,\s*{([^}]+)}\s+from\s+['"]([^'"]+)['"]/
  );
  if (mixedImportMatch) {
    const defaultImport = mixedImportMatch[1];
    const namedImports = mixedImportMatch[2]
      .split(',')
      .map((n) => n.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    const specifier = mixedImportMatch[3];

    imports.push({
      specifier,
      type: classifyImportType(specifier),
      line: lineNum,
      defaultImport,
      namedImports,
      isTypeOnly: false,
    });
    return;
  }

  // ES6 namespace import: import * as name from 'specifier'
  const namespaceMatch = line.match(/^import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
  if (namespaceMatch) {
    imports.push({
      specifier: namespaceMatch[2],
      type: classifyImportType(namespaceMatch[2]),
      line: lineNum,
      defaultImport: namespaceMatch[1],
      isTypeOnly: false,
    });
    return;
  }

  // ES6 default import: import name from 'specifier'
  const defaultImportMatch = line.match(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
  if (defaultImportMatch) {
    imports.push({
      specifier: defaultImportMatch[2],
      type: classifyImportType(defaultImportMatch[2]),
      line: lineNum,
      defaultImport: defaultImportMatch[1],
      isTypeOnly: false,
    });
    return;
  }

  // Side-effect only import: import 'specifier'
  const sideEffectMatch = line.match(/^import\s+['"]([^'"]+)['"]/);
  if (sideEffectMatch) {
    imports.push({
      specifier: sideEffectMatch[1],
      type: classifyImportType(sideEffectMatch[1]),
      line: lineNum,
      isTypeOnly: false,
    });
    return;
  }

  // Export from: export { foo } from 'specifier' or export * from 'specifier'
  const exportFromMatch = line.match(/^export\s+(?:type\s+)?(?:{[^}]*}|\*(?:\s+as\s+\w+)?)\s+from\s+['"]([^'"]+)['"]/);
  if (exportFromMatch) {
    const isTypeOnly = line.includes('export type');
    imports.push({
      specifier: exportFromMatch[1],
      type: classifyImportType(exportFromMatch[1]),
      line: lineNum,
      isTypeOnly,
    });
    return;
  }

  // CommonJS require
  const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
  if (requireMatch) {
    imports.push({
      specifier: requireMatch[1],
      type: classifyImportType(requireMatch[1]),
      line: lineNum,
      isTypeOnly: false,
    });
    return;
  }

  // Dynamic import
  const dynamicMatch = line.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
  if (dynamicMatch) {
    imports.push({
      specifier: dynamicMatch[1],
      type: classifyImportType(dynamicMatch[1]),
      line: lineNum,
      isTypeOnly: false,
    });
  }
}

/**
 * Classify import type based on specifier
 */
export function classifyImportType(specifier: string): 'relative' | 'absolute' | 'package' {
  if (specifier.startsWith('.')) {
    return 'relative';
  }
  if (specifier.startsWith('/') || /^[a-zA-Z]:/.test(specifier)) {
    return 'absolute';
  }
  return 'package';
}

/**
 * Resolve a relative import specifier to an actual file path
 */
export function resolveImport(
  specifier: string,
  fromFile: string,
  basePath: string
): string | null {
  // Only handle relative imports
  if (!specifier.startsWith('.')) {
    return null;
  }

  const fromDir = dirname(fromFile);
  const resolvedBase = resolve(basePath, fromDir, specifier);

  // Try different extensions and index files
  const candidates = [
    resolvedBase,
    `${resolvedBase}.ts`,
    `${resolvedBase}.tsx`,
    `${resolvedBase}.js`,
    `${resolvedBase}.jsx`,
    `${resolvedBase}.mjs`,
    `${resolvedBase}/index.ts`,
    `${resolvedBase}/index.tsx`,
    `${resolvedBase}/index.js`,
    `${resolvedBase}/index.jsx`,
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      // Return path relative to basePath
      return candidate.replace(basePath + '/', '');
    }
  }

  return null;
}

/**
 * Parse imports and resolve related files
 */
export function parseImportsWithResolution(
  content: string,
  filePath: string,
  basePath: string
): ImportParseResult {
  const imports = parseImports(content);
  const relatedFiles: string[] = [];

  for (const imp of imports) {
    if (imp.type === 'relative') {
      const resolved = resolveImport(imp.specifier, filePath, basePath);
      if (resolved && !relatedFiles.includes(resolved)) {
        relatedFiles.push(resolved);
      }
    }
  }

  return { imports, relatedFiles };
}

/**
 * Extract all import specifiers from content (quick extraction without full parsing)
 */
export function extractImportSpecifiers(content: string): string[] {
  const specifiers: string[] = [];

  // Combined pattern for common import forms
  const importPattern = /(?:import|require|from)\s*\(?['"]([^'"]+)['"]\)?/g;

  let match;
  while ((match = importPattern.exec(content)) !== null) {
    const spec = match[1];
    if (!specifiers.includes(spec)) {
      specifiers.push(spec);
    }
  }

  return specifiers;
}

/**
 * Check if a file is TypeScript/JavaScript
 */
export function isJsTsFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext);
}

/**
 * Build a simple dependency graph for files
 */
export function buildDependencyGraph(
  files: Array<{ path: string; content: string }>,
  basePath: string
): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const file of files) {
    if (!isJsTsFile(file.path)) {
      graph.set(file.path, []);
      continue;
    }

    const { relatedFiles } = parseImportsWithResolution(file.content, file.path, basePath);
    graph.set(file.path, relatedFiles);
  }

  return graph;
}

/**
 * Find files that import a given file (reverse dependencies)
 */
export function findImporters(
  targetFile: string,
  dependencyGraph: Map<string, string[]>
): string[] {
  const importers: string[] = [];

  for (const [file, deps] of dependencyGraph) {
    if (deps.includes(targetFile)) {
      importers.push(file);
    }
  }

  return importers;
}
