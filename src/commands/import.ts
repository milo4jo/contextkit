import { Command } from 'commander';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { initDatabase, openDatabase } from '../db/index.js';
import { writeMessage, writeError } from '../utils/streams.js';
import { formatDim } from '../utils/format.js';
import { getGlobalOpts } from '../utils/cli.js';
import { getDbPath, getConfigPath } from '../config/index.js';
import { InvalidUsageError } from '../errors/index.js';

interface ExportData {
  version: string;
  exportedAt: string;
  stats: {
    files: number;
    chunks: number;
    embedded: number;
  };
  sources: Array<{
    id: string;
    path: string;
    config: string | null;
    fileCount: number;
    chunkCount: number;
    indexedAt: string | null;
  }>;
  files: Array<{
    id: string;
    sourceId: string;
    filePath: string;
    contentHash: string;
    indexedAt: string;
  }>;
  chunks: Array<{
    id: string;
    sourceId: string;
    filePath: string;
    content: string;
    startLine: number | null;
    endLine: number | null;
    tokens: number;
    embedding: string | null; // base64 encoded
    createdAt: string;
  }>;
}

export const importCommand = new Command('import')
  .description('Import an index from a JSON export file')
  .argument('<file>', 'Export file to import')
  .option('--force', 'Overwrite existing index without asking')
  .option('--merge', 'Merge with existing index (add new sources)')
  .action(async (file: string, options: { force?: boolean; merge?: boolean }) => {
    const opts = getGlobalOpts(importCommand);
    const cwd = process.cwd();

    // Check if file exists
    if (!existsSync(file)) {
      throw new InvalidUsageError(`File not found: ${file}`);
    }

    // Read and parse the export file
    let exportData: ExportData;
    try {
      const content = readFileSync(file, 'utf-8');
      exportData = JSON.parse(content) as ExportData;
    } catch (error) {
      throw new InvalidUsageError(
        `Failed to parse export file: ${error instanceof Error ? error.message : 'Invalid JSON'}`
      );
    }

    // Validate export format
    if (!exportData.version || !exportData.sources || !exportData.chunks) {
      throw new InvalidUsageError('Invalid export file format. Missing required fields.');
    }

    // Check if already initialized
    const configPath = getConfigPath();
    const dbPath = getDbPath();
    const isInitialized = existsSync(configPath);

    if (isInitialized && !options.force && !options.merge) {
      writeError('ContextKit is already initialized in this directory.');
      writeError('Use --force to overwrite or --merge to add to existing index.');
      return;
    }

    // Create .contextkit directory if needed
    const contextKitDir = resolve(cwd, '.contextkit');
    if (!existsSync(contextKitDir)) {
      mkdirSync(contextKitDir, { recursive: true });
    }

    // Create minimal config if not exists
    if (!existsSync(configPath)) {
      const configContent = `version: 1
sources: []
settings:
  chunk_size: 500
  chunk_overlap: 50
  embedding_model: gte-small
`;
      const fs = await import('fs');
      fs.writeFileSync(configPath, configContent);
    }

    // Initialize or open database
    const db = isInitialized && options.merge ? openDatabase() : initDatabase(dbPath);

    try {
      // If not merging, clear existing data
      if (!options.merge) {
        db.exec('DELETE FROM chunks');
        db.exec('DELETE FROM files');
        db.exec('DELETE FROM sources');
        db.exec('DELETE FROM query_cache');
      }

      // Begin transaction for faster import
      db.exec('BEGIN TRANSACTION');

      try {
        // Import sources
        const sourceStmt = db.prepare(`
          INSERT OR REPLACE INTO sources (id, path, config, file_count, chunk_count, indexed_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const source of exportData.sources) {
          sourceStmt.run(
            source.id,
            source.path,
            source.config,
            source.fileCount,
            source.chunkCount,
            source.indexedAt
          );
        }

        // Import files
        const fileStmt = db.prepare(`
          INSERT OR REPLACE INTO files (id, source_id, file_path, content_hash, indexed_at)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const file of exportData.files) {
          fileStmt.run(file.id, file.sourceId, file.filePath, file.contentHash, file.indexedAt);
        }

        // Import chunks
        const chunkStmt = db.prepare(`
          INSERT OR REPLACE INTO chunks (id, source_id, file_path, content, start_line, end_line, tokens, embedding, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let embeddedCount = 0;
        for (const chunk of exportData.chunks) {
          const embedding = chunk.embedding ? Buffer.from(chunk.embedding, 'base64') : null;

          if (embedding) embeddedCount++;

          chunkStmt.run(
            chunk.id,
            chunk.sourceId,
            chunk.filePath,
            chunk.content,
            chunk.startLine,
            chunk.endLine,
            chunk.tokens,
            embedding,
            chunk.createdAt
          );
        }

        db.exec('COMMIT');

        // Update config with sources
        const config = await import('../config/index.js');
        const currentConfig = config.loadConfig();

        // Add any new sources to config
        for (const source of exportData.sources) {
          const existingSource = currentConfig.sources?.find(
            (s: { id: string }) => s.id === source.id
          );
          if (!existingSource) {
            if (!currentConfig.sources) currentConfig.sources = [];
            currentConfig.sources.push({
              id: source.id,
              path: source.path,
              patterns: {
                include: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
                exclude: ['**/node_modules/**', '**/*.test.ts', '**/*.spec.ts'],
              },
            });
          }
        }
        config.saveConfig(currentConfig);

        if (!opts.json) {
          writeMessage('');
          writeMessage('✅ Index imported successfully');
          writeMessage('');
          writeMessage(`   Sources:    ${exportData.sources.length}`);
          writeMessage(`   Files:      ${exportData.files.length}`);
          writeMessage(`   Chunks:     ${exportData.chunks.length}`);
          writeMessage(`   Embeddings: ${embeddedCount}/${exportData.chunks.length}`);
          writeMessage('');

          if (embeddedCount < exportData.chunks.length) {
            writeMessage(formatDim('   ⚠ Some chunks have no embeddings.'));
            writeMessage(formatDim('   Run `contextkit index` to generate them.'));
            writeMessage('');
          }
        } else {
          writeMessage(
            JSON.stringify({
              success: true,
              sources: exportData.sources.length,
              files: exportData.files.length,
              chunks: exportData.chunks.length,
              embedded: embeddedCount,
            })
          );
        }
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    } finally {
      db.close();
    }
  });
