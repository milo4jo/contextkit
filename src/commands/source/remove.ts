import { Command } from 'commander';
import { loadConfig, saveConfig, ensureInitialized } from '../../config/index.js';
import { writeSuccess, writeMessage } from '../../utils/streams.js';
import { formatCommand, formatHighlight } from '../../utils/format.js';
import { confirm, shouldSkipConfirm } from '../../utils/prompts.js';
import { SourceNotFoundError } from '../../errors/index.js';

export const removeCommand = new Command('remove')
  .alias('rm')
  .description('Remove a source')
  .argument('<name>', 'Name of the source to remove')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (name: string, options) => {
    ensureInitialized();

    const config = loadConfig();
    const index = config.sources.findIndex((s) => s.id === name);

    if (index === -1) {
      throw new SourceNotFoundError(name);
    }

    const source = config.sources[index];

    // Confirm unless --yes is passed
    if (!shouldSkipConfirm(options)) {
      writeMessage('');
      writeMessage(`This will remove '${formatHighlight(name)}' from indexing.`);
      writeMessage(`Path: ${source.path}`);
      writeMessage('');

      const confirmed = await confirm('Are you sure?', true);
      if (!confirmed) {
        writeMessage('Cancelled.');
        return;
      }
    }

    // Remove source
    config.sources.splice(index, 1);
    saveConfig(config);

    writeSuccess(`Removed source '${formatHighlight(name)}'`);
    writeMessage(`Run ${formatCommand('contextkit index')} to update the index.`);
  });
