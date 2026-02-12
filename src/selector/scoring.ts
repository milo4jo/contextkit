/**
 * Scoring Module
 *
 * Calculates final scores for chunks based on multiple signals.
 *
 * Multi-factor scoring:
 * - Semantic similarity (embeddings)
 * - Path relevance (query keywords in file path)
 * - Content keyword matching (exact word matches)
 * - Code symbol matching (function/class names)
 * - File type boost (implementation files > tests)
 */

import type { ScoredChunk } from './search.js';

/** Chunk with final score */
export interface RankedChunk extends ScoredChunk {
  /** Final combined score */
  score: number;
  /** Individual score components for --explain */
  scoreBreakdown: {
    similarity: number;
    pathMatch: number;
    contentMatch: number;
    symbolMatch: number;
    fileTypeBoost: number;
    importBoost: number;
  };
}

/** Scoring weights - tuned for code search */
const WEIGHTS = {
  similarity: 0.45, // Semantic similarity is primary signal
  pathMatch: 0.15, // Path contains query keywords
  contentMatch: 0.15, // Content contains exact keywords
  symbolMatch: 0.15, // Contains relevant function/class names
  fileTypeBoost: 0.05, // File type priority
  importBoost: 0.05, // File is imported by selected chunks
};

/** Import relationship data for scoring */
export interface ImportGraph {
  /** Map of file path -> files it imports */
  imports: Map<string, string[]>;
  /** Map of file path -> files that import it */
  importedBy: Map<string, string[]>;
}

/** Options for scoring */
export interface ScoringOptions {
  /** Apply diversity penalty (reduce score for many chunks from same file) */
  diversityPenalty?: boolean;
  /** Import relationships for boosting related files */
  importGraph?: ImportGraph;
}

/**
 * Calculate scores and rank chunks
 */
export function rankChunks(
  chunks: ScoredChunk[],
  query: string,
  options: ScoringOptions = {}
): RankedChunk[] {
  // Extract keywords and symbols from query
  const queryKeywords = extractKeywords(query);
  const querySymbols = extractSymbols(query);

  // First pass: score all chunks without import boost
  const initialScores = chunks.map((chunk) => {
    const similarityScore = chunk.similarity;
    const pathMatchScore = calculatePathMatch(chunk.filePath, queryKeywords);
    const contentMatchScore = calculateContentMatch(chunk.content, queryKeywords);
    const symbolMatchScore = calculateSymbolMatch(chunk.content, querySymbols);
    const fileTypeBoost = calculateFileTypeBoost(chunk.filePath);

    const baseScore =
      WEIGHTS.similarity * similarityScore +
      WEIGHTS.pathMatch * pathMatchScore +
      WEIGHTS.contentMatch * contentMatchScore +
      WEIGHTS.symbolMatch * symbolMatchScore +
      WEIGHTS.fileTypeBoost * fileTypeBoost;

    return {
      chunk,
      baseScore,
      similarityScore,
      pathMatchScore,
      contentMatchScore,
      symbolMatchScore,
      fileTypeBoost,
    };
  });

  // Sort by base score to find top files
  initialScores.sort((a, b) => b.baseScore - a.baseScore);

  // Calculate import boosts if import graph is provided
  const importBoosts = calculateImportBoosts(initialScores, options.importGraph);

  // Second pass: apply import boosts and create final ranked chunks
  const ranked = initialScores.map(
    ({
      chunk,
      baseScore,
      similarityScore,
      pathMatchScore,
      contentMatchScore,
      symbolMatchScore,
      fileTypeBoost,
    }) => {
      const importBoost = importBoosts.get(chunk.filePath) || 0;
      const score = baseScore + WEIGHTS.importBoost * importBoost;

      return {
        ...chunk,
        score,
        scoreBreakdown: {
          similarity: similarityScore,
          pathMatch: pathMatchScore,
          contentMatch: contentMatchScore,
          symbolMatch: symbolMatchScore,
          fileTypeBoost: fileTypeBoost,
          importBoost: importBoost,
        },
      };
    }
  );

  // Sort by final score descending
  ranked.sort((a, b) => b.score - a.score);

  // Apply diversity penalty if enabled
  if (options.diversityPenalty) {
    return applyDiversityPenalty(ranked);
  }

  return ranked;
}

/**
 * Calculate import boosts for files based on their relationship to top-scoring files
 *
 * If a top-scoring file imports another file, that file gets a boost.
 * Boost decays based on how far from top the importer is.
 */
function calculateImportBoosts(
  scoredChunks: Array<{ chunk: ScoredChunk; baseScore: number }>,
  importGraph?: ImportGraph
): Map<string, number> {
  const boosts = new Map<string, number>();

  if (!importGraph) {
    return boosts;
  }

  // Get unique files from top chunks (consider top 20 as "selected")
  const topFiles = new Set<string>();
  const fileScores = new Map<string, number>();

  for (const { chunk, baseScore } of scoredChunks.slice(0, 20)) {
    if (!topFiles.has(chunk.filePath)) {
      topFiles.add(chunk.filePath);
      fileScores.set(chunk.filePath, baseScore);
    }
  }

  // For each top file, boost its imports
  for (const filePath of topFiles) {
    const fileScore = fileScores.get(filePath) || 0;
    const imports = importGraph.imports.get(filePath) || [];

    for (const importedFile of imports) {
      // Boost proportional to the importer's score
      // Higher scoring importers give stronger boosts
      const boost = Math.min(fileScore, 1.0);
      const currentBoost = boosts.get(importedFile) || 0;
      // Take max boost if multiple files import the same file
      boosts.set(importedFile, Math.max(currentBoost, boost));
    }
  }

  return boosts;
}

/**
 * Apply diversity penalty to avoid too many chunks from same file
 */
function applyDiversityPenalty(chunks: RankedChunk[]): RankedChunk[] {
  const fileChunkCount = new Map<string, number>();
  const PENALTY_PER_DUPLICATE = 0.1;
  const MAX_PENALTY = 0.3;

  return chunks
    .map((chunk) => {
      const count = fileChunkCount.get(chunk.filePath) || 0;
      fileChunkCount.set(chunk.filePath, count + 1);

      if (count > 0) {
        const penalty = Math.min(count * PENALTY_PER_DUPLICATE, MAX_PENALTY);
        return {
          ...chunk,
          score: chunk.score * (1 - penalty),
        };
      }

      return chunk;
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Extract keywords from query for matching
 */
function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .filter((word) => !STOP_WORDS.has(word));
}

/**
 * Extract potential code symbols from query (camelCase, snake_case, etc.)
 */
function extractSymbols(query: string): string[] {
  const symbols: string[] = [];

  // Match camelCase, PascalCase, snake_case patterns
  const symbolPattern = /[a-zA-Z_][a-zA-Z0-9_]*(?:[A-Z][a-z0-9]*)+|[a-z]+(?:_[a-z0-9]+)+/g;
  const matches = query.match(symbolPattern) || [];
  symbols.push(...matches.map((s) => s.toLowerCase()));

  // Also include any word that looks like a function/variable name (>4 chars, no spaces)
  const words = query.split(/\s+/);
  for (const word of words) {
    if (word.length > 4 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(word)) {
      symbols.push(word.toLowerCase());
    }
  }

  return [...new Set(symbols)];
}

/**
 * Calculate path match score (0-1)
 */
function calculatePathMatch(filePath: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;

  const pathLower = filePath.toLowerCase();
  let matches = 0;

  for (const keyword of keywords) {
    if (pathLower.includes(keyword)) {
      matches++;
    }
  }

  return matches / keywords.length;
}

/**
 * Calculate content keyword match score (0-1)
 * Looks for exact keyword matches in content
 */
function calculateContentMatch(content: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;

  let matches = 0;
  let totalWeight = 0;

  for (const keyword of keywords) {
    // Count occurrences (capped at 5 for normalization)
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
    const occurrences = (content.match(regex) || []).length;

    if (occurrences > 0) {
      matches++;
      // Bonus for multiple occurrences (diminishing returns)
      totalWeight += Math.min(occurrences, 5) / 5;
    }
  }

  // Combine match ratio and occurrence weight
  const matchRatio = matches / keywords.length;
  const avgWeight = matches > 0 ? totalWeight / matches : 0;

  return matchRatio * 0.7 + avgWeight * 0.3;
}

/**
 * Calculate code symbol match score (0-1)
 * Looks for function names, class names, etc.
 */
function calculateSymbolMatch(content: string, symbols: string[]): number {
  if (symbols.length === 0) return 0;

  let matches = 0;

  // Common code patterns to look for
  const patterns = [
    /function\s+(\w+)/gi, // function declarations
    /const\s+(\w+)\s*=/gi, // const assignments
    /class\s+(\w+)/gi, // class declarations
    /export\s+(?:async\s+)?function\s+(\w+)/gi, // exported functions
    /export\s+const\s+(\w+)/gi, // exported consts
    /(\w+)\s*[:=]\s*(?:async\s+)?\(/gi, // method/property functions
  ];

  // Extract all symbols from content
  const contentSymbols = new Set<string>();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      contentSymbols.add(match[1].toLowerCase());
    }
  }

  // Check for matches
  for (const symbol of symbols) {
    if (contentSymbols.has(symbol)) {
      matches++;
    } else {
      // Partial match (symbol is substring of content symbol or vice versa)
      for (const contentSymbol of contentSymbols) {
        if (contentSymbol.includes(symbol) || symbol.includes(contentSymbol)) {
          matches += 0.5;
          break;
        }
      }
    }
  }

  return Math.min(matches / symbols.length, 1);
}

/**
 * Calculate file type boost (0-1)
 * Prioritizes implementation files over tests, configs, etc.
 */
function calculateFileTypeBoost(filePath: string): number {
  const pathLower = filePath.toLowerCase();

  // Test files - lower priority
  if (
    pathLower.includes('.test.') ||
    pathLower.includes('.spec.') ||
    pathLower.includes('__tests__')
  ) {
    return 0.3;
  }

  // Config/setup files - lower priority
  if (pathLower.includes('config') || pathLower.includes('setup') || pathLower.endsWith('.json')) {
    return 0.4;
  }

  // Type definition files
  if (pathLower.endsWith('.d.ts')) {
    return 0.5;
  }

  // Index/barrel files - medium priority
  if (pathLower.endsWith('/index.ts') || pathLower.endsWith('/index.js')) {
    return 0.6;
  }

  // Core implementation files - highest priority
  return 1.0;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Common words to ignore in matching */
const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'how',
  'what',
  'where',
  'when',
  'why',
  'who',
  'which',
  'does',
  'do',
  'did',
  'has',
  'have',
  'had',
  'this',
  'that',
  'these',
  'those',
  'and',
  'or',
  'but',
  'not',
  'with',
  'for',
  'from',
  'to',
  'in',
  'on',
  'work',
  'works',
  'working',
  'use',
  'using',
  'used',
  'can',
  'could',
  'would',
  'should',
  'will',
  'get',
  'set',
  'make',
  'find',
  'show',
  'tell',
  'want',
  'need',
  'code',
  'file',
  'function',
]);

/**
 * Build an import graph from a dependency map
 */
export function buildImportGraph(dependencyMap: Map<string, string[]>): ImportGraph {
  const imports = new Map<string, string[]>();
  const importedBy = new Map<string, string[]>();

  for (const [file, deps] of dependencyMap) {
    imports.set(file, deps);

    for (const dep of deps) {
      const existing = importedBy.get(dep) || [];
      if (!existing.includes(file)) {
        existing.push(file);
      }
      importedBy.set(dep, existing);
    }
  }

  return { imports, importedBy };
}

/**
 * Get files that should be included based on imports from selected files
 */
export function getRelatedImports(
  selectedFiles: string[],
  importGraph: ImportGraph,
  options: { maxDepth?: number } = {}
): string[] {
  const maxDepth = options.maxDepth ?? 1;
  const related = new Set<string>();
  const visited = new Set<string>(selectedFiles);

  let currentLevel = selectedFiles;

  for (let depth = 0; depth < maxDepth; depth++) {
    const nextLevel: string[] = [];

    for (const file of currentLevel) {
      const imports = importGraph.imports.get(file) || [];

      for (const importedFile of imports) {
        if (!visited.has(importedFile)) {
          visited.add(importedFile);
          related.add(importedFile);
          nextLevel.push(importedFile);
        }
      }
    }

    currentLevel = nextLevel;
    if (currentLevel.length === 0) break;
  }

  return Array.from(related);
}
