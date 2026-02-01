import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, ensureInitialized } from '../../config/index.js';
import { writeData, writeMessage, shouldUseColor } from '../../utils/streams.js';

export const listCommand = new Command('list')
  .description('List configured sources')
  .action(() => {
    ensureInitialized();

    const config = loadConfig();
    const opts = listCommand.parent?.parent?.opts() || {};

    if (config.sources.length === 0) {
      if (opts.json) {
        writeData(JSON.stringify({ sources: [] }));
      } else if (!opts.quiet) {
        writeMessage('No sources configured.');
        writeMessage(`Add one with ${formatCommand('contextkit source add <path>')}`);
      }
      return;
    }

    // JSON output
    if (opts.json) {
      writeData(JSON.stringify({ sources: config.sources }, null, 2));
      return;
    }

    // Plain output (for piping)
    if (opts.plain) {
      for (const source of config.sources) {
        writeData(`${source.id}\t${source.path}`);
      }
      return;
    }

    // Table output
    if (!opts.quiet) {
      writeMessage('');
      writeMessage(formatBold('Sources:'));
      writeMessage(`  ${formatGray('NAME'.padEnd(15))} ${formatGray('PATH')}`);
    }

    for (const source of config.sources) {
      writeMessage(`  ${source.id.padEnd(15)} ${source.path}`);
    }

    if (!opts.quiet) {
      writeMessage('');
      writeMessage(`Total: ${config.sources.length} source${config.sources.length === 1 ? '' : 's'}`);
    }
  });

function formatCommand(cmd: string): string {
  return shouldUseColor() ? chalk.cyan(cmd) : `'${cmd}'`;
}

function formatBold(text: string): string {
  return shouldUseColor() ? chalk.bold(text) : text;
}

function formatGray(text: string): string {
  return shouldUseColor() ? chalk.gray(text) : text;
}
