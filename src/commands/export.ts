import { Command } from 'commander';
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { openDatabase, getIndexStats } from '../db/index.js';
import { writeData, writeMessage, writeError } from '../utils/streams.js';
import { formatDim, formatBytes } from '../utils/format.js';
import { getGlobalOpts } from '../utils/cli.js';
import { NotInitializedError } from '../errors/index.js';

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

export const exportCommand = new Command('export')
  .description('Export the index to a JSON file for sharing or backup')
  .argument('[output]', 'Output file path (default: stdout or contextkit-export.json)')
  .option('--no-embeddings', 'Exclude embeddings (smaller file, requires re-indexing)')
  .option('-o, --output <file>', 'Output file path')
  .action(
    async (outputArg: string | undefined, options: { embeddings: boolean; output?: string }) => {
      const opts = getGlobalOpts(exportCommand);
      const cwd = process.cwd();
      const configPath = resolve(cwd, '.contextkit', 'config.yaml');

      if (!existsSync(configPath)) {
        throw new NotInitializedError();
      }

      const db = openDatabase();

      try {
        const stats = getIndexStats(db);

        if (stats.chunkCount === 0) {
          writeError('No index to export. Run `contextkit index` first.');
          return;
        }

        // Gather all data
        const sources = db
          .prepare(
            `
        SELECT id, path, config, file_count, chunk_count, indexed_at
        FROM sources
      `
          )
          .all() as Array<{
          id: string;
          path: string;
          config: string | null;
          file_count: number;
          chunk_count: number;
          indexed_at: string | null;
        }>;

        const files = db
          .prepare(
            `
        SELECT id, source_id, file_path, content_hash, indexed_at
        FROM files
      `
          )
          .all() as Array<{
          id: string;
          source_id: string;
          file_path: string;
          content_hash: string;
          indexed_at: string;
        }>;

        const chunksQuery = options.embeddings
          ? `SELECT id, source_id, file_path, content, start_line, end_line, tokens, embedding, created_at FROM chunks`
          : `SELECT id, source_id, file_path, content, start_line, end_line, tokens, NULL as embedding, created_at FROM chunks`;

        const chunks = db.prepare(chunksQuery).all() as Array<{
          id: string;
          source_id: string;
          file_path: string;
          content: string;
          start_line: number | null;
          end_line: number | null;
          tokens: number;
          embedding: Buffer | null;
          created_at: string;
        }>;

        const exportData: ExportData = {
          version: '1',
          exportedAt: new Date().toISOString(),
          stats: {
            files: stats.fileCount,
            chunks: stats.chunkCount,
            embedded: options.embeddings ? stats.embeddedCount : 0,
          },
          sources: sources.map((s) => ({
            id: s.id,
            path: s.path,
            config: s.config,
            fileCount: s.file_count,
            chunkCount: s.chunk_count,
            indexedAt: s.indexed_at,
          })),
          files: files.map((f) => ({
            id: f.id,
            sourceId: f.source_id,
            filePath: f.file_path,
            contentHash: f.content_hash,
            indexedAt: f.indexed_at,
          })),
          chunks: chunks.map((c) => ({
            id: c.id,
            sourceId: c.source_id,
            filePath: c.file_path,
            content: c.content,
            startLine: c.start_line,
            endLine: c.end_line,
            tokens: c.tokens,
            embedding: c.embedding ? c.embedding.toString('base64') : null,
            createdAt: c.created_at,
          })),
        };

        const jsonOutput = JSON.stringify(exportData, null, 2);
        const outputPath = options.output || outputArg;

        if (outputPath) {
          writeFileSync(outputPath, jsonOutput);
          const fileSize = Buffer.byteLength(jsonOutput);

          if (!opts.json) {
            writeMessage('');
            writeMessage('✅ Index exported successfully');
            writeMessage('');
            writeMessage(`   Output:     ${outputPath}`);
            writeMessage(`   Size:       ${formatBytes(fileSize)}`);
            writeMessage(`   Files:      ${stats.fileCount}`);
            writeMessage(`   Chunks:     ${stats.chunkCount}`);
            writeMessage(`   Embeddings: ${options.embeddings ? 'included' : 'excluded'}`);
            writeMessage('');
            writeMessage(formatDim('   Import with: contextkit import ' + outputPath));
            writeMessage('');
          } else {
            writeData(
              JSON.stringify({
                success: true,
                path: outputPath,
                size: fileSize,
                stats: exportData.stats,
              })
            );
          }
        } else {
          // Output to stdout
          writeData(jsonOutput);
        }
      } finally {
        db.close();
      }
    }
  );
