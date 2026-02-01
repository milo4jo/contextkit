import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, ensureInitialized } from '../config/index.js';
import { writeData, writeMessage, writeWarning, shouldUseColor } from '../utils/streams.js';
import { SourceNotFoundError } from '../errors/index.js';

export const indexCommand = new Command('index')
  .description('Index all sources')
  .option('-s, --source <name>', 'Index only a specific source')
  .action(async (options) => {
    ensureInitialized();

    const config = loadConfig();
    const opts = indexCommand.parent?.opts() || {};

    if (config.sources.length === 0) {
      writeWarning('No sources configured');
      writeMessage(`Add sources first with ${formatCommand('contextkit source add <path>')}`);
      process.exit(1);
    }

    // Filter sources if --source specified
    let sourcesToIndex = config.sources;
    if (options.source) {
      const source = config.sources.find((s) => s.id === options.source);
      if (!source) {
        throw new SourceNotFoundError(options.source);
      }
      sourcesToIndex = [source];
    }

    if (!opts.quiet) {
      writeMessage('');
      writeMessage('Indexing sources...');
      writeMessage('');
    }

    // TODO: Phase 2 - Implement actual indexing
    for (const source of sourcesToIndex) {
      if (!opts.quiet) {
        writeMessage(`${formatHighlight(`[${source.id}]`)} Scanning files...`);
        writeMessage(formatDim('  → Indexing not yet implemented (Phase 2)'));
        writeMessage('');
      }
    }

    if (!opts.quiet) {
      writeWarning('Indexing not yet implemented');
      writeMessage(formatDim('  This feature is coming in Phase 2.'));
      writeMessage('');
    }

    // JSON output
    if (opts.json) {
      writeData(JSON.stringify({
        status: 'not_implemented',
        message: 'Indexing will be implemented in Phase 2',
        sources: sourcesToIndex.map((s) => s.id),
      }));
    }
  });

function formatCommand(cmd: string): string {
  return shouldUseColor() ? chalk.cyan(cmd) : `'${cmd}'`;
}

function formatHighlight(text: string): string {
  return shouldUseColor() ? chalk.cyan(text) : text;
}

function formatDim(text: string): string {
  return shouldUseColor() ? chalk.gray(text) : text;
}
