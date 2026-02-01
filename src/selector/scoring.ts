/**
 * Scoring Module
 *
 * Calculates final scores for chunks based on multiple signals.
 *
 * Score = 0.6 × semantic_similarity
 *       + 0.2 × recency_bonus
 *       + 0.2 × path_match_bonus
 */

import type { ScoredChunk } from './search.js';

/** Chunk with final score */
export interface RankedChunk extends ScoredChunk {
  /** Final combined score */
  score: number;
  /** Individual score components for --explain */
  scoreBreakdown: {
    similarity: number;
    recency: number;
    pathMatch: number;
  };
}

/** Scoring weights */
const WEIGHTS = {
  similarity: 0.6,
  recency: 0.2,
  pathMatch: 0.2,
};

/**
 * Calculate scores and rank chunks
 */
export function rankChunks(chunks: ScoredChunk[], query: string): RankedChunk[] {
  // Extract keywords from query for path matching
  const queryKeywords = extractKeywords(query);

  // Find max/min for normalization (recency not used yet since we don't track it)
  const ranked = chunks.map((chunk) => {
    // Semantic similarity (already 0-1)
    const similarityScore = chunk.similarity;

    // Recency bonus (placeholder - would use indexed_at if we tracked per-chunk)
    // For now, give all chunks equal recency
    const recencyScore = 0.5;

    // Path match bonus
    const pathMatchScore = calculatePathMatch(chunk.filePath, queryKeywords);

    // Combined score
    const score =
      WEIGHTS.similarity * similarityScore +
      WEIGHTS.recency * recencyScore +
      WEIGHTS.pathMatch * pathMatchScore;

    return {
      ...chunk,
      score,
      scoreBreakdown: {
        similarity: similarityScore,
        recency: recencyScore,
        pathMatch: pathMatchScore,
      },
    };
  });

  // Sort by final score descending
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}

/**
 * Extract keywords from query for path matching
 */
function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .filter((word) => !STOP_WORDS.has(word));
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

/** Common words to ignore in path matching */
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
]);
