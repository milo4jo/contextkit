/**
 * Watch Command
 *
 * Watches source directories and auto-reindexes on changes.
 */

import { Command } from 'commander';
import chokidar from 'chokidar';
import { resolve, relative } from 'path';
import { loadConfig, ensureInitialized } from '../config/index.js';
import { openDatabase } from '../db/index.js';
import { indexSources } from '../indexer/index.js';
import { writeMessage, writeSuccess, writeWarning, writeDim } from '../utils/streams.js';
import { formatHighlight, formatDim } from '../utils/format.js';

/** Default debounce time in milliseconds */
const DEFAULT_DEBOUNCE_MS = 1000;

export const watchCommand = new Command('watch')
  .description('Watch sources and auto-reindex on changes')
  .option('-d, --debounce <ms>', 'Debounce time in milliseconds', String(DEFAULT_DEBOUNCE_MS))
  .action(async (options) => {
    ensureInitialized();

    const config = loadConfig();
    const debounceMs = parseInt(options.debounce) || DEFAULT_DEBOUNCE_MS;

    if (config.sources.length === 0) {
      writeWarning('No sources configured');
      writeMessage('Add sources first with: contextkit source add <path>');
      process.exit(1);
    }

    const cwd = process.cwd();

    // Build watch patterns from sources
    const watchPaths: string[] = [];
    for (const source of config.sources) {
      const sourcePath = resolve(cwd, source.path);
      watchPaths.push(sourcePath);
    }

    writeMessage('');
    writeMessage(
      `${formatHighlight('👁️  Watching')} ${config.sources.length} source(s) for changes...`
    );
    writeMessage(formatDim(`   Debounce: ${debounceMs}ms`));
    writeMessage('');

    for (const source of config.sources) {
      writeMessage(`   • ${source.id}: ${source.path}`);
    }

    writeMessage('');
    writeMessage(formatDim('Press Ctrl+C to stop watching.'));
    writeMessage('');

    // Track pending changes
    const pendingChanges = new Set<string>();
    let debounceTimer: NodeJS.Timeout | null = null;
    let isIndexing = false;

    /**
     * Run indexing for pending changes
     */
    async function runIndex() {
      if (isIndexing) return;
      if (pendingChanges.size === 0) return;

      isIndexing = true;
      const changedFiles = Array.from(pendingChanges);
      pendingChanges.clear();

      const timestamp = new Date().toLocaleTimeString();
      writeMessage(
        `${formatDim(`[${timestamp}]`)} Detected ${changedFiles.length} change(s), reindexing...`
      );

      const db = openDatabase();

      try {
        const stats = await indexSources(config.sources, cwd, db, {
          chunkSize: config.settings.chunk_size,
          chunkOverlap: config.settings.chunk_overlap,
        });

        if (stats.filesChanged > 0) {
          writeSuccess(`Indexed ${stats.filesChanged} changed file(s) → ${stats.chunks} chunks`);
        } else {
          writeMessage(formatDim('No changes detected.'));
        }
      } catch (error) {
        writeWarning(`Index error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        db.close();
        isIndexing = false;

        // If more changes accumulated while indexing, run again
        if (pendingChanges.size > 0) {
          scheduleIndex();
        }
      }
    }

    /**
     * Schedule an index run with debouncing
     */
    function scheduleIndex() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(runIndex, debounceMs);
    }

    /**
     * Handle file change event
     */
    function handleChange(filePath: string, eventType: string) {
      // Get relative path for display
      const relPath = relative(cwd, filePath);

      // Check if file matches any source patterns
      let matchesSource = false;
      for (const source of config.sources) {
        const sourcePath = resolve(cwd, source.path);
        if (filePath.startsWith(sourcePath)) {
          // Check include patterns
          for (const pattern of source.patterns.include) {
            // Simple check - could be more sophisticated
            const ext = pattern.replace('**/*', '').replace('*', '');
            if (filePath.endsWith(ext) || pattern === '**/*') {
              matchesSource = true;
              break;
            }
          }

          // Check exclude patterns
          if (matchesSource) {
            for (const pattern of source.patterns.exclude) {
              if (pattern.includes('node_modules') && filePath.includes('node_modules')) {
                matchesSource = false;
                break;
              }
              if (pattern.includes('.test.') && filePath.includes('.test.')) {
                matchesSource = false;
                break;
              }
            }
          }
        }
        if (matchesSource) break;
      }

      if (matchesSource) {
        pendingChanges.add(filePath);
        writeDim(`   ${eventType}: ${relPath}`);
        scheduleIndex();
      }
    }

    // Setup file watcher
    const watcher = chokidar.watch(watchPaths, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.contextkit/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    });

    watcher
      .on('add', (path) => handleChange(path, 'added'))
      .on('change', (path) => handleChange(path, 'changed'))
      .on('unlink', (path) => handleChange(path, 'removed'));

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      writeMessage('');
      writeMessage('Stopping watch...');
      watcher.close();
      process.exit(0);
    });

    // Keep process running
    await new Promise(() => {});
  });
