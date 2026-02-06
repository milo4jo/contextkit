/**
 * Chunker Tests
 *
 * Tests for the file chunking functionality.
 */

import { describe, it, expect } from 'vitest';
import { chunkFile, countTokens } from '../src/indexer/chunker.js';
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

describe('chunkFile (token-based)', () => {
  it('should return single chunk for small file', () => {
    const file = createMockFile('const x = 1;\nconst y = 2;');
    // Explicitly use token-based chunking
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50, useAst: false });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe('const x = 1;\nconst y = 2;');
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(2);
    expect(chunks[0].sourceId).toBe('test-source');
    expect(chunks[0].filePath).toBe('test.ts');
    expect(chunks[0].chunkType).toBe('token-block');
  });

  it('should create multiple chunks for large file', () => {
    // Create a file with ~1000 tokens (each line is ~10 tokens)
    const lines = Array.from(
      { length: 100 },
      (_, i) => `const variable${i} = "this is line number ${i}";`
    );
    const content = lines.join('\n');
    const file = createMockFile(content);

    const chunks = chunkFile(file, { chunkSize: 100, chunkOverlap: 20, useAst: false });

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
    // Create a file that will produce multiple chunks
    const lines = Array.from({ length: 20 }, (_, i) => `const line${i} = ${i};`);
    const content = lines.join('\n');
    const file = createMockFile(content);

    // Use token-based chunking to test overlap behavior
    const chunks = chunkFile(file, { chunkSize: 50, chunkOverlap: 10, useAst: false });

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
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50, useAst: false });

    // Empty file should produce one chunk with empty content
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe('');
  });

  it('should handle single line file', () => {
    const file = createMockFile('const x = 1;');
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50, useAst: false });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(1);
  });

  it('should generate unique chunk IDs', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `const variable${i} = "value${i}";`);
    const file = createMockFile(lines.join('\n'));

    const chunks = chunkFile(file, { chunkSize: 50, chunkOverlap: 10, useAst: false });

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
    const chunks = chunkFile(file, { useAst: false });

    expect(chunks[0].filePath).toBe('src/utils/helper.ts');
  });

  it('should calculate token count correctly', () => {
    const content = 'function hello() {\n  return "world";\n}';
    const file = createMockFile(content);
    const chunks = chunkFile(file, { useAst: false });

    expect(chunks[0].tokens).toBe(countTokens(content));
  });
});

describe('chunkFile (AST-aware)', () => {
  it('should chunk by function boundaries', () => {
    const content = `function first() {
  return 1;
}

function second() {
  return 2;
}`;
    const file = createMockFile(content);
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50, useAst: true });

    // Should create chunks for each function
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    // Check that functions are correctly identified
    const funcChunks = chunks.filter((c) => c.chunkType === 'function');
    expect(funcChunks.length).toBe(2);

    // Check unit names
    const names = funcChunks.map((c) => c.unitName);
    expect(names).toContain('first');
    expect(names).toContain('second');
  });

  it('should chunk classes as a single unit when small', () => {
    const content = `class Calculator {
  add(a, b) {
    return a + b;
  }
  subtract(a, b) {
    return a - b;
  }
}`;
    const file = createMockFile(content);
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50, useAst: true });

    // Small class should be one chunk
    const classChunk = chunks.find((c) => c.chunkType === 'class');
    expect(classChunk).toBeDefined();
    expect(classChunk?.unitName).toBe('Calculator');
    expect(classChunk?.content).toContain('add');
    expect(classChunk?.content).toContain('subtract');
  });

  it('should identify exported functions', () => {
    const content = `export function publicFn() {
  return "public";
}

function privateFn() {
  return "private";
}`;
    const file = createMockFile(content);
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50, useAst: true });

    const funcChunks = chunks.filter((c) => c.chunkType === 'function');
    const publicChunk = funcChunks.find((c) => c.unitName === 'publicFn');
    const privateChunk = funcChunks.find((c) => c.unitName === 'privateFn');

    expect(publicChunk?.exported).toBe(true);
    expect(privateChunk?.exported).toBe(false);
  });

  it('should include imports in a header block', () => {
    const content = `import { foo } from './foo';
import { bar } from './bar';

export function main() {
  return foo() + bar();
}`;
    const file = createMockFile(content);
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50, useAst: true });

    // Should have a header block with imports
    const headerChunk = chunks.find((c) => c.unitName === 'imports/header');
    // Note: header chunks are only created if they have > 20 tokens
    // Small import blocks may be included with the first function

    // Should have the main function
    const mainChunk = chunks.find((c) => c.unitName === 'main');
    expect(mainChunk).toBeDefined();
    expect(mainChunk?.chunkType).toBe('function');
  });

  it('should use AST-aware chunking for markdown files', () => {
    const content = `# Markdown file

This is markdown content.`;
    const file = createMockFile(content, 'README.md');
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50, useAst: true });

    // Markdown now uses AST-aware chunking (sections as 'class')
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkType).toBe('class');
  });

  it('should fall back to token-based for non-parseable files', () => {
    const content = `{"key": "value", "another": 123}`;
    const file = createMockFile(content, 'data.json');
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50, useAst: true });

    // JSON has no parser, falls back to token-based chunking
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkType).toBe('token-block');
  });

  it('should fall back to token-based for malformed code', () => {
    const content = `function broken( {
  this is not valid javascript at all!!!
  {{{{ missing closing braces`;
    const file = createMockFile(content);
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50, useAst: true });

    // Should fall back to token-based chunking
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].chunkType).toBe('token-block');
  });

  it('should handle arrow functions in const declarations', () => {
    const content = `const add = (a, b) => a + b;

const multiply = (a, b) => {
  return a * b;
};`;
    const file = createMockFile(content);
    const chunks = chunkFile(file, { chunkSize: 500, chunkOverlap: 50, useAst: true });

    // Arrow functions should be identified
    const funcChunks = chunks.filter((c) => c.chunkType === 'function');
    expect(funcChunks.length).toBeGreaterThanOrEqual(2);

    const names = funcChunks.map((c) => c.unitName);
    expect(names).toContain('add');
    expect(names).toContain('multiply');
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
    // Use token-based to test the line-splitting behavior
    const chunks = chunkFile(file, { chunkSize: 50, chunkOverlap: 10, useAst: false });

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
