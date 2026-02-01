/**
 * Main Selector Module
 *
 * Orchestrates the selection pipeline:
 * 1. Search for similar chunks
 * 2. Score and rank
 * 3. Fit to budget
 * 4. Format output
 */

import Database from 'better-sqlite3';
import { searchSimilar, type SearchOptions } from './search.js';
import { rankChunks } from './scoring.js';
import { fitToBudget, mergeAdjacentChunks } from './budget.js';
import { formatOutput, formatWithExplanation, type FormattedOutput } from './formatter.js';

/** Selection options */
export interface SelectOptions {
  /** Query to find context for */
  query: string;
  /** Maximum tokens to include */
  budget: number;
  /** Filter to specific sources */
  sources?: string[];
  /** Show scoring explanation */
  explain?: boolean;
}

/** Selection result */
export interface SelectResult {
  /** Formatted output */
  output: FormattedOutput;
  /** Whether index is empty */
  isEmpty: boolean;
}

/**
 * Select optimal context for a query
 */
export async function selectContext(
  db: Database.Database,
  options: SelectOptions
): Promise<SelectResult> {
  const startTime = Date.now();

  // Check if index has any chunks
  const countResult = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number };
  if (countResult.count === 0) {
    return {
      output: {
        text: '',
        data: {
          query: options.query,
          context: '',
          chunks: [],
          stats: {
            totalTokens: 0,
            chunksConsidered: 0,
            chunksIncluded: 0,
            filesIncluded: 0,
            timeMs: 0,
          },
        },
      },
      isEmpty: true,
    };
  }

  // Step 1: Search for similar chunks
  const searchOpts: SearchOptions = {
    limit: 50,
    sources: options.sources,
  };
  const similarChunks = await searchSimilar(db, options.query, searchOpts);

  // Step 2: Score and rank
  const rankedChunks = rankChunks(similarChunks, options.query);

  // Step 3: Fit to budget
  const budgetResult = fitToBudget(rankedChunks, options.budget);

  // Step 4: Merge adjacent chunks for cleaner output
  const mergedChunks = mergeAdjacentChunks(budgetResult.chunks);
  const mergedResult = {
    ...budgetResult,
    chunks: mergedChunks,
  };

  // Step 5: Format output
  const timeMs = Date.now() - startTime;
  const output = options.explain
    ? formatWithExplanation(options.query, mergedResult, similarChunks.length, timeMs)
    : formatOutput(options.query, mergedResult, similarChunks.length, timeMs);

  return {
    output,
    isEmpty: false,
  };
}

// Re-export types
export type { FormattedOutput, SelectionData, SelectionStats, ChunkInfo } from './formatter.js';
export type { ScoredChunk } from './search.js';
export type { RankedChunk } from './scoring.js';
