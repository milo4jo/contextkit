/**
 * Symbol search service
 */

import { QdrantClient } from '@qdrant/js-client-rest';

import type { Env } from '../types';

interface SearchOptions {
  orgId: string;
  projectId: string;
  query: string;
  exact: boolean;
  limit: number;
}

interface Symbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable';
  file: string;
  line: number;
  signature: string;
}

/**
 * Search for symbols by name
 */
export async function searchSymbols(env: Env, options: SearchOptions): Promise<Symbol[]> {
  const { orgId, projectId, query, exact, limit } = options;

  const qdrant = new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
  });

  const collectionName = `org_${orgId}`;

  // Search by symbol name in payload
  // Using scroll with filter for exact/fuzzy matching
  const results = await qdrant.scroll(collectionName, {
    filter: {
      must: [
        { key: 'project_id', match: { value: projectId } },
        ...(exact
          ? [{ key: 'symbols', match: { value: query } }]
          : [{ key: 'symbols', match: { text: query } }]),
      ],
    },
    limit,
    with_payload: true,
  });

  const symbols: Symbol[] = [];

  for (const point of results.points) {
    const payload = point.payload as {
      file_path: string;
      start_line: number;
      content: string;
      symbols?: string[];
      symbol_kinds?: Record<string, string>;
    };

    // Extract matching symbols
    const matchingSymbols =
      payload.symbols?.filter((s) =>
        exact ? s === query : s.toLowerCase().includes(query.toLowerCase())
      ) ?? [];

    for (const name of matchingSymbols) {
      const kind = (payload.symbol_kinds?.[name] as Symbol['kind']) ?? 'function';

      symbols.push({
        name,
        kind,
        file: payload.file_path,
        line: payload.start_line,
        signature: extractSymbolSignature(payload.content, name),
      });
    }
  }

  return symbols.slice(0, limit);
}

/**
 * Extract signature for a specific symbol from content
 */
function extractSymbolSignature(content: string, symbolName: string): string {
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(symbolName)) {
      // Return the line and possibly next few lines for full signature
      const signatureLines = [line];

      // If line ends with { or has unbalanced parentheses, include more
      if (line.includes('(') && !line.includes(')')) {
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          signatureLines.push(lines[j]);
          if (lines[j].includes(')')) break;
        }
      }

      return signatureLines.join('\n').trim();
    }
  }

  return symbolName;
}
