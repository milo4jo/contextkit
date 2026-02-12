/**
 * Database Client
 *
 * Turso/libSQL connection
 */

import { createClient } from '@libsql/client/web';

let dbInstance: ReturnType<typeof createClient> | null = null;

export function getDb(url: string, authToken: string) {
  if (!dbInstance) {
    dbInstance = createClient({
      url,
      authToken,
    });
  }
  return dbInstance;
}
