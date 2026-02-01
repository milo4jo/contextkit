#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initCommand } from './commands/init.js';
import { sourceCommand } from './commands/source/index.js';
import { indexCommand } from './commands/index-cmd.js';
import { selectCommand } from './commands/select.js';
import { ContextKitError, InvalidUsageError } from './errors/index.js';
import { writeError, writeMessage } from './utils/streams.js';

// Get version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const VERSION = pkg.version;

// Exit codes per CLI-DESIGN.md
const EXIT_ERROR = 1;
const EXIT_INVALID_USAGE = 2;

/**
 * Handle errors globally
 */
function handleError(error: unknown): never {
  if (error instanceof ContextKitError) {
    writeError(error.message);

    const exitCode = error instanceof InvalidUsageError ? EXIT_INVALID_USAGE : EXIT_ERROR;

    process.exit(exitCode);
  }

  // Unexpected error - show stack in verbose mode
  if (error instanceof Error) {
    writeError(error.message);
    if (process.env.DEBUG) {
      writeMessage(error.stack || '');
    }
  } else {
    writeError('An unexpected error occurred');
  }

  process.exit(EXIT_ERROR);
}

// Global error handlers
process.on('uncaughtException', handleError);
process.on('unhandledRejection', handleError);

const program = new Command();

program
  .name('contextkit')
  .description('Smart context selection for LLMs')
  .version(VERSION, '-v, --version', 'Show version number')
  .showHelpAfterError()
  .configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name(),
  });

// Global options
program
  .option('--json', 'Output as JSON')
  .option('--plain', 'Plain output (no colors/formatting)')
  .option('--quiet', 'Suppress non-essential output');

// Register commands
program.addCommand(initCommand);
program.addCommand(sourceCommand);
program.addCommand(indexCommand);
program.addCommand(selectCommand);

// Default action when no command given
program.action(() => {
  console.log(`
🎯 contextkit - Smart context selection for AI coding assistants

Quick Start:
  $ contextkit init                    # Initialize in your project
  $ contextkit source add ./src        # Add source directories
  $ contextkit index                   # Index everything
  $ contextkit select "your query"     # Find relevant context

Commands:
  init          Initialize ContextKit in current directory
  source        Manage source directories
  index         Index all sources (re-run after code changes)
  select        Select context for a query

Global Options:
  --json        Output as JSON
  --plain       No colors (or set NO_COLOR=1)
  --quiet       Suppress non-essential output
  -v, --version Show version

Run 'contextkit <command> --help' for command details.
`);
});

program.parse();
