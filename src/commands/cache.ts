import { Command } from 'commander';
import { ensureInitialized } from '../config/index.js';
import { openDatabase, clearCache, getCacheStats } from '../db/index.js';
import { writeData, writeMessage, writeSuccess } from '../utils/streams.js';
import { getGlobalOpts } from '../utils/cli.js';

export const cacheCommand = new Command('cache')
  .description('Manage query cache');

cacheCommand
  .command('clear')
  .description('Clear all cached query results')
  .action(() => {
    ensureInitialized();

    const db = openDatabase();
    try {
      const cleared = clearCache(db);
      writeSuccess(`Cleared ${cleared} cached ${cleared === 1 ? 'entry' : 'entries'}`);
    } finally {
      db.close();
    }
  });

cacheCommand
  .command('stats')
  .description('Show cache statistics')
  .action(() => {
    ensureInitialized();

    const opts = getGlobalOpts(cacheCommand);
    const db = openDatabase();

    try {
      const stats = getCacheStats(db);

      if (opts.json) {
        writeData(JSON.stringify(stats, null, 2));
      } else {
        writeMessage('');
        writeMessage(`📊 Cache Statistics`);
        writeMessage(`   Entries:     ${stats.entryCount}`);
        writeMessage(`   Total hits:  ${stats.totalHits}`);
        if (stats.oldestEntry) {
          writeMessage(`   Oldest:      ${stats.oldestEntry}`);
          writeMessage(`   Newest:      ${stats.newestEntry}`);
        }
        writeMessage('');
      }
    } finally {
      db.close();
    }
  });
