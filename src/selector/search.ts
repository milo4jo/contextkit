/**
 * Similarity Search Module
 *
 * Finds chunks most similar to a query using cosine similarity.
 */

import Database from 'better-sqlite3';
import { embed, cosineSimilarity } from '../indexer/embeddings.js';
import { readEmbedding } from '../indexer/index.js';

/** Chunk from database with similarity score */
export interface ScoredChunk {
  id: string;
  sourceId: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  tokens: number;
  similarity: number;
}

/** Search options */
export interface SearchOptions {
  /** Maximum chunks to retrieve */
  limit?: number;
  /** Filter to specific sources */
  sources?: string[];
}

const DEFAULT_LIMIT = 50;

/**
 * Search for chunks similar to a query
 */
export async function searchSimilar(
  db: Database.Database,
  query: string,
  options: SearchOptions = {}
): Promise<ScoredChunk[]> {
  const limit = options.limit || DEFAULT_LIMIT;

  // Embed the query
  const queryEmbedding = await embed(query);

  // Build SQL query
  let sql = `
    SELECT id, source_id, file_path, content, start_line, end_line, tokens, embedding
    FROM chunks
  `;

  const params: string[] = [];

  if (options.sources && options.sources.length > 0) {
    const placeholders = options.sources.map(() => '?').join(', ');
    sql += ` WHERE source_id IN (${placeholders})`;
    params.push(...options.sources);
  }

  // Get all chunks (we'll sort in JS for cosine similarity)
  const rows = db.prepare(sql).all(...params) as Array<{
    id: string;
    source_id: string;
    file_path: string;
    content: string;
    start_line: number;
    end_line: number;
    tokens: number;
    embedding: Buffer;
  }>;

  // Calculate similarity for each chunk
  const scored: ScoredChunk[] = rows.map((row) => {
    const chunkEmbedding = readEmbedding(row.embedding);
    const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

    return {
      id: row.id,
      sourceId: row.source_id,
      filePath: row.file_path,
      content: row.content,
      startLine: row.start_line,
      endLine: row.end_line,
      tokens: row.tokens,
      similarity,
    };
  });

  // Sort by similarity descending and take top N
  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, limit);
}
