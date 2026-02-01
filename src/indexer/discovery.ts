/**
 * File Discovery Module
 *
 * Discovers files in sources based on include/exclude patterns.
 */

import { resolve } from 'path';
import { readFileSync, statSync } from 'fs';
import fg from 'fast-glob';
import type { Source } from '../config/types.js';

/** Maximum file size to process (100KB) */
const MAX_FILE_SIZE = 100 * 1024;

/** File info returned by discovery */
export interface DiscoveredFile {
  /** Absolute path to file */
  path: string;
  /** Path relative to source */
  relativePath: string;
  /** Source this file belongs to */
  sourceId: string;
  /** File content */
  content: string;
  /** File size in bytes */
  size: number;
}

/** Discovery result for a source */
export interface DiscoveryResult {
  sourceId: string;
  files: DiscoveredFile[];
  skipped: number; // Files skipped (too large, binary, etc.)
}

/**
 * Discover all files in a source
 */
export function discoverFiles(source: Source, baseDir: string): DiscoveryResult {
  const sourcePath = resolve(baseDir, source.path);

  // Find matching files
  const matches = fg.sync(source.patterns.include, {
    cwd: sourcePath,
    ignore: source.patterns.exclude,
    onlyFiles: true,
    absolute: false,
  });

  const files: DiscoveredFile[] = [];
  let skipped = 0;

  for (const relativePath of matches) {
    const absolutePath = resolve(sourcePath, relativePath);

    try {
      const stats = statSync(absolutePath);

      // Skip files that are too large
      if (stats.size > MAX_FILE_SIZE) {
        skipped++;
        continue;
      }

      // Read file content
      const content = readFileSync(absolutePath, 'utf-8');

      // Skip binary files (simple heuristic: check for null bytes)
      if (content.includes('\0')) {
        skipped++;
        continue;
      }

      files.push({
        path: absolutePath,
        relativePath,
        sourceId: source.id,
        content,
        size: stats.size,
      });
    } catch {
      // Skip files we can't read
      skipped++;
    }
  }

  return {
    sourceId: source.id,
    files,
    skipped,
  };
}

/**
 * Discover files from multiple sources
 */
export function discoverAllFiles(sources: Source[], baseDir: string): DiscoveryResult[] {
  return sources.map((source) => discoverFiles(source, baseDir));
}
