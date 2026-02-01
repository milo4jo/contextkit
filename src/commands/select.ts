import { Command } from 'commander';
import { ensureInitialized } from '../config/index.js';
import { openDatabase } from '../db/index.js';
import { selectContext } from '../selector/index.js';
import { writeData, writeMessage, writeWarning } from '../utils/streams.js';
import { formatCommand, formatDim } from '../utils/format.js';
import { getGlobalOpts } from '../utils/cli.js';
import { InvalidUsageError } from '../errors/index.js';

export const selectCommand = new Command('select')
  .description('Select context for a query')
  .argument('<query>', 'The query to find context for')
  .option('-b, --budget <tokens>', 'Maximum tokens to include', '8000')
  .option('-f, --format <format>', 'Output format: text, json', 'text')
  .option('-s, --sources <sources>', 'Filter sources (comma-separated)')
  .option('--explain', 'Show scoring details')
  .action(async (query: string, options) => {
    ensureInitialized();

    const opts = getGlobalOpts(selectCommand);
    const budget = parseInt(options.budget, 10);

    if (isNaN(budget) || budget <= 0) {
      throw new InvalidUsageError('Budget must be a positive number.');
    }

    // Parse sources filter
    const sources = options.sources
      ? options.sources.split(',').map((s: string) => s.trim())
      : undefined;

    // Open database
    const db = openDatabase();

    try {
      // Run selection
      const result = await selectContext(db, {
        query,
        budget,
        sources,
        explain: options.explain,
      });

      // Handle empty index
      if (result.isEmpty) {
        writeWarning('No indexed content found');
        writeMessage(`Run ${formatCommand('contextkit index')} first.`);
        return;
      }

      // Handle no results
      if (result.output.data.chunks.length === 0) {
        writeMessage('');
        writeMessage(formatDim('No relevant context found for this query.'));
        writeMessage(formatDim('Try a different query or add more sources.'));
        writeMessage('');
        return;
      }

      // Output based on format
      if (options.format === 'json' || opts.json) {
        writeData(JSON.stringify(result.output.data, null, 2));
      } else {
        // Text output goes to stdout (it's the data)
        writeData(result.output.text);
      }
    } finally {
      db.close();
    }
  });
