/**
 * Main Indexer Module
 *
 * Orchestrates file discovery, chunking, embedding, and storage.
 */

import Database from 'better-sqlite3';
import { discoverFiles } from './discovery.js';
import { chunkFiles, type ChunkOptions } from './chunker.js';
import { embedChunks, type EmbeddedChunk } from './embeddings.js';
import type { Source } from '../config/types.js';

/** Indexing statistics */
export interface IndexStats {
  sources: number;
  files: number;
  chunks: number;
  skipped: number;
  timeMs: number;
}

/** Progress update */
export interface IndexProgress {
  phase: 'discovery' | 'chunking' | 'embedding' | 'storing';
  sourceId: string;
  current: number;
  total: number;
}

/** Progress callback */
export type IndexProgressCallback = (progress: IndexProgress) => void;

/**
 * Index all sources
 */
export async function indexSources(
  sources: Source[],
  baseDir: string,
  db: Database.Database,
  chunkOptions: ChunkOptions,
  onProgress?: IndexProgressCallback
): Promise<IndexStats> {
  const startTime = Date.now();
  let totalFiles = 0;
  let totalChunks = 0;
  let totalSkipped = 0;

  for (const source of sources) {
    // Phase 1: Discovery
    onProgress?.({
      phase: 'discovery',
      sourceId: source.id,
      current: 0,
      total: 0,
    });

    const discovered = discoverFiles(source, baseDir);
    totalFiles += discovered.files.length;
    totalSkipped += discovered.skipped;

    onProgress?.({
      phase: 'discovery',
      sourceId: source.id,
      current: discovered.files.length,
      total: discovered.files.length,
    });

    // Phase 2: Chunking
    onProgress?.({
      phase: 'chunking',
      sourceId: source.id,
      current: 0,
      total: discovered.files.length,
    });

    const chunks = chunkFiles(discovered.files, chunkOptions);

    onProgress?.({
      phase: 'chunking',
      sourceId: source.id,
      current: discovered.files.length,
      total: discovered.files.length,
    });

    // Phase 3: Embedding
    const embeddedChunks = await embedChunks(chunks, (current, total) => {
      onProgress?.({
        phase: 'embedding',
        sourceId: source.id,
        current,
        total,
      });
    });

    // Phase 4: Store in database
    onProgress?.({
      phase: 'storing',
      sourceId: source.id,
      current: 0,
      total: embeddedChunks.length,
    });

    storeChunks(db, source.id, source.path, embeddedChunks, discovered.files.length);
    totalChunks += embeddedChunks.length;

    onProgress?.({
      phase: 'storing',
      sourceId: source.id,
      current: embeddedChunks.length,
      total: embeddedChunks.length,
    });
  }

  return {
    sources: sources.length,
    files: totalFiles,
    chunks: totalChunks,
    skipped: totalSkipped,
    timeMs: Date.now() - startTime,
  };
}

/**
 * Store chunks in the database
 */
function storeChunks(
  db: Database.Database,
  sourceId: string,
  sourcePath: string,
  chunks: EmbeddedChunk[],
  fileCount: number
): void {
  // Begin transaction for performance
  const transaction = db.transaction(() => {
    // Clear existing chunks for this source
    db.prepare('DELETE FROM chunks WHERE source_id = ?').run(sourceId);

    // Update source record
    db.prepare(
      `
      INSERT INTO sources (id, path, file_count, chunk_count, indexed_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        path = excluded.path,
        file_count = excluded.file_count,
        chunk_count = excluded.chunk_count,
        indexed_at = excluded.indexed_at
    `
    ).run(sourceId, sourcePath, fileCount, chunks.length);

    // Insert chunks
    const insertChunk = db.prepare(`
      INSERT INTO chunks (id, source_id, file_path, content, start_line, end_line, tokens, embedding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const chunk of chunks) {
      // Convert embedding to binary blob
      const embeddingBlob = Buffer.from(new Float32Array(chunk.embedding).buffer);

      insertChunk.run(
        chunk.id,
        chunk.sourceId,
        chunk.filePath,
        chunk.content,
        chunk.startLine,
        chunk.endLine,
        chunk.tokens,
        embeddingBlob
      );
    }
  });

  transaction();
}

/**
 * Read embedding from blob
 */
export function readEmbedding(blob: Buffer): number[] {
  const float32Array = new Float32Array(blob.buffer, blob.byteOffset, blob.length / 4);
  return Array.from(float32Array);
}

// Re-export types and functions
export { discoverFiles, type DiscoveredFile, type DiscoveryResult } from './discovery.js';
export { chunkFiles, chunkFile, countTokens, type Chunk, type ChunkOptions } from './chunker.js';
export {
  embed,
  embedBatch,
  embedChunks,
  cosineSimilarity,
  EMBEDDING_DIM,
  type EmbeddedChunk,
} from './embeddings.js';
