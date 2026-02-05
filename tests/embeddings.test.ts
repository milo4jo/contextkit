/**
 * Embeddings Module Tests
 *
 * Tests for pure functions in the embeddings module.
 * Note: embed() and embedBatch() are not tested here as they require
 * loading the ML model which is slow and resource-intensive.
 */

import { describe, it, expect } from 'vitest';
import { cosineSimilarity, EMBEDDING_DIM } from '../src/indexer/embeddings.js';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const vec = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('returns -1 for opposite vectors', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it('handles normalized vectors correctly', () => {
    // Two normalized vectors at 60 degrees = cos(60°) = 0.5
    const a = [1, 0];
    const b = [0.5, Math.sqrt(3) / 2];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.5, 5);
  });

  it('is scale-invariant', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    const aScaled = a.map(x => x * 10);
    const bScaled = b.map(x => x * 0.1);

    const sim1 = cosineSimilarity(a, b);
    const sim2 = cosineSimilarity(aScaled, bScaled);

    expect(sim1).toBeCloseTo(sim2, 5);
  });

  it('is symmetric', () => {
    const a = [1, 2, 3, 4];
    const b = [5, 6, 7, 8];

    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 5);
  });

  it('handles zero vectors', () => {
    const zero = [0, 0, 0];
    const nonZero = [1, 2, 3];

    expect(cosineSimilarity(zero, nonZero)).toBe(0);
    expect(cosineSimilarity(zero, zero)).toBe(0);
  });

  it('throws for vectors of different lengths', () => {
    const a = [1, 2, 3];
    const b = [1, 2];

    expect(() => cosineSimilarity(a, b)).toThrow('Vectors must have the same length');
  });

  it('works with high-dimensional vectors (embedding dimension)', () => {
    // Simulate embedding vectors
    const a = Array.from({ length: EMBEDDING_DIM }, () => Math.random() - 0.5);
    const b = Array.from({ length: EMBEDDING_DIM }, () => Math.random() - 0.5);

    const similarity = cosineSimilarity(a, b);

    // Random vectors should have similarity between -1 and 1
    expect(similarity).toBeGreaterThanOrEqual(-1);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  it('handles edge case with very small values', () => {
    const a = [1e-10, 2e-10, 3e-10];
    const b = [1e-10, 2e-10, 3e-10];

    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });
});

describe('EMBEDDING_DIM', () => {
  it('is 384 for gte-small model', () => {
    expect(EMBEDDING_DIM).toBe(384);
  });
});
