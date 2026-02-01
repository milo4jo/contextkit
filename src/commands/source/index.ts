import { Command } from 'commander';
import { addCommand } from './add.js';
import { listCommand } from './list.js';
import { removeCommand } from './remove.js';

export const sourceCommand = new Command('source')
  .description('Manage sources')
  .addCommand(addCommand)
  .addCommand(listCommand)
  .addCommand(removeCommand)
  .action(() => {
    // Show help when no subcommand given
    sourceCommand.help();
  });
