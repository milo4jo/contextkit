/**
 * Main Selector Module
 *
 * Orchestrates the selection pipeline:
 * 1. Search for similar chunks
 * 2. Score and rank (with optional import boosting)
 * 3. Fit to budget
 * 4. Format output
 */

import Database from 'better-sqlite3';
import { searchSimilar, type SearchOptions } from './search.js';
import { rankChunks, buildImportGraph, getRelatedImports, type ImportGraph } from './scoring.js';
import { fitToBudget, mergeAdjacentChunks } from './budget.js';
import { formatInFormat, type FormattedOutput, type OutputFormat } from './formatter.js';
import { parseImportsWithResolution, isJsTsFile } from '../retrieval/imports.js';

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
  /** Output format */
  format?: OutputFormat;
  /** Include imported files in selection */
  includeImports?: boolean;
  /** Base path for resolving imports */
  basePath?: string;
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

  // Step 2: Build import graph if needed
  let importGraph: ImportGraph | undefined;
  if (options.includeImports) {
    importGraph = buildImportGraphFromChunks(db, options.basePath || process.cwd());
  }

  // Step 3: Score and rank (with import boost if graph provided)
  const rankedChunks = rankChunks(similarChunks, options.query, { importGraph });

  // Step 4: Fit to budget
  let budgetResult = fitToBudget(rankedChunks, options.budget);

  // Step 5: Include related imports if requested
  if (options.includeImports && importGraph) {
    const selectedFiles = [...new Set(budgetResult.chunks.map(c => c.filePath))];
    const relatedFiles = getRelatedImports(selectedFiles, importGraph);

    // Find chunks from related files that aren't already included
    const includedFiles = new Set(budgetResult.chunks.map(c => c.filePath));
    const relatedChunks = similarChunks.filter(
      c => relatedFiles.includes(c.filePath) && !includedFiles.has(c.filePath)
    );

    if (relatedChunks.length > 0) {
      // Score and add related chunks with remaining budget
      const relatedRanked = rankChunks(relatedChunks, options.query, { importGraph });
      const remainingBudget = options.budget - budgetResult.totalTokens;

      if (remainingBudget > 0) {
        const relatedBudget = fitToBudget(relatedRanked, remainingBudget);
        budgetResult = {
          chunks: [...budgetResult.chunks, ...relatedBudget.chunks],
          totalTokens: budgetResult.totalTokens + relatedBudget.totalTokens,
          excluded: budgetResult.excluded + relatedBudget.excluded,
        };
      }
    }
  }

  // Step 6: Merge adjacent chunks for cleaner output
  const mergedChunks = mergeAdjacentChunks(budgetResult.chunks);
  const mergedResult = {
    ...budgetResult,
    chunks: mergedChunks,
  };

  // Step 7: Format output
  const timeMs = Date.now() - startTime;
  const format = options.format || 'markdown';
  const output = formatInFormat(
    format,
    options.query,
    mergedResult,
    similarChunks.length,
    timeMs,
    options.explain
  );

  return {
    output,
    isEmpty: false,
  };
}

/**
 * Build import graph from all indexed chunks
 */
function buildImportGraphFromChunks(
  db: Database.Database,
  basePath: string
): ImportGraph {
  // Get all unique files and their content
  const rows = db.prepare(`
    SELECT DISTINCT file_path, content
    FROM chunks
    ORDER BY file_path, start_line
  `).all() as Array<{ file_path: string; content: string }>;

  // Group content by file (combine chunks)
  const fileContents = new Map<string, string>();
  for (const row of rows) {
    const existing = fileContents.get(row.file_path) || '';
    fileContents.set(row.file_path, existing + row.content);
  }

  // Parse imports for each JS/TS file
  const dependencyMap = new Map<string, string[]>();

  for (const [filePath, content] of fileContents) {
    if (!isJsTsFile(filePath)) {
      dependencyMap.set(filePath, []);
      continue;
    }

    const { relatedFiles } = parseImportsWithResolution(content, filePath, basePath);
    dependencyMap.set(filePath, relatedFiles);
  }

  return buildImportGraph(dependencyMap);
}

// Re-export types
export type { FormattedOutput, SelectionData, SelectionStats, ChunkInfo, OutputFormat } from './formatter.js';
export type { ScoredChunk } from './search.js';
export type { RankedChunk, ImportGraph, ScoringOptions } from './scoring.js';
export { buildImportGraph, getRelatedImports } from './scoring.js';
