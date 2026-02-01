import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, ensureInitialized } from '../config/index.js';
import { output } from '../utils/output.js';

export const indexCommand = new Command('index')
  .description('Index all sources')
  .option('-s, --source <name>', 'Index only a specific source')
  .action(async (options) => {
    ensureInitialized();

    const config = loadConfig();
    const opts = indexCommand.parent?.opts() || {};

    if (config.sources.length === 0) {
      output.error('No sources configured');
      console.error(`Add sources first with ${chalk.cyan('contextkit source add <path>')}`);
      process.exit(1);
    }

    // Filter sources if --source specified
    let sourcesToIndex = config.sources;
    if (options.source) {
      const source = config.sources.find((s) => s.id === options.source);
      if (!source) {
        output.error('Source not found');
        console.error(`No source named '${options.source}'.`);
        process.exit(1);
      }
      sourcesToIndex = [source];
    }

    if (!opts.quiet) {
      console.log();
      console.log('Indexing sources...');
      console.log();
    }

    // TODO: Phase 2 - Implement actual indexing
    // For now, just show what would happen
    
    for (const source of sourcesToIndex) {
      if (!opts.quiet) {
        console.log(chalk.cyan(`[${source.id}]`) + ' Scanning files...');
        console.log(chalk.gray('  → Indexing not yet implemented (Phase 2)'));
        console.log();
      }
    }

    if (!opts.quiet) {
      console.log(chalk.yellow('⚠ Indexing not yet implemented'));
      console.log(chalk.gray('  This feature is coming in Phase 2.'));
      console.log();
    }

    // For JSON output
    if (opts.json) {
      console.log(JSON.stringify({
        status: 'not_implemented',
        message: 'Indexing will be implemented in Phase 2',
        sources: sourcesToIndex.map((s) => s.id),
      }));
    }
  });
