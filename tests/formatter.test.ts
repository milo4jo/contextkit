/**
 * Formatter Tests
 *
 * Tests for output formatting functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  formatOutput,
  formatWithExplanation,
  formatAsXml,
  formatAsPlain,
  formatInFormat,
} from '../src/selector/formatter.js';
import type { RankedChunk } from '../src/selector/scoring.js';
import type { BudgetResult } from '../src/selector/budget.js';

// Helper to create mock ranked chunks
function createRankedChunk(
  filePath: string,
  content: string,
  tokens: number = 100,
  startLine: number = 1,
  endLine: number = 10,
  score: number = 0.8
): RankedChunk {
  return {
    id: `chunk_${Math.random().toString(36).slice(2)}`,
    sourceId: 'test-source',
    filePath,
    content,
    startLine,
    endLine,
    tokens,
    similarity: score - 0.1,
    score,
    scoreBreakdown: {
      similarity: score - 0.1,
      pathMatch: 0.2,
      contentMatch: 0.1,
      symbolMatch: 0.05,
      fileTypeBoost: 1.0,
    },
  };
}

// Helper to create budget result
function createBudgetResult(chunks: RankedChunk[]): BudgetResult {
  return {
    chunks,
    totalTokens: chunks.reduce((sum, c) => sum + c.tokens, 0),
    excluded: 0,
  };
}

describe('formatOutput', () => {
  it('should format single chunk correctly', () => {
    const chunk = createRankedChunk('src/test.ts', 'const x = 1;', 50, 1, 5);
    const result = createBudgetResult([chunk]);

    const output = formatOutput('test query', result, 1, 100);

    expect(output.text).toContain('## src/test.ts (lines 1-5)');
    expect(output.text).toContain('```typescript');
    expect(output.text).toContain('const x = 1;');
    expect(output.text).toContain('```');
    expect(output.text).toContain('📊');
    expect(output.text).toContain('50 tokens');
    expect(output.text).toContain('1 chunks');
    expect(output.text).toContain('1 files');
  });

  it('should format multiple chunks from same file', () => {
    const chunks = [
      createRankedChunk('src/test.ts', 'const x = 1;', 50, 1, 5),
      createRankedChunk('src/test.ts', 'const y = 2;', 50, 10, 15),
    ];
    const result = createBudgetResult(chunks);

    const output = formatOutput('test query', result, 2, 100);

    // Should show both chunks
    expect(output.text).toContain('lines 1-5');
    expect(output.text).toContain('lines 10-15');
    expect(output.text).toContain('100 tokens');
    expect(output.text).toContain('2 chunks');
    expect(output.text).toContain('1 files');
  });

  it('should format chunks from multiple files', () => {
    const chunks = [
      createRankedChunk('src/a.ts', 'code a'),
      createRankedChunk('src/b.ts', 'code b'),
    ];
    const result = createBudgetResult(chunks);

    const output = formatOutput('test query', result, 2, 100);

    expect(output.text).toContain('src/a.ts');
    expect(output.text).toContain('src/b.ts');
    expect(output.text).toContain('2 files');
  });

  it('should detect TypeScript language', () => {
    const chunk = createRankedChunk('src/test.ts', 'const x = 1;');
    const output = formatOutput('query', createBudgetResult([chunk]), 1, 100);

    expect(output.text).toContain('```typescript');
  });

  it('should detect JavaScript language', () => {
    const chunk = createRankedChunk('src/test.js', 'const x = 1;');
    const output = formatOutput('query', createBudgetResult([chunk]), 1, 100);

    expect(output.text).toContain('```javascript');
  });

  it('should detect Python language', () => {
    const chunk = createRankedChunk('src/test.py', 'x = 1');
    const output = formatOutput('query', createBudgetResult([chunk]), 1, 100);

    expect(output.text).toContain('```python');
  });

  it('should detect TSX language', () => {
    const chunk = createRankedChunk('src/Component.tsx', '<div />');
    const output = formatOutput('query', createBudgetResult([chunk]), 1, 100);

    expect(output.text).toContain('```tsx');
  });

  it('should handle unknown file extension', () => {
    const chunk = createRankedChunk('src/test.xyz', 'content');
    const output = formatOutput('query', createBudgetResult([chunk]), 1, 100);

    // Should still have code block, just without language
    expect(output.text).toContain('```\n');
  });

  it('should return structured data', () => {
    const chunk = createRankedChunk('src/test.ts', 'const x = 1;', 50, 1, 5, 0.85);
    const result = createBudgetResult([chunk]);

    const output = formatOutput('my query', result, 10, 250);

    expect(output.data.query).toBe('my query');
    expect(output.data.chunks).toHaveLength(1);
    expect(output.data.chunks[0].file).toBe('src/test.ts');
    expect(output.data.chunks[0].lines).toEqual([1, 5]);
    expect(output.data.chunks[0].tokens).toBe(50);
    expect(output.data.chunks[0].score).toBeCloseTo(0.85, 2);
    expect(output.data.stats.totalTokens).toBe(50);
    expect(output.data.stats.chunksConsidered).toBe(10);
    expect(output.data.stats.chunksIncluded).toBe(1);
    expect(output.data.stats.filesIncluded).toBe(1);
    expect(output.data.stats.timeMs).toBe(250);
  });

  it('should handle empty result', () => {
    const result = createBudgetResult([]);

    const output = formatOutput('query', result, 0, 50);

    expect(output.text).toContain('0 tokens');
    expect(output.text).toContain('0 chunks');
    expect(output.data.chunks).toHaveLength(0);
  });

  it('should include context in data', () => {
    const chunk = createRankedChunk('src/test.ts', 'const x = 1;');
    const result = createBudgetResult([chunk]);

    const output = formatOutput('query', result, 1, 100);

    expect(output.data.context).toContain('const x = 1;');
    expect(output.data.context).toContain('src/test.ts');
  });
});

describe('formatWithExplanation', () => {
  it('should include scoring details', () => {
    const chunk = createRankedChunk('src/test.ts', 'const x = 1;', 50, 1, 5, 0.8);
    const result = createBudgetResult([chunk]);

    const output = formatWithExplanation('query', result, 1, 100);

    expect(output.text).toContain('## Scoring Details');
    expect(output.text).toContain('similarity:');
    expect(output.text).toContain('path_match:');
    expect(output.text).toContain('content_match:');
    expect(output.text).toContain('symbol_match:');
    expect(output.text).toContain('file_type:');
    expect(output.text).toContain('→ score:');
  });

  it('should show percentages', () => {
    const chunk = createRankedChunk('src/test.ts', 'code', 50, 1, 5, 0.85);
    chunk.scoreBreakdown = {
      similarity: 0.75,
      pathMatch: 0.25,
      contentMatch: 0.3,
      symbolMatch: 0.1,
      fileTypeBoost: 1.0,
    };
    const result = createBudgetResult([chunk]);

    const output = formatWithExplanation('query', result, 1, 100);

    expect(output.text).toContain('75.0%'); // similarity
    expect(output.text).toContain('25.0%'); // pathMatch
    expect(output.text).toContain('30.0%'); // contentMatch
    expect(output.text).toContain('100.0%'); // fileTypeBoost
  });

  it('should include file and line info in explanation', () => {
    const chunk = createRankedChunk('src/auth/jwt.ts', 'code', 50, 10, 20);
    const result = createBudgetResult([chunk]);

    const output = formatWithExplanation('query', result, 1, 100);

    expect(output.text).toContain('src/auth/jwt.ts:10');
  });

  it('should still include all regular output', () => {
    const chunk = createRankedChunk('src/test.ts', 'const x = 1;');
    const result = createBudgetResult([chunk]);

    const output = formatWithExplanation('query', result, 1, 100);

    // Should have regular output too
    expect(output.text).toContain('## src/test.ts');
    expect(output.text).toContain('```typescript');
    expect(output.text).toContain('📊');
  });
});

describe('formatAsXml', () => {
  it('should produce valid XML structure', () => {
    const chunk = createRankedChunk('src/test.ts', 'const x = 1;', 50, 1, 5);
    const result = createBudgetResult([chunk]);

    const output = formatAsXml('test query', result, 1, 100);

    expect(output.text).toContain('<context>');
    expect(output.text).toContain('</context>');
    expect(output.text).toContain('<query>test query</query>');
    expect(output.text).toContain('<files>');
    expect(output.text).toContain('</files>');
  });

  it('should include file paths as attributes', () => {
    const chunk = createRankedChunk('src/auth/jwt.ts', 'code');
    const result = createBudgetResult([chunk]);

    const output = formatAsXml('query', result, 1, 100);

    expect(output.text).toContain('<file path="src/auth/jwt.ts">');
  });

  it('should include chunk metadata', () => {
    const chunk = createRankedChunk('src/test.ts', 'code', 150, 10, 25);
    const result = createBudgetResult([chunk]);

    const output = formatAsXml('query', result, 1, 100);

    expect(output.text).toContain('lines="10-25"');
    expect(output.text).toContain('tokens="150"');
  });

  it('should wrap content in CDATA', () => {
    const chunk = createRankedChunk('src/test.ts', 'const x = "<test>"');
    const result = createBudgetResult([chunk]);

    const output = formatAsXml('query', result, 1, 100);

    expect(output.text).toContain('<![CDATA[const x = "<test>"]]>');
  });

  it('should include stats element', () => {
    const chunks = [
      createRankedChunk('src/a.ts', 'code a', 50),
      createRankedChunk('src/b.ts', 'code b', 75),
    ];
    const result = createBudgetResult(chunks);

    const output = formatAsXml('query', result, 5, 200);

    expect(output.text).toContain('<stats');
    expect(output.text).toContain('tokens="125"');
    expect(output.text).toContain('chunks="2"');
    expect(output.text).toContain('files="2"');
    expect(output.text).toContain('time_ms="200"');
  });

  it('should escape XML special characters in query', () => {
    const chunk = createRankedChunk('src/test.ts', 'code');
    const result = createBudgetResult([chunk]);

    const output = formatAsXml('query with <special> & "chars"', result, 1, 100);

    expect(output.text).toContain('&lt;special&gt;');
    expect(output.text).toContain('&amp;');
    expect(output.text).toContain('&quot;chars&quot;');
  });
});

describe('formatAsPlain', () => {
  it('should produce plain text without markdown', () => {
    const chunk = createRankedChunk('src/test.ts', 'const x = 1;', 50, 1, 5);
    const result = createBudgetResult([chunk]);

    const output = formatAsPlain('test query', result, 1, 100);

    // Should NOT have markdown formatting
    expect(output.text).not.toContain('```');
    expect(output.text).not.toContain('##');
    expect(output.text).not.toContain('📊');

    // Should have plain format
    expect(output.text).toContain('// src/test.ts (lines 1-5)');
    expect(output.text).toContain('const x = 1;');
  });

  it('should format multiple chunks cleanly', () => {
    const chunks = [
      createRankedChunk('src/a.ts', 'code a', 50, 1, 10),
      createRankedChunk('src/b.ts', 'code b', 50, 1, 5),
    ];
    const result = createBudgetResult(chunks);

    const output = formatAsPlain('query', result, 2, 100);

    expect(output.text).toContain('// src/a.ts');
    expect(output.text).toContain('// src/b.ts');
    expect(output.text).toContain('code a');
    expect(output.text).toContain('code b');
  });

  it('should return proper structured data', () => {
    const chunk = createRankedChunk('src/test.ts', 'code', 50, 1, 5, 0.9);
    const result = createBudgetResult([chunk]);

    const output = formatAsPlain('query', result, 10, 150);

    expect(output.data.chunks).toHaveLength(1);
    expect(output.data.stats.totalTokens).toBe(50);
    expect(output.data.stats.timeMs).toBe(150);
  });
});

describe('formatInFormat', () => {
  const chunk = createRankedChunk('src/test.ts', 'const x = 1;', 50, 1, 5);
  const result = createBudgetResult([chunk]);

  it('should format as markdown by default', () => {
    const output = formatInFormat('markdown', 'query', result, 1, 100);

    expect(output.text).toContain('```typescript');
    expect(output.text).toContain('## src/test.ts');
  });

  it('should format as xml', () => {
    const output = formatInFormat('xml', 'query', result, 1, 100);

    expect(output.text).toContain('<context>');
    expect(output.text).toContain('<file path="src/test.ts">');
  });

  it('should format as json', () => {
    const output = formatInFormat('json', 'query', result, 1, 100);

    const parsed = JSON.parse(output.text);
    expect(parsed.query).toBe('query');
    expect(parsed.chunks).toHaveLength(1);
    expect(parsed.stats).toBeDefined();
  });

  it('should format as plain', () => {
    const output = formatInFormat('plain', 'query', result, 1, 100);

    expect(output.text).toContain('// src/test.ts');
    expect(output.text).not.toContain('```');
  });

  it('should include explanation for markdown when explain is true', () => {
    const output = formatInFormat('markdown', 'query', result, 1, 100, true);

    expect(output.text).toContain('## Scoring Details');
    expect(output.text).toContain('similarity:');
  });

  it('should not include explanation for non-markdown formats', () => {
    const xmlOutput = formatInFormat('xml', 'query', result, 1, 100, true);
    const plainOutput = formatInFormat('plain', 'query', result, 1, 100, true);

    // Explanation is only for markdown
    expect(xmlOutput.text).not.toContain('Scoring Details');
    expect(plainOutput.text).not.toContain('Scoring Details');
  });
});
