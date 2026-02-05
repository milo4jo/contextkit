/**
 * Import Scoring Integration Tests
 *
 * Tests for the import-based scoring boost and related files feature.
 */

import { describe, it, expect } from 'vitest';
import {
  rankChunks,
  buildImportGraph,
  getRelatedImports,
  type ImportGraph,
} from '../src/selector/scoring.js';
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

describe('buildImportGraph', () => {
  it('should build import graph from dependency map', () => {
    const dependencyMap = new Map([
      ['src/index.ts', ['src/utils.ts', 'src/config.ts']],
      ['src/utils.ts', ['src/helpers.ts']],
      ['src/config.ts', []],
      ['src/helpers.ts', []],
    ]);

    const graph = buildImportGraph(dependencyMap);

    // Check imports
    expect(graph.imports.get('src/index.ts')).toEqual(['src/utils.ts', 'src/config.ts']);
    expect(graph.imports.get('src/utils.ts')).toEqual(['src/helpers.ts']);
    expect(graph.imports.get('src/config.ts')).toEqual([]);

    // Check importedBy (reverse dependencies)
    expect(graph.importedBy.get('src/utils.ts')).toEqual(['src/index.ts']);
    expect(graph.importedBy.get('src/config.ts')).toEqual(['src/index.ts']);
    expect(graph.importedBy.get('src/helpers.ts')).toEqual(['src/utils.ts']);
  });

  it('should handle multiple importers', () => {
    const dependencyMap = new Map([
      ['src/a.ts', ['src/shared.ts']],
      ['src/b.ts', ['src/shared.ts']],
      ['src/c.ts', ['src/shared.ts']],
      ['src/shared.ts', []],
    ]);

    const graph = buildImportGraph(dependencyMap);

    expect(graph.importedBy.get('src/shared.ts')).toHaveLength(3);
    expect(graph.importedBy.get('src/shared.ts')).toContain('src/a.ts');
    expect(graph.importedBy.get('src/shared.ts')).toContain('src/b.ts');
    expect(graph.importedBy.get('src/shared.ts')).toContain('src/c.ts');
  });

  it('should handle empty dependency map', () => {
    const graph = buildImportGraph(new Map());

    expect(graph.imports.size).toBe(0);
    expect(graph.importedBy.size).toBe(0);
  });

  it('should handle circular dependencies', () => {
    const dependencyMap = new Map([
      ['src/a.ts', ['src/b.ts']],
      ['src/b.ts', ['src/a.ts']],
    ]);

    const graph = buildImportGraph(dependencyMap);

    expect(graph.imports.get('src/a.ts')).toEqual(['src/b.ts']);
    expect(graph.imports.get('src/b.ts')).toEqual(['src/a.ts']);
    expect(graph.importedBy.get('src/a.ts')).toEqual(['src/b.ts']);
    expect(graph.importedBy.get('src/b.ts')).toEqual(['src/a.ts']);
  });
});

describe('getRelatedImports', () => {
  const graph: ImportGraph = {
    imports: new Map([
      ['src/index.ts', ['src/utils.ts', 'src/config.ts']],
      ['src/utils.ts', ['src/helpers.ts']],
      ['src/config.ts', []],
      ['src/helpers.ts', ['src/constants.ts']],
      ['src/constants.ts', []],
    ]),
    importedBy: new Map([
      ['src/utils.ts', ['src/index.ts']],
      ['src/config.ts', ['src/index.ts']],
      ['src/helpers.ts', ['src/utils.ts']],
      ['src/constants.ts', ['src/helpers.ts']],
    ]),
  };

  it('should get direct imports (depth 1)', () => {
    const related = getRelatedImports(['src/index.ts'], graph);

    expect(related).toContain('src/utils.ts');
    expect(related).toContain('src/config.ts');
    expect(related).not.toContain('src/helpers.ts'); // depth 2
    expect(related).not.toContain('src/index.ts'); // already selected
  });

  it('should get imports at depth 2', () => {
    const related = getRelatedImports(['src/index.ts'], graph, { maxDepth: 2 });

    expect(related).toContain('src/utils.ts');
    expect(related).toContain('src/config.ts');
    expect(related).toContain('src/helpers.ts');
    expect(related).not.toContain('src/constants.ts'); // depth 3
  });

  it('should get all transitive imports', () => {
    const related = getRelatedImports(['src/index.ts'], graph, { maxDepth: 10 });

    expect(related).toContain('src/utils.ts');
    expect(related).toContain('src/config.ts');
    expect(related).toContain('src/helpers.ts');
    expect(related).toContain('src/constants.ts');
  });

  it('should handle multiple selected files', () => {
    const related = getRelatedImports(['src/index.ts', 'src/utils.ts'], graph);

    expect(related).toContain('src/config.ts');
    expect(related).toContain('src/helpers.ts');
    // utils.ts is already selected, so not in related
    expect(related).not.toContain('src/utils.ts');
  });

  it('should return empty array for files with no imports', () => {
    const related = getRelatedImports(['src/constants.ts'], graph);
    expect(related).toEqual([]);
  });

  it('should handle file not in graph', () => {
    const related = getRelatedImports(['src/nonexistent.ts'], graph);
    expect(related).toEqual([]);
  });

  it('should not include duplicates', () => {
    const graphWithShared: ImportGraph = {
      imports: new Map([
        ['src/a.ts', ['src/shared.ts']],
        ['src/b.ts', ['src/shared.ts']],
        ['src/shared.ts', []],
      ]),
      importedBy: new Map([
        ['src/shared.ts', ['src/a.ts', 'src/b.ts']],
      ]),
    };

    const related = getRelatedImports(['src/a.ts', 'src/b.ts'], graphWithShared);

    // shared.ts should only appear once
    const sharedCount = related.filter(f => f === 'src/shared.ts').length;
    expect(sharedCount).toBe(1);
  });
});

describe('rankChunks with import boost', () => {
  const importGraph: ImportGraph = {
    imports: new Map([
      ['src/main.ts', ['src/utils.ts', 'src/helpers.ts']],
      ['src/utils.ts', ['src/constants.ts']],
      ['src/helpers.ts', []],
      ['src/constants.ts', []],
      ['src/unrelated.ts', []],
    ]),
    importedBy: new Map([
      ['src/utils.ts', ['src/main.ts']],
      ['src/helpers.ts', ['src/main.ts']],
      ['src/constants.ts', ['src/utils.ts']],
    ]),
  };

  it('should boost files imported by high-scoring files', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/main.ts', 0.9),      // High score, imports utils & helpers
      createScoredChunk('src/utils.ts', 0.5),     // Imported by main, should get boost
      createScoredChunk('src/unrelated.ts', 0.5), // Same base similarity, no import relationship
    ];

    const ranked = rankChunks(chunks, 'test query', { importGraph });

    // utils.ts should rank higher than unrelated.ts due to import boost
    const utilsRank = ranked.findIndex(c => c.filePath === 'src/utils.ts');
    const unrelatedRank = ranked.findIndex(c => c.filePath === 'src/unrelated.ts');

    expect(utilsRank).toBeLessThan(unrelatedRank);

    // Check that utils has import boost
    const utilsChunk = ranked.find(c => c.filePath === 'src/utils.ts');
    expect(utilsChunk?.scoreBreakdown.importBoost).toBeGreaterThan(0);

    // Unrelated should have no import boost
    const unrelatedChunk = ranked.find(c => c.filePath === 'src/unrelated.ts');
    expect(unrelatedChunk?.scoreBreakdown.importBoost).toBe(0);
  });

  it('should work without import graph (backward compatible)', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/a.ts', 0.8),
      createScoredChunk('src/b.ts', 0.9),
    ];

    const ranked = rankChunks(chunks, 'test query');

    expect(ranked).toHaveLength(2);
    expect(ranked[0].filePath).toBe('src/b.ts');
    expect(ranked[0].scoreBreakdown.importBoost).toBe(0);
    expect(ranked[1].scoreBreakdown.importBoost).toBe(0);
  });

  it('should include importBoost in score breakdown', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/main.ts', 0.9),
      createScoredChunk('src/utils.ts', 0.7),
    ];

    const ranked = rankChunks(chunks, 'query', { importGraph });

    for (const chunk of ranked) {
      expect(chunk.scoreBreakdown).toHaveProperty('importBoost');
      expect(typeof chunk.scoreBreakdown.importBoost).toBe('number');
    }
  });

  it('should handle files imported by multiple top files', () => {
    const multiGraph: ImportGraph = {
      imports: new Map([
        ['src/a.ts', ['src/shared.ts']],
        ['src/b.ts', ['src/shared.ts']],
        ['src/shared.ts', []],
      ]),
      importedBy: new Map([
        ['src/shared.ts', ['src/a.ts', 'src/b.ts']],
      ]),
    };

    const chunks: ScoredChunk[] = [
      createScoredChunk('src/a.ts', 0.9),
      createScoredChunk('src/b.ts', 0.85),
      createScoredChunk('src/shared.ts', 0.5),
    ];

    const ranked = rankChunks(chunks, 'query', { importGraph: multiGraph });

    const sharedChunk = ranked.find(c => c.filePath === 'src/shared.ts');
    expect(sharedChunk?.scoreBreakdown.importBoost).toBeGreaterThan(0);
  });

  it('should not boost files that are not imported', () => {
    const chunks: ScoredChunk[] = [
      createScoredChunk('src/main.ts', 0.9),
      createScoredChunk('src/isolated.ts', 0.7), // Not in import graph
    ];

    const ranked = rankChunks(chunks, 'query', { importGraph });

    const isolatedChunk = ranked.find(c => c.filePath === 'src/isolated.ts');
    expect(isolatedChunk?.scoreBreakdown.importBoost).toBe(0);
  });
});

describe('import scoring edge cases', () => {
  it('should handle empty import graph', () => {
    const emptyGraph: ImportGraph = {
      imports: new Map(),
      importedBy: new Map(),
    };

    const chunks: ScoredChunk[] = [
      createScoredChunk('src/a.ts', 0.8),
      createScoredChunk('src/b.ts', 0.7),
    ];

    const ranked = rankChunks(chunks, 'query', { importGraph: emptyGraph });

    expect(ranked).toHaveLength(2);
    expect(ranked[0].filePath).toBe('src/a.ts');
  });

  it('should handle graph with self-imports', () => {
    const selfGraph: ImportGraph = {
      imports: new Map([
        ['src/circular.ts', ['src/circular.ts']],
      ]),
      importedBy: new Map([
        ['src/circular.ts', ['src/circular.ts']],
      ]),
    };

    const chunks: ScoredChunk[] = [
      createScoredChunk('src/circular.ts', 0.8),
    ];

    // Should not throw
    const ranked = rankChunks(chunks, 'query', { importGraph: selfGraph });
    expect(ranked).toHaveLength(1);
  });

  it('should respect chunk limit when calculating import boosts', () => {
    // Create many chunks to test that only top 20 are considered
    const chunks: ScoredChunk[] = [];
    for (let i = 0; i < 30; i++) {
      chunks.push(createScoredChunk(`src/file${i}.ts`, 0.5 + i * 0.01));
    }

    const graph: ImportGraph = {
      imports: new Map(chunks.map(c => [c.filePath, ['src/shared.ts']])),
      importedBy: new Map([['src/shared.ts', chunks.map(c => c.filePath)]]),
    };

    chunks.push(createScoredChunk('src/shared.ts', 0.3));

    const ranked = rankChunks(chunks, 'query', { importGraph: graph });

    // Should complete without issues
    expect(ranked.length).toBe(31);
  });
});
