/**
 * Embeddings Module
 *
 * Generates embeddings using local models via @xenova/transformers.
 * Uses gte-small (384 dimensions) by default.
 */

import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';
import type { Chunk } from './chunker.js';

/** Default embedding model */
const DEFAULT_MODEL = 'Xenova/gte-small';

/** Embedding dimension for gte-small */
export const EMBEDDING_DIM = 384;

/** Batch size for embedding generation */
const BATCH_SIZE = 32;

/** Chunk with embedding */
export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

/** Progress callback */
export type ProgressCallback = (current: number, total: number) => void;

// Singleton pipeline instance
let embeddingPipeline: FeatureExtractionPipeline | null = null;

/**
 * Initialize the embedding pipeline
 */
async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', DEFAULT_MODEL, {
      quantized: true, // Use quantized model for speed
    });
  }
  return embeddingPipeline;
}

/**
 * Generate embedding for a single text
 */
export async function embed(text: string): Promise<number[]> {
  const pipe = await getEmbeddingPipeline();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

/**
 * Generate embeddings for multiple texts in batches
 */
export async function embedBatch(
  texts: string[],
  onProgress?: ProgressCallback
): Promise<number[][]> {
  const pipe = await getEmbeddingPipeline();
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    // Process batch
    const outputs = await Promise.all(
      batch.map(async (text) => {
        const output = await pipe(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data as Float32Array);
      })
    );

    embeddings.push(...outputs);

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, texts.length), texts.length);
    }
  }

  return embeddings;
}

/**
 * Generate embeddings for chunks
 */
export async function embedChunks(
  chunks: Chunk[],
  onProgress?: ProgressCallback
): Promise<EmbeddedChunk[]> {
  const texts = chunks.map((c) => c.content);
  const embeddings = await embedBatch(texts, onProgress);

  return chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}
