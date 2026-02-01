import { Command } from 'commander';
import chalk from 'chalk';
import { ensureInitialized } from '../config/index.js';
import { output } from '../utils/output.js';

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
      output.error('Invalid budget');
      console.error('Budget must be a positive number.');
      process.exit(1);
    }

    // TODO: Phase 3 - Implement actual selection
    // For now, show placeholder

    if (options.format === 'json' || opts.json) {
      console.log(JSON.stringify({
        status: 'not_implemented',
        message: 'Selection will be implemented in Phase 3',
        query,
        budget,
        sources: options.sources?.split(',') || null,
      }, null, 2));
      return;
    }

    console.log();
    console.log(chalk.yellow('⚠ Selection not yet implemented'));
    console.log();
    console.log(chalk.gray('This feature is coming in Phase 3.'));
    console.log(chalk.gray('First, complete:'));
    console.log(chalk.gray('  1. Phase 2: Indexing'));
    console.log(chalk.gray('  2. Phase 3: Selection'));
    console.log();
    console.log(chalk.dim(`Query: "${query}"`));
    console.log(chalk.dim(`Budget: ${budget} tokens`));
    if (options.sources) {
      console.log(chalk.dim(`Sources: ${options.sources}`));
    }
    console.log();
  });
