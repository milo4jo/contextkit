#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { sourceCommand } from './commands/source.js';
import { indexCommand } from './commands/index-cmd.js';
import { selectCommand } from './commands/select.js';

const program = new Command();

program
  .name('contextkit')
  .description('Smart context selection for LLMs')
  .version('0.1.0', '-v, --version', 'Show version number')
  .showHelpAfterError()
  .configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name(),
  });

// Global options
program
  .option('--json', 'Output as JSON')
  .option('--plain', 'Plain output (no colors/formatting)')
  .option('--quiet', 'Suppress non-essential output')
  .option('--verbose', 'Show detailed output');

// Register commands
program.addCommand(initCommand);
program.addCommand(sourceCommand);
program.addCommand(indexCommand);
program.addCommand(selectCommand);

// Default action when no command given
program.action(() => {
  console.log(`
contextkit - Smart context selection for LLMs

Usage: contextkit <command> [options]

Commands:
  init          Initialize ContextKit in current directory
  source        Manage sources
  index         Index all sources
  select        Select context for a query

Examples:
  $ contextkit init
  $ contextkit source add ./src
  $ contextkit index
  $ contextkit select "How does auth work?"

Run 'contextkit <command> --help' for details.
`);
});

program.parse();
