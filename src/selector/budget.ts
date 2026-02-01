/**
 * Budget Fitting Module
 *
 * Selects chunks to fit within a token budget.
 * Prefers keeping chunks from the same file together.
 */

import type { RankedChunk } from './scoring.js';

/** Selection result */
export interface BudgetResult {
  /** Selected chunks */
  chunks: RankedChunk[];
  /** Total tokens used */
  totalTokens: number;
  /** Chunks that didn't fit */
  excluded: number;
}

/**
 * Select chunks that fit within budget
 */
export function fitToBudget(chunks: RankedChunk[], budget: number): BudgetResult {
  const selected: RankedChunk[] = [];
  let totalTokens = 0;
  let excluded = 0;

  // Track which files we've started including
  const includedFiles = new Set<string>();

  for (const chunk of chunks) {
    const wouldExceed = totalTokens + chunk.tokens > budget;

    if (wouldExceed) {
      excluded++;
      continue;
    }

    // Bonus: if we've already included chunks from this file,
    // slightly prefer including more from the same file
    // (This is handled implicitly by processing in score order,
    // but we could add explicit grouping here later)

    selected.push(chunk);
    totalTokens += chunk.tokens;
    includedFiles.add(chunk.filePath);
  }

  // Re-sort selected chunks by file, then by line number for output
  selected.sort((a, b) => {
    const fileCompare = a.filePath.localeCompare(b.filePath);
    if (fileCompare !== 0) return fileCompare;
    return a.startLine - b.startLine;
  });

  return {
    chunks: selected,
    totalTokens,
    excluded,
  };
}

/**
 * Merge adjacent chunks from the same file
 * (Optional optimization for cleaner output)
 */
export function mergeAdjacentChunks(chunks: RankedChunk[]): RankedChunk[] {
  if (chunks.length <= 1) return chunks;

  const merged: RankedChunk[] = [];
  let current = { ...chunks[0] };

  for (let i = 1; i < chunks.length; i++) {
    const next = chunks[i];

    // Check if adjacent (same file, consecutive lines)
    const isAdjacent = current.filePath === next.filePath && current.endLine + 1 >= next.startLine;

    if (isAdjacent) {
      // Merge chunks
      current = {
        ...current,
        content: current.content + '\n' + next.content,
        endLine: next.endLine,
        tokens: current.tokens + next.tokens,
        score: Math.max(current.score, next.score),
        similarity: Math.max(current.similarity, next.similarity),
      };
    } else {
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}
