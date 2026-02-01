import { Command } from 'commander';
import { loadConfig, ensureInitialized } from '../../config/index.js';
import { writeData, writeMessage } from '../../utils/streams.js';
import { formatCommand, formatBold, formatGray } from '../../utils/format.js';
import { getGlobalOpts } from '../../utils/cli.js';

export const listCommand = new Command('list').description('List configured sources').action(() => {
  ensureInitialized();

  const config = loadConfig();
  const opts = getGlobalOpts(listCommand);

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
