/**
 * Diff Command
 * 
 * Shows what has changed since the last index.
 * Helps users understand if they need to re-index.
 */

import { Command } from 'commander';
import Database from 'better-sqlite3';
import { loadConfig, ensureInitialized } from '../config/index.js';
import { openDatabase } from '../db/index.js';
import { discoverFiles, type DiscoveredFile } from '../indexer/discovery.js';
import { writeMessage, writeData } from '../utils/streams.js';
import { formatBold, formatDim, formatSuccess, formatWarning, formatError, formatHighlight, formatCommand } from '../utils/format.js';
import { getGlobalOpts } from '../utils/cli.js';

interface StoredFile {
  file_path: string;
  content_hash: string;
  indexed_at: string;
}

interface DiffResult {
  sourceId: string;
  modified: Array<{ path: string; chunks?: number }>;
  added: string[];
  removed: Array<{ path: string; chunks: number }>;
}

interface DiffSummary {
  sources: DiffResult[];
  totalModified: number;
  totalAdded: number;
  totalRemoved: number;
  needsReindex: boolean;
}

/**
 * Get all stored files for a source from the database
 */
function getStoredFiles(db: Database.Database, sourceId: string): Map<string, StoredFile> {
  const rows = db.prepare(`
    SELECT file_path, content_hash, indexed_at 
    FROM files 
    WHERE source_id = ?
  `).all(sourceId) as StoredFile[];
  
  const map = new Map<string, StoredFile>();
  for (const row of rows) {
    map.set(row.file_path, row);
  }
  return map;
}

/**
 * Get chunk counts per file
 */
function getChunkCounts(db: Database.Database, sourceId: string): Map<string, number> {
  const rows = db.prepare(`
    SELECT file_path, COUNT(*) as count 
    FROM chunks 
    WHERE source_id = ?
    GROUP BY file_path
  `).all(sourceId) as Array<{ file_path: string; count: number }>;
  
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.file_path, row.count);
  }
  return map;
}

/**
 * Compute diff for a single source
 */
function computeSourceDiff(
  sourceId: string,
  discovered: DiscoveredFile[],
  storedFiles: Map<string, StoredFile>,
  chunkCounts: Map<string, number>
): DiffResult {
  const modified: Array<{ path: string; chunks?: number }> = [];
  const added: string[] = [];
  const removed: Array<{ path: string; chunks: number }> = [];
  
  const currentPaths = new Set<string>();
  
  // Check discovered files against stored
  for (const file of discovered) {
    currentPaths.add(file.relativePath);
    const stored = storedFiles.get(file.relativePath);
    
    if (!stored) {
      // New file
      added.push(file.relativePath);
    } else if (stored.content_hash !== file.contentHash) {
      // Modified file
      const chunks = chunkCounts.get(file.relativePath);
      modified.push({ path: file.relativePath, chunks });
    }
  }
  
  // Find removed files
  for (const [path] of storedFiles) {
    if (!currentPaths.has(path)) {
      const chunks = chunkCounts.get(path) ?? 0;
      removed.push({ path, chunks });
    }
  }
  
  return {
    sourceId,
    modified,
    added,
    removed,
  };
}

export const diffCommand = new Command('diff')
  .description('Show changes since last index')
  .option('-s, --source <name>', 'Check only a specific source')
  .action(async (options) => {
    ensureInitialized();

    const config = loadConfig();
    const opts = getGlobalOpts(diffCommand);

    if (config.sources.length === 0) {
      writeMessage(`No sources configured. Add sources with ${formatCommand('contextkit source add <path>')}`);
      process.exit(0);
    }

    // Filter sources if specified
    let sourcesToCheck = config.sources;
    if (options.source) {
      const source = config.sources.find((s) => s.id === options.source);
      if (!source) {
        writeMessage(formatError(`Source "${options.source}" not found`));
        process.exit(1);
      }
      sourcesToCheck = [source];
    }

    const db = openDatabase();
    const results: DiffResult[] = [];

    try {
      for (const source of sourcesToCheck) {
        // Discover current files
        const discovery = discoverFiles(source, process.cwd());
        
        // Get stored state
        const storedFiles = getStoredFiles(db, source.id);
        const chunkCounts = getChunkCounts(db, source.id);
        
        // Compute diff
        const diff = computeSourceDiff(
          source.id,
          discovery.files,
          storedFiles,
          chunkCounts
        );
        
        results.push(diff);
      }

      // Compute summary
      const summary: DiffSummary = {
        sources: results,
        totalModified: results.reduce((sum, r) => sum + r.modified.length, 0),
        totalAdded: results.reduce((sum, r) => sum + r.added.length, 0),
        totalRemoved: results.reduce((sum, r) => sum + r.removed.length, 0),
        needsReindex: false,
      };
      summary.needsReindex = summary.totalModified > 0 || summary.totalAdded > 0 || summary.totalRemoved > 0;

      // JSON output
      if (opts.json) {
        writeData(JSON.stringify(summary, null, 2));
        return;
      }

      // Human-readable output
      writeMessage('');
      
      if (!summary.needsReindex) {
        writeMessage(formatSuccess('✓ Index is up to date'));
        writeMessage(formatDim('  No changes since last index'));
        writeMessage('');
        return;
      }

      writeMessage(formatBold('Changes since last index:'));
      writeMessage('');

      for (const result of results) {
        const hasChanges = result.modified.length > 0 || result.added.length > 0 || result.removed.length > 0;
        
        if (!hasChanges) {
          continue;
        }

        writeMessage(formatHighlight(`[${result.sourceId}]`));

        // Modified files
        for (const file of result.modified) {
          const chunks = file.chunks ? formatDim(` (${file.chunks} chunks affected)`) : '';
          writeMessage(`  ${formatWarning('M')} ${file.path}${chunks}`);
        }

        // Added files
        for (const file of result.added) {
          writeMessage(`  ${formatSuccess('A')} ${file}`);
        }

        // Removed files
        for (const file of result.removed) {
          const chunks = file.chunks > 0 ? formatDim(` (${file.chunks} chunks)`) : '';
          writeMessage(`  ${formatError('D')} ${file.path}${chunks}`);
        }

        writeMessage('');
      }

      // Summary line
      const parts = [];
      if (summary.totalModified > 0) {
        parts.push(formatWarning(`${summary.totalModified} modified`));
      }
      if (summary.totalAdded > 0) {
        parts.push(formatSuccess(`${summary.totalAdded} added`));
      }
      if (summary.totalRemoved > 0) {
        parts.push(formatError(`${summary.totalRemoved} removed`));
      }

      writeMessage(formatDim(`Summary: ${parts.join(', ')}`));
      writeMessage('');
      writeMessage(`Run ${formatCommand('contextkit index')} to update the index.`);
      writeMessage('');

    } finally {
      db.close();
    }
  });
