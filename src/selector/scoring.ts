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
  };
}

/** Scoring weights - tuned for code search */
const WEIGHTS = {
  similarity: 0.50,    // Semantic similarity is primary signal
  pathMatch: 0.15,     // Path contains query keywords
  contentMatch: 0.15,  // Content contains exact keywords
  symbolMatch: 0.15,   // Contains relevant function/class names
  fileTypeBoost: 0.05, // File type priority
};

/** Options for scoring */
export interface ScoringOptions {
  /** Apply diversity penalty (reduce score for many chunks from same file) */
  diversityPenalty?: boolean;
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

  // Score all chunks
  const ranked = chunks.map((chunk) => {
    // Semantic similarity (already 0-1)
    const similarityScore = chunk.similarity;

    // Path match bonus (query keywords in file path)
    const pathMatchScore = calculatePathMatch(chunk.filePath, queryKeywords);

    // Content keyword match (exact words in content)
    const contentMatchScore = calculateContentMatch(chunk.content, queryKeywords);

    // Code symbol match (function/class names)
    const symbolMatchScore = calculateSymbolMatch(chunk.content, querySymbols);

    // File type boost
    const fileTypeBoost = calculateFileTypeBoost(chunk.filePath);

    // Combined score
    const score =
      WEIGHTS.similarity * similarityScore +
      WEIGHTS.pathMatch * pathMatchScore +
      WEIGHTS.contentMatch * contentMatchScore +
      WEIGHTS.symbolMatch * symbolMatchScore +
      WEIGHTS.fileTypeBoost * fileTypeBoost;

    return {
      ...chunk,
      score,
      scoreBreakdown: {
        similarity: similarityScore,
        pathMatch: pathMatchScore,
        contentMatch: contentMatchScore,
        symbolMatch: symbolMatchScore,
        fileTypeBoost: fileTypeBoost,
      },
    };
  });

  // Sort by final score descending
  ranked.sort((a, b) => b.score - a.score);

  // Apply diversity penalty if enabled
  if (options.diversityPenalty) {
    return applyDiversityPenalty(ranked);
  }

  return ranked;
}

/**
 * Apply diversity penalty to avoid too many chunks from same file
 */
function applyDiversityPenalty(chunks: RankedChunk[]): RankedChunk[] {
  const fileChunkCount = new Map<string, number>();
  const PENALTY_PER_DUPLICATE = 0.1;
  const MAX_PENALTY = 0.3;

  return chunks.map((chunk) => {
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
  }).sort((a, b) => b.score - a.score);
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
  symbols.push(...matches.map(s => s.toLowerCase()));
  
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
    /function\s+(\w+)/gi,           // function declarations
    /const\s+(\w+)\s*=/gi,          // const assignments
    /class\s+(\w+)/gi,              // class declarations
    /export\s+(?:async\s+)?function\s+(\w+)/gi,  // exported functions
    /export\s+const\s+(\w+)/gi,     // exported consts
    /(\w+)\s*[:=]\s*(?:async\s+)?\(/gi,  // method/property functions
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
  if (pathLower.includes('.test.') || pathLower.includes('.spec.') || pathLower.includes('__tests__')) {
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
