import { Command } from 'commander';
import chalk from 'chalk';
import { ensureInitialized } from '../config/index.js';
import { writeData, writeMessage, writeWarning, shouldUseColor } from '../utils/streams.js';
import { InvalidUsageError } from '../errors/index.js';

export const selectCommand = new Command('select')
  .description('Select context for a query')
  .argument('<query>', 'The query to find context for')
  .option('-b, --budget <tokens>', 'Maximum tokens to include', '8000')
  .option('-f, --format <format>', 'Output format: text, json, xml', 'text')
  .option('-s, --sources <sources>', 'Filter sources (comma-separated)')
  .option('--explain', 'Show scoring details')
  .action(async (query: string, options) => {
    ensureInitialized();

    const opts = selectCommand.parent?.opts() || {};
    const budget = parseInt(options.budget, 10);

    if (isNaN(budget) || budget <= 0) {
      throw new InvalidUsageError('Budget must be a positive number.');
    }

    // TODO: Phase 3 - Implement actual selection

    if (options.format === 'json' || opts.json) {
      writeData(JSON.stringify({
        status: 'not_implemented',
        message: 'Selection will be implemented in Phase 3',
        query,
        budget,
        sources: options.sources?.split(',') || null,
      }, null, 2));
      return;
    }

    writeMessage('');
    writeWarning('Selection not yet implemented');
    writeMessage('');
    writeMessage(formatDim('This feature is coming in Phase 3.'));
    writeMessage(formatDim('First, complete:'));
    writeMessage(formatDim('  1. Phase 2: Indexing'));
    writeMessage(formatDim('  2. Phase 3: Selection'));
    writeMessage('');
    writeMessage(formatDim(`Query: "${query}"`));
    writeMessage(formatDim(`Budget: ${budget} tokens`));
    if (options.sources) {
      writeMessage(formatDim(`Sources: ${options.sources}`));
    }
    writeMessage('');
  });

function formatDim(text: string): string {
  return shouldUseColor() ? chalk.gray(text) : text;
}
