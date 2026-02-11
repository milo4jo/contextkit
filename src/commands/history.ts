import { Command } from 'commander';
import { ensureInitialized } from '../config/index.js';
import { openDatabase, closeDatabase, getQueryHistory, getHistoryEntry, clearHistory } from '../db/index.js';
import { writeData, writeMessage, writeSuccess, writeWarning } from '../utils/streams.js';
import { formatDim } from '../utils/format.js';

/**
 * Format a date string for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Truncate a string to a max length with ellipsis
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export const historyCommand = new Command('history')
  .description('View and re-run past queries')
  .option('-n, --limit <count>', 'Number of entries to show', '20')
  .option('--run <id>', 'Re-run a specific query by ID')
  .option('--clear', 'Clear all history')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    ensureInitialized();
    const db = openDatabase();

    try {
      // Handle clear
      if (options.clear) {
        const count = clearHistory(db);
        writeSuccess(`Cleared ${count} history entries.`);
        return;
      }

      // Handle re-run
      if (options.run) {
        const id = parseInt(options.run, 10);
        if (isNaN(id)) {
          writeWarning('Invalid ID. Use a number.');
          return;
        }

        const entry = getHistoryEntry(db, id);
        if (!entry) {
          writeWarning(`No history entry with ID ${id}.`);
          return;
        }

        // Output the query parameters so user can re-run
        writeMessage('\n📜 Query #' + entry.id);
        writeMessage('');
        writeMessage(`Query:   ${entry.query}`);
        writeMessage(`Budget:  ${entry.budget} tokens`);
        writeMessage(`Format:  ${entry.format}`);
        writeMessage(`Mode:    ${entry.mode}`);
        if (entry.sources) {
          writeMessage(`Sources: ${entry.sources}`);
        }
        writeMessage('');
        writeMessage(formatDim('To re-run this query:'));
        
        // Build command
        let cmd = `contextkit select "${entry.query}" -b ${entry.budget} -f ${entry.format} -m ${entry.mode}`;
        if (entry.sources) {
          cmd += ` -s ${entry.sources}`;
        }
        writeMessage(`  ${cmd}`);
        writeMessage('');
        return;
      }

      // Show history list
      const limit = parseInt(options.limit, 10) || 20;
      const history = getQueryHistory(db, limit);

      if (history.length === 0) {
        writeMessage('\n📜 No query history yet.');
        writeMessage(formatDim('Run some queries with `contextkit select` first.'));
        return;
      }

      if (options.json) {
        writeData(JSON.stringify(history, null, 2));
        return;
      }

      writeMessage('\n📜 Query History\n');
      
      for (const entry of history) {
        const timeStr = formatDate(entry.createdAt);
        const queryStr = truncate(entry.query, 50);
        const statsStr = entry.tokensUsed 
          ? `${entry.chunksFound} chunks, ${entry.tokensUsed} tokens`
          : '';
        
        writeMessage(`  ${formatDim('#' + entry.id.toString().padStart(3))}  ${queryStr}`);
        writeMessage(`       ${formatDim(timeStr)} ${formatDim(statsStr)}`);
        writeMessage('');
      }

      writeMessage(formatDim(`Use \`contextkit history --run <id>\` to see full details.`));
      writeMessage(formatDim(`Use \`contextkit history --clear\` to clear history.`));
      writeMessage('');
    } finally {
      closeDatabase(db);
    }
  });
