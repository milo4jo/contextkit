/**
 * Call graph service
 */

import { QdrantClient } from '@qdrant/js-client-rest';

import type { Env } from '../types';

interface GraphOptions {
  orgId: string;
  projectId: string;
  symbol: string;
}

interface CallReference {
  name: string;
  file: string;
  line: number;
}

interface CallGraph {
  symbol: string;
  file: string | null;
  line: number | null;
  callers: CallReference[];
  callees: CallReference[];
}

/**
 * Get call graph for a symbol
 */
export async function getCallGraph(env: Env, options: GraphOptions): Promise<CallGraph> {
  const { orgId, projectId, symbol } = options;

  const qdrant = new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
  });

  const collectionName = `org_${orgId}`;

  // Find the symbol definition
  const definitionResults = await qdrant.scroll(collectionName, {
    filter: {
      must: [
        { key: 'project_id', match: { value: projectId } },
        { key: 'symbols', match: { value: symbol } },
      ],
    },
    limit: 1,
    with_payload: true,
  });

  let symbolFile: string | null = null;
  let symbolLine: number | null = null;

  if (definitionResults.points.length > 0) {
    const payload = definitionResults.points[0].payload as {
      file_path: string;
      start_line: number;
    };
    symbolFile = payload.file_path;
    symbolLine = payload.start_line;
  }

  // Find callers (chunks that contain calls to this symbol)
  const callerResults = await qdrant.scroll(collectionName, {
    filter: {
      must: [
        { key: 'project_id', match: { value: projectId } },
        { key: 'calls', match: { value: symbol } },
      ],
    },
    limit: 50,
    with_payload: true,
  });

  const callers: CallReference[] = callerResults.points
    .map((point) => {
      const payload = point.payload as {
        file_path: string;
        start_line: number;
        symbols?: string[];
      };

      // Get the first symbol in this chunk as the caller name
      const callerName = payload.symbols?.[0] ?? 'anonymous';

      return {
        name: callerName,
        file: payload.file_path,
        line: payload.start_line,
      };
    })
    .filter((ref) => ref.name !== symbol); // Don't include self

  // Find callees (what this symbol calls)
  const calleeResults = await qdrant.scroll(collectionName, {
    filter: {
      must: [
        { key: 'project_id', match: { value: projectId } },
        { key: 'symbols', match: { value: symbol } },
      ],
    },
    limit: 10,
    with_payload: true,
  });

  const callees: CallReference[] = [];

  for (const point of calleeResults.points) {
    const payload = point.payload as {
      file_path: string;
      start_line: number;
      calls?: string[];
    };

    if (payload.calls) {
      for (const callee of payload.calls) {
        if (callee !== symbol) {
          callees.push({
            name: callee,
            file: payload.file_path, // This is approximate
            line: 0, // Would need lookup for actual line
          });
        }
      }
    }
  }

  // Deduplicate callees
  const uniqueCallees = Array.from(new Map(callees.map((c) => [c.name, c])).values());

  return {
    symbol,
    file: symbolFile,
    line: symbolLine,
    callers,
    callees: uniqueCallees,
  };
}
