/**
 * Scoring Tests
 *
 * Tests for the chunk ranking functionality.
 */

import { describe, it, expect } from 'vitest';
import { rankChunks, type RankedChunk } from '../src/selector/scoring.js';
import type { ScoredChunk } from '../src/selector/search.js';

// Helper to create mock scored chunks
function createScoredChunk(
  filePath: string,
  similarity: number,
  content: string = 'test content'
): ScoredChunk {
  return {
    id: `chunk_${Math.random().toString(36).slice(2)}`,
    sourceId: 'test-source',
    filePath,
    content,
    startLine: 1,
    endLine: 10,
    tokens: 100,
    similarity,
  };
}

describe('rankChunks', () => {
  it('should rank chunks by combined score', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/low.ts', 0.5),
      createScoredChunk('src/high.ts', 0.9),
      createScoredChunk('src/medium.ts', 0.7),
    ];

    const ranked = rankChunks(chunks, 'test query');

    // Should be ordered by score descending
    expect(ranked[0].filePath).toBe('src/high.ts');
    expect(ranked[1].filePath).toBe('src/medium.ts');
    expect(ranked[2].filePath).toBe('src/low.ts');
  });

  it('should include score breakdown', () => {
    const chunks: ScoredChunk[] = [createScoredChunk('src/test.ts', 0.8)];

    const ranked = rankChunks(chunks, 'test query');

    expect(ranked[0].scoreBreakdown).toBeDefined();
    expect(ranked[0].scoreBreakdown.similarity).toBe(0.8);
    expect(ranked[0].scoreBreakdown.recency).toBeDefined();
    expect(ranked[0].scoreBreakdown.pathMatch).toBeDefined();
  });

  it('should boost chunks with path matching query keywords', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/utils/random.ts', 0.8),
      createScoredChunk('src/auth/middleware.ts', 0.8), // "auth" matches query
    ];

    const ranked = rankChunks(chunks, 'how does auth work');

    // auth/middleware should rank higher due to path match
    expect(ranked[0].filePath).toBe('src/auth/middleware.ts');
    expect(ranked[0].scoreBreakdown.pathMatch).toBeGreaterThan(0);
    expect(ranked[1].scoreBreakdown.pathMatch).toBe(0);
  });

  it('should handle empty chunks array', () => {
    const ranked = rankChunks([], 'test query');
    expect(ranked).toEqual([]);
  });

  it('should handle single chunk', () => {
    const chunks: ScoredChunk[] = [createScoredChunk('src/test.ts', 0.5)];

    const ranked = rankChunks(chunks, 'test');

    expect(ranked).toHaveLength(1);
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  it('should ignore stop words in path matching', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/the-thing.ts', 0.8),
      createScoredChunk('src/database.ts', 0.8),
    ];

    // "the" is a stop word and should be ignored
    const ranked = rankChunks(chunks, 'the database');

    // database.ts should rank higher because "database" matches
    expect(ranked[0].filePath).toBe('src/database.ts');
  });

  it('should calculate final score correctly', () => {
    // With similarity=1.0, recency=0.5, pathMatch=0
    // Score = 0.6*1.0 + 0.2*0.5 + 0.2*0 = 0.7
    const chunks: ScoredChunk[] = [createScoredChunk('src/random.ts', 1.0)];

    const ranked = rankChunks(chunks, 'unrelated query');

    expect(ranked[0].score).toBeCloseTo(0.7, 1);
  });

  it('should boost multiple keyword matches', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/auth/jwt.ts', 0.7), // matches "auth" and "jwt"
      createScoredChunk('src/auth/basic.ts', 0.7), // matches only "auth"
    ];

    const ranked = rankChunks(chunks, 'auth jwt tokens');

    // jwt.ts should rank higher with more keyword matches
    expect(ranked[0].filePath).toBe('src/auth/jwt.ts');
    expect(ranked[0].scoreBreakdown.pathMatch).toBeGreaterThan(
      ranked[1].scoreBreakdown.pathMatch
    );
  });

  it('should handle chunks with same similarity differently based on path', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/utils/helpers.ts', 0.75),
      createScoredChunk('src/database/query.ts', 0.75),
    ];

    const ranked = rankChunks(chunks, 'database query');

    // database/query.ts should rank higher
    expect(ranked[0].filePath).toBe('src/database/query.ts');
  });

  it('should preserve chunk properties in ranked output', () => {
    const originalChunk = createScoredChunk('src/test.ts', 0.8);
    originalChunk.content = 'const x = 1;';
    originalChunk.startLine = 5;
    originalChunk.endLine = 15;
    originalChunk.tokens = 50;

    const ranked = rankChunks([originalChunk], 'test');

    expect(ranked[0].content).toBe('const x = 1;');
    expect(ranked[0].startLine).toBe(5);
    expect(ranked[0].endLine).toBe(15);
    expect(ranked[0].tokens).toBe(50);
    expect(ranked[0].similarity).toBe(0.8);
  });
});

describe('path matching edge cases', () => {
  it('should be case-insensitive', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/Auth/Middleware.ts', 0.8),
      createScoredChunk('src/utils/random.ts', 0.8),
    ];

    const ranked = rankChunks(chunks, 'auth middleware');

    expect(ranked[0].filePath).toBe('src/Auth/Middleware.ts');
  });

  it('should match partial path segments', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/authentication.ts', 0.8),
      createScoredChunk('src/random.ts', 0.8),
    ];

    const ranked = rankChunks(chunks, 'auth');

    // "authentication" contains "auth"
    expect(ranked[0].filePath).toBe('src/authentication.ts');
  });

  it('should handle query with only stop words', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/test.ts', 0.8),
      createScoredChunk('src/other.ts', 0.9),
    ];

    // All stop words
    const ranked = rankChunks(chunks, 'the a an is are');

    // Should fall back to similarity-based ranking
    expect(ranked[0].filePath).toBe('src/other.ts');
    expect(ranked[0].scoreBreakdown.pathMatch).toBe(0);
  });

  it('should handle deeply nested paths', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/features/auth/middleware/jwt.ts', 0.8),
      createScoredChunk('src/utils/random.ts', 0.8),
    ];

    const ranked = rankChunks(chunks, 'auth jwt');

    expect(ranked[0].filePath).toBe('src/features/auth/middleware/jwt.ts');
  });
});
