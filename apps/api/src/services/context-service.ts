/**
 * Context selection service
 *
 * Core logic for selecting relevant code context
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

import type { Env, Chunk } from '../types';

interface SelectOptions {
  orgId: string;
  projectId: string;
  query: string;
  budget: number;
  includeImports: boolean;
  mode: 'full' | 'map';
  format: 'markdown' | 'xml' | 'json' | 'plain';
  sources?: string[];
}

interface SelectResult {
  context: string;
  chunks: Chunk[];
  tokensUsed: number;
  filesIncluded: number;
  cacheHit: boolean;
}

/**
 * Select relevant context for a query
 */
export async function selectContext(env: Env, options: SelectOptions): Promise<SelectResult> {
  const { orgId, projectId, query, budget, mode, format } = options;

  // Check cache first
  const cacheKey = `context:${projectId}:${hashQuery(query, options)}`;
  const cached = await env.CACHE.get(cacheKey);

  if (cached) {
    const result = JSON.parse(cached) as SelectResult;
    result.cacheHit = true;
    return result;
  }

  // Generate query embedding
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Search Qdrant
  const qdrant = new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
  });

  const collectionName = `org_${orgId}`;

  // Build filter
  const filter: Record<string, unknown> = {
    must: [{ key: 'project_id', match: { value: projectId } }],
  };

  if (options.sources && options.sources.length > 0) {
    // TODO: Add source path filter
  }

  const searchResult = await qdrant.search(collectionName, {
    vector: queryEmbedding,
    filter,
    limit: 50, // Get more candidates for scoring
    with_payload: true,
  });

  // Process results and apply budget
  const chunks: Chunk[] = [];
  let tokensUsed = 0;
  const filesIncluded = new Set<string>();

  for (const point of searchResult) {
    const payload = point.payload as {
      file_path: string;
      start_line: number;
      end_line: number;
      content: string;
      symbols?: string[];
    };

    // Estimate tokens (rough approximation: 4 chars = 1 token)
    const chunkTokens = Math.ceil(payload.content.length / 4);

    if (tokensUsed + chunkTokens > budget) {
      break;
    }

    chunks.push({
      file: payload.file_path,
      start_line: payload.start_line,
      end_line: payload.end_line,
      content: mode === 'map' ? extractSignature(payload.content) : payload.content,
      score: point.score ?? 0,
      symbols: payload.symbols,
    });

    tokensUsed += chunkTokens;
    filesIncluded.add(payload.file_path);
  }

  // Format output
  const context = formatContext(chunks, format);

  const result: SelectResult = {
    context,
    chunks,
    tokensUsed,
    filesIncluded: filesIncluded.size,
    cacheHit: false,
  };

  // Cache result for 1 hour
  await env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 3600 });

  return result;
}

/**
 * Hash query and options for cache key
 */
function hashQuery(query: string, options: SelectOptions): string {
  const key = `${query}:${options.budget}:${options.mode}:${options.format}`;
  // Simple hash for cache key
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extract function/class signature from code
 */
function extractSignature(content: string): string {
  // Simple signature extraction - in production, use AST
  const lines = content.split('\n');
  const signatures: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.match(/^(export\s+)?(async\s+)?function\s+\w+/) ||
      trimmed.match(/^(export\s+)?(abstract\s+)?class\s+\w+/) ||
      trimmed.match(/^(export\s+)?interface\s+\w+/) ||
      trimmed.match(/^(export\s+)?type\s+\w+/) ||
      trimmed.match(/^\w+\s*\([^)]*\)\s*[:{]/)
    ) {
      signatures.push(trimmed);
    }
  }

  return signatures.join('\n');
}

/**
 * Format chunks into output string
 */
function formatContext(chunks: Chunk[], format: 'markdown' | 'xml' | 'json' | 'plain'): string {
  switch (format) {
    case 'markdown':
      return chunks
        .map(
          (c) =>
            `## ${c.file} (lines ${c.start_line}-${c.end_line})\n\n\`\`\`\n${c.content}\n\`\`\``
        )
        .join('\n\n');

    case 'xml':
      return chunks
        .map(
          (c) =>
            `<file path="${c.file}" lines="${c.start_line}-${c.end_line}">\n${c.content}\n</file>`
        )
        .join('\n\n');

    case 'json':
      return JSON.stringify(chunks, null, 2);

    case 'plain':
    default:
      return chunks
        .map((c) => `// ${c.file}:${c.start_line}-${c.end_line}\n${c.content}`)
        .join('\n\n');
  }
}
