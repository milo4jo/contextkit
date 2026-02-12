/**
 * Main Indexer Module
 *
 * Orchestrates file discovery, chunking, embedding, and storage.
 * Supports incremental indexing via content hashing.
 */

import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { discoverFiles, type DiscoveredFile } from './discovery.js';
import { chunkFilesAsync, type ChunkOptions } from './chunker.js';
import { embedChunks, type EmbeddedChunk } from './embeddings.js';
import type { Source } from '../config/types.js';

/** Indexing statistics */
export interface IndexStats {
  sources: number;
  files: number;
  chunks: number;
  skipped: number;
  timeMs: number;
  /** Files that were actually re-indexed (changed/new) */
  filesChanged: number;
  /** Files that were unchanged (skipped) */
  filesUnchanged: number;
  /** Files that were removed from index */
  filesRemoved: number;
}

/**
 * Get all stored file hashes for a source
 */
function getStoredFiles(db: Database.Database, sourceId: string): Map<string, string> {
  const rows = db
    .prepare('SELECT file_path, content_hash FROM files WHERE source_id = ?')
    .all(sourceId) as Array<{ file_path: string; content_hash: string }>;

  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.file_path, row.content_hash);
  }
  return map;
}

/**
 * Determine which files need to be indexed
 */
function categorizeFiles(
  discovered: DiscoveredFile[],
  stored: Map<string, string>
): {
  new: DiscoveredFile[];
  changed: DiscoveredFile[];
  unchanged: DiscoveredFile[];
  removed: string[];
} {
  const newFiles: DiscoveredFile[] = [];
  const changedFiles: DiscoveredFile[] = [];
  const unchangedFiles: DiscoveredFile[] = [];
  const currentPaths = new Set<string>();

  for (const file of discovered) {
    currentPaths.add(file.relativePath);
    const storedHash = stored.get(file.relativePath);

    if (!storedHash) {
      // New file
      newFiles.push(file);
    } else if (storedHash !== file.contentHash) {
      // Changed file
      changedFiles.push(file);
    } else {
      // Unchanged
      unchangedFiles.push(file);
    }
  }

  // Find removed files
  const removedFiles: string[] = [];
  for (const [path] of stored) {
    if (!currentPaths.has(path)) {
      removedFiles.push(path);
    }
  }

  return {
    new: newFiles,
    changed: changedFiles,
    unchanged: unchangedFiles,
    removed: removedFiles,
  };
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

/** Options for indexing */
export interface IndexOptions extends ChunkOptions {
  /** Force full re-index (ignore hashes) */
  force?: boolean;
}

/**
 * Index all sources with incremental support
 */
export async function indexSources(
  sources: Source[],
  baseDir: string,
  db: Database.Database,
  chunkOptions: ChunkOptions,
  onProgress?: IndexProgressCallback,
  options?: { force?: boolean }
): Promise<IndexStats> {
  const startTime = Date.now();
  let totalFiles = 0;
  let totalChunks = 0;
  let totalSkipped = 0;
  let totalFilesChanged = 0;
  let totalFilesUnchanged = 0;
  let totalFilesRemoved = 0;

  const forceReindex = options?.force ?? false;

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

    // Get stored file hashes for incremental indexing
    const storedFiles = forceReindex ? new Map() : getStoredFiles(db, source.id);
    const {
      new: newFiles,
      changed: changedFiles,
      unchanged: unchangedFiles,
      removed: removedFiles,
    } = categorizeFiles(discovered.files, storedFiles);

    // Files to process = new + changed
    const filesToProcess = [...newFiles, ...changedFiles];
    totalFilesChanged += filesToProcess.length;
    totalFilesUnchanged += unchangedFiles.length;
    totalFilesRemoved += removedFiles.length;

    // Phase 2: Chunking (only for new/changed files)
    // Uses async chunking to support tree-sitter languages (Python, Go, Rust)
    onProgress?.({
      phase: 'chunking',
      sourceId: source.id,
      current: 0,
      total: filesToProcess.length,
    });

    const chunks = await chunkFilesAsync(filesToProcess, chunkOptions);

    onProgress?.({
      phase: 'chunking',
      sourceId: source.id,
      current: filesToProcess.length,
      total: filesToProcess.length,
    });

    // Phase 3: Embedding (only for new/changed files)
    let embeddedChunks: EmbeddedChunk[] = [];
    if (chunks.length > 0) {
      embeddedChunks = await embedChunks(chunks, (current, total) => {
        onProgress?.({
          phase: 'embedding',
          sourceId: source.id,
          current,
          total,
        });
      });
    }

    // Phase 4: Store in database (incremental)
    onProgress?.({
      phase: 'storing',
      sourceId: source.id,
      current: 0,
      total: embeddedChunks.length,
    });

    storeChunksIncremental(
      db,
      source.id,
      source.path,
      embeddedChunks,
      filesToProcess,
      removedFiles,
      discovered.files.length
    );
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
    filesChanged: totalFilesChanged,
    filesUnchanged: totalFilesUnchanged,
    filesRemoved: totalFilesRemoved,
    timeMs: Date.now() - startTime,
  };
}

/**
 * Generate unique file ID
 */
function generateFileId(sourceId: string, filePath: string): string {
  const base = `${sourceId}:${filePath}`;
  return createHash('sha256').update(base).digest('hex').slice(0, 16);
}

/**
 * Store chunks incrementally (only for changed files)
 */
function storeChunksIncremental(
  db: Database.Database,
  sourceId: string,
  sourcePath: string,
  chunks: EmbeddedChunk[],
  processedFiles: DiscoveredFile[],
  removedFiles: string[],
  totalFileCount: number
): void {
  // Begin transaction for performance
  const transaction = db.transaction(() => {
    // FIRST: Ensure source exists (for foreign key constraints)
    db.prepare(
      `
      INSERT INTO sources (id, path, file_count, chunk_count, indexed_at)
      VALUES (?, ?, 0, 0, datetime('now'))
      ON CONFLICT(id) DO NOTHING
    `
    ).run(sourceId, sourcePath);

    // Delete chunks for removed files
    if (removedFiles.length > 0) {
      const deleteChunks = db.prepare('DELETE FROM chunks WHERE source_id = ? AND file_path = ?');
      const deleteFile = db.prepare('DELETE FROM files WHERE source_id = ? AND file_path = ?');

      for (const filePath of removedFiles) {
        deleteChunks.run(sourceId, filePath);
        deleteFile.run(sourceId, filePath);
      }
    }

    // Delete chunks for processed (changed) files - they'll be replaced
    if (processedFiles.length > 0) {
      const deleteChunks = db.prepare('DELETE FROM chunks WHERE source_id = ? AND file_path = ?');

      for (const file of processedFiles) {
        deleteChunks.run(sourceId, file.relativePath);
      }
    }

    // Insert/update file records with new hashes
    const upsertFile = db.prepare(`
      INSERT INTO files (id, source_id, file_path, content_hash, indexed_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(source_id, file_path) DO UPDATE SET
        content_hash = excluded.content_hash,
        indexed_at = excluded.indexed_at
    `);

    for (const file of processedFiles) {
      const fileId = generateFileId(sourceId, file.relativePath);
      upsertFile.run(fileId, sourceId, file.relativePath, file.contentHash);
    }

    // Get current total chunk count for this source
    const currentChunkCount = db
      .prepare('SELECT COUNT(*) as count FROM chunks WHERE source_id = ?')
      .get(sourceId) as { count: number };

    // Update source record
    const newChunkCount = currentChunkCount.count + chunks.length;
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
    ).run(sourceId, sourcePath, totalFileCount, newChunkCount);

    // Insert new chunks
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
export {
  discoverFiles,
  computeContentHash,
  type DiscoveredFile,
  type DiscoveryResult,
} from './discovery.js';
export { chunkFiles, chunkFile, countTokens, type Chunk, type ChunkOptions } from './chunker.js';
export {
  embed,
  embedBatch,
  embedChunks,
  cosineSimilarity,
  EMBEDDING_DIM,
  type EmbeddedChunk,
} from './embeddings.js';
