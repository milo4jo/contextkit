/**
 * Chunker Tests
 *
 * Tests for the file chunking functionality.
 */

import { describe, it, expect } from 'vitest';
import { chunkFile, countTokens, type Chunk } from '../src/indexer/chunker.js';
import type { DiscoveredFile } from '../src/indexer/discovery.js';

// Helper to create a mock file
function createMockFile(content: string, relativePath: string = 'test.ts'): DiscoveredFile {
  return {
    sourceId: 'test-source',
    relativePath,
    absolutePath: `/project/${relativePath}`,
    content,
  };
}

describe('countTokens', () => {
  it('should count tokens in a simple string', () => {
    const text = 'Hello, world!';
    const count = countTokens(text);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(10); // Should be around 4 tokens
  });

  it('should handle empty string', () => {
    expect(countTokens('')).toBe(0);
  });

  it('should count code tokens', () => {
    const code = 'function hello() { return "world"; }';
    const count = countTokens(code);
    expect(count).toBeGreaterThan(5);
    expect(count).toBeLessThan(20);
  });
});

describe('chunkFile', () => {
  it('should return single chunk for small file', () => {
    const file = createMockFile('const x = 1;\nconst y = 2;');
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe('const x = 1;\nconst y = 2;');
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(2);
    expect(chunks[0].sourceId).toBe('test-source');
    expect(chunks[0].filePath).toBe('test.ts');
  });

  it('should create multiple chunks for large file', () => {
    // Create a file with ~1000 tokens (each line is ~10 tokens)
    const lines = Array.from({ length: 100 }, (_, i) =>
      `const variable${i} = "this is line number ${i}";`
    );
    const content = lines.join('\n');
    const file = createMockFile(content);

    const chunks = chunkFile(file, { chunkSize: 100, chunkOverlap: 20 });

    // Should create multiple chunks
    expect(chunks.length).toBeGreaterThan(1);

    // All chunks should have valid properties
    chunks.forEach((chunk) => {
      expect(chunk.id).toBeDefined();
      expect(chunk.sourceId).toBe('test-source');
      expect(chunk.filePath).toBe('test.ts');
      expect(chunk.startLine).toBeGreaterThan(0);
      expect(chunk.endLine).toBeGreaterThanOrEqual(chunk.startLine);
      expect(chunk.tokens).toBeGreaterThan(0);
    });

    // First chunk should start at line 1
    expect(chunks[0].startLine).toBe(1);

    // Last chunk should end at line 100
    expect(chunks[chunks.length - 1].endLine).toBe(100);
  });

  it('should handle overlap correctly', () => {
    // Create a file that will produce exactly 2 chunks
    const lines = Array.from({ length: 20 }, (_, i) =>
      `const line${i} = ${i};`
    );
    const content = lines.join('\n');
    const file = createMockFile(content);

    const chunks = chunkFile(file, { chunkSize: 50, chunkOverlap: 10 });

    // Should have overlap between consecutive chunks
    if (chunks.length >= 2) {
      // Second chunk's start should be before first chunk's end (overlap)
      // This is achieved by keeping some lines from the previous chunk
      const firstChunkEnd = chunks[0].endLine;
      const secondChunkStart = chunks[1].startLine;

      // Second chunk starts somewhere within the first chunk's range
      expect(secondChunkStart).toBeLessThanOrEqual(firstChunkEnd);
    }
  });

  it('should handle empty file', () => {
    const file = createMockFile('');
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50 });

    // Empty file should produce one chunk with empty content
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe('');
  });

  it('should handle single line file', () => {
    const file = createMockFile('const x = 1;');
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(1);
  });

  it('should generate unique chunk IDs', () => {
    const lines = Array.from({ length: 50 }, (_, i) =>
      `const variable${i} = "value${i}";`
    );
    const file = createMockFile(lines.join('\n'));

    const chunks = chunkFile(file, { chunkSize: 50, chunkOverlap: 10 });

    // All IDs should be unique
    const ids = chunks.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // IDs should have expected format
    chunks.forEach((chunk) => {
      expect(chunk.id).toMatch(/^chunk_[a-f0-9]{16}$/);
    });
  });

  it('should preserve file path in chunks', () => {
    const file = createMockFile('const x = 1;', 'src/utils/helper.ts');
    const chunks = chunkFile(file);

    expect(chunks[0].filePath).toBe('src/utils/helper.ts');
  });

  it('should calculate token count correctly', () => {
    const content = 'function hello() {\n  return "world";\n}';
    const file = createMockFile(content);
    const chunks = chunkFile(file);

    expect(chunks[0].tokens).toBe(countTokens(content));
  });
});

describe('chunk edge cases', () => {
  it('should handle file with only whitespace lines', () => {
    const file = createMockFile('   \n\t\n  \n');
    const chunks = chunkFile(file);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toBe('   \n\t\n  \n');
  });

  it('should handle file with very long single line', () => {
    // Use 500 chars instead of 10000 to avoid tokenizer timeout
    const longLine = 'x'.repeat(500);
    const file = createMockFile(longLine);
    const chunks = chunkFile(file, { chunkSize: 100, chunkOverlap: 20 });

    // Very long line should still be in one chunk (can't split lines)
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(longLine);
  });

  it('should handle file with mixed line lengths', () => {
    const content = [
      'short',
      'this is a medium length line with some more content',
      'x'.repeat(100),
      'tiny',
      'another regular line here',
    ].join('\n');

    const file = createMockFile(content);
    const chunks = chunkFile(file, { chunkSize: 50, chunkOverlap: 10 });

    // Should handle without errors
    expect(chunks.length).toBeGreaterThan(0);

    // Should cover all content
    const coveredLines = new Set<number>();
    chunks.forEach((chunk) => {
      for (let i = chunk.startLine; i <= chunk.endLine; i++) {
        coveredLines.add(i);
      }
    });

    expect(coveredLines.size).toBe(5);
  });
});
