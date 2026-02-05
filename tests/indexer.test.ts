/**
 * Indexer Module Tests
 *
 * Tests for the indexer utility functions.
 */

import { describe, it, expect } from 'vitest';
import { readEmbedding, EMBEDDING_DIM } from '../src/indexer/index.js';

describe('readEmbedding', () => {
  it('reads a simple embedding from buffer', () => {
    const original = [1.0, 2.0, 3.0, 4.0];
    const buffer = Buffer.from(new Float32Array(original).buffer);

    const result = readEmbedding(buffer);

    expect(result).toHaveLength(4);
    expect(result[0]).toBeCloseTo(1.0, 5);
    expect(result[1]).toBeCloseTo(2.0, 5);
    expect(result[2]).toBeCloseTo(3.0, 5);
    expect(result[3]).toBeCloseTo(4.0, 5);
  });

  it('reads embedding with correct dimension', () => {
    const original = Array.from({ length: EMBEDDING_DIM }, (_, i) => i * 0.001);
    const buffer = Buffer.from(new Float32Array(original).buffer);

    const result = readEmbedding(buffer);

    expect(result).toHaveLength(EMBEDDING_DIM);
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      expect(result[i]).toBeCloseTo(original[i], 5);
    }
  });

  it('handles negative values', () => {
    const original = [-1.5, -0.5, 0.0, 0.5, 1.5];
    const buffer = Buffer.from(new Float32Array(original).buffer);

    const result = readEmbedding(buffer);

    expect(result).toHaveLength(5);
    expect(result[0]).toBeCloseTo(-1.5, 5);
    expect(result[1]).toBeCloseTo(-0.5, 5);
    expect(result[2]).toBeCloseTo(0.0, 5);
    expect(result[3]).toBeCloseTo(0.5, 5);
    expect(result[4]).toBeCloseTo(1.5, 5);
  });

  it('handles very small values', () => {
    const original = [1e-10, 1e-20, 1e-30];
    const buffer = Buffer.from(new Float32Array(original).buffer);

    const result = readEmbedding(buffer);

    expect(result).toHaveLength(3);
    // Float32 has limited precision for very small numbers
    expect(result[0]).toBeCloseTo(1e-10, 15);
  });

  it('handles empty buffer', () => {
    const buffer = Buffer.from(new Float32Array([]).buffer);

    const result = readEmbedding(buffer);

    expect(result).toHaveLength(0);
  });

  it('preserves precision for normalized embeddings', () => {
    // Normalized embeddings typically have values between -1 and 1
    const original = [0.123456, -0.654321, 0.111111, -0.999999];
    const buffer = Buffer.from(new Float32Array(original).buffer);

    const result = readEmbedding(buffer);

    expect(result).toHaveLength(4);
    // Float32 precision is about 7 decimal digits
    expect(result[0]).toBeCloseTo(0.123456, 5);
    expect(result[1]).toBeCloseTo(-0.654321, 5);
    expect(result[2]).toBeCloseTo(0.111111, 5);
    expect(result[3]).toBeCloseTo(-0.999999, 5);
  });

  it('roundtrips embedding correctly', () => {
    // Simulate the full roundtrip: array -> buffer -> array
    const original = Array.from({ length: 10 }, () => Math.random() * 2 - 1);

    // Write to buffer (like storeChunks does)
    const buffer = Buffer.from(new Float32Array(original).buffer);

    // Read from buffer (like search does)
    const result = readEmbedding(buffer);

    expect(result).toHaveLength(original.length);
    for (let i = 0; i < original.length; i++) {
      // Float32 introduces some rounding, so we use lower precision
      expect(result[i]).toBeCloseTo(original[i], 5);
    }
  });
});

describe('indexer exports', () => {
  it('exports all expected functions and types', async () => {
    const indexer = await import('../src/indexer/index.js');

    // Functions
    expect(typeof indexer.readEmbedding).toBe('function');
    expect(typeof indexer.discoverFiles).toBe('function');
    expect(typeof indexer.chunkFiles).toBe('function');
    expect(typeof indexer.chunkFile).toBe('function');
    expect(typeof indexer.countTokens).toBe('function');
    expect(typeof indexer.embed).toBe('function');
    expect(typeof indexer.embedBatch).toBe('function');
    expect(typeof indexer.embedChunks).toBe('function');
    expect(typeof indexer.cosineSimilarity).toBe('function');
    expect(typeof indexer.indexSources).toBe('function');

    // Constants
    expect(indexer.EMBEDDING_DIM).toBe(384);
  });
});
