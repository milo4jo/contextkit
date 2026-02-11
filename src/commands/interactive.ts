/**
 * Interactive Mode - REPL-style context exploration
 *
 * Provides a persistent session for exploring code context without
 * having to re-initialize for each query.
 *
 * Commands:
 *   /select <query>  - Select context for a query (default)
 *   /symbol <name>   - Search for symbols by name
 *   /graph <func>    - Show call graph for a function
 *   /status          - Show project status
 *   /clear           - Clear screen
 *   /help            - Show available commands
 *   /exit, exit, quit - Exit interactive mode
 */

import { Command } from 'commander';
import { createInterface } from 'readline';
import { ensureInitialized } from '../config/index.js';
import { openDatabase } from '../db/index.js';
import { selectContext, type SelectOptions } from '../selector/index.js';
import { searchSymbols, formatSymbolOutput } from './symbol.js';
import { buildCallGraph, formatCallGraph } from './graph.js';
import { writeMessage, writeError } from '../utils/streams.js';
import chalk from 'chalk';
import type Database from 'better-sqlite3';

const PROMPT = chalk.cyan('contextkit> ');
const WELCOME = `
${chalk.bold.cyan('🎯 ContextKit Interactive Mode')}
${chalk.dim('Type a query to select context, or use commands:')}
${chalk.dim('  /symbol <name>  - Find symbols')}
${chalk.dim('  /graph <func>   - Show call graph')}
${chalk.dim('  /status         - Project status')}
${chalk.dim('  /help           - Show all commands')}
${chalk.dim('  /exit           - Exit')}
`;

interface InteractiveOptions {
  budget?: string;
  format?: string;
}

interface SessionState {
  db: Database.Database;
  projectDir: string;
  options: InteractiveOptions;
  lastQuery?: string;
  lastResults?: string;
}

/**
 * Show help message
 */
function showHelp(): void {
  const help = `
${chalk.bold('Available Commands:')}

  ${chalk.cyan('<query>')}           Select context matching your query (default)
  ${chalk.cyan('/select <query>')}   Explicitly select context
  ${chalk.cyan('/symbol <name>')}    Search for symbols by name
  ${chalk.cyan('/graph <func>')}     Show call graph for a function
  ${chalk.cyan('/status')}           Show project status
  ${chalk.cyan('/clear')}            Clear the screen
  ${chalk.cyan('/last')}             Re-show last results
  ${chalk.cyan('/copy')}             Copy last results to clipboard
  ${chalk.cyan('/help')}             Show this help
  ${chalk.cyan('/exit')}             Exit interactive mode

${chalk.bold('Tips:')}
  • Queries without a slash are treated as select queries
  • Use Tab to see command completions
  • Use Up/Down arrows for history
`;
  console.log(help);
}

/**
 * Clear the terminal screen
 */
function clearScreen(): void {
  process.stdout.write('\x1B[2J\x1B[0f');
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<boolean> {
  const { exec } = await import('child_process');

  const cmd =
    process.platform === 'darwin'
      ? 'pbcopy'
      : process.platform === 'win32'
        ? 'clip'
        : 'xclip -selection clipboard';

  try {
    const proc = exec(cmd);
    proc.stdin?.write(text);
    proc.stdin?.end();
    await new Promise<void>((resolve, reject) => {
      proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Exit code ${code}`))));
      proc.on('error', reject);
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get chunk count from database
 */
function getChunkCount(db: Database.Database): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number };
  return result.count;
}

/**
 * Show project status
 */
function showStatusInfo(db: Database.Database, projectDir: string): void {
  const chunkCount = getChunkCount(db);
  const sourcesResult = db.prepare('SELECT COUNT(DISTINCT source_id) as count FROM chunks').get() as { count: number };
  const filesResult = db.prepare('SELECT COUNT(DISTINCT file_path) as count FROM chunks').get() as { count: number };

  console.log(`
${chalk.bold('📊 Project Status')}

  ${chalk.dim('Directory:')} ${projectDir}
  ${chalk.dim('Sources:')}   ${sourcesResult.count}
  ${chalk.dim('Files:')}     ${filesResult.count}
  ${chalk.dim('Chunks:')}    ${chunkCount}
`);
}

/**
 * Handle a command in interactive mode
 */
async function handleCommand(input: string, state: SessionState): Promise<boolean> {
  const trimmed = input.trim();

  if (!trimmed) {
    return true; // Continue, empty input
  }

  // Exit commands
  if (trimmed === '/exit' || trimmed === 'exit' || trimmed === 'quit' || trimmed === '/quit') {
    console.log(chalk.dim('\nGoodbye! 👋'));
    return false;
  }

  // Help
  if (trimmed === '/help' || trimmed === 'help') {
    showHelp();
    return true;
  }

  // Clear
  if (trimmed === '/clear' || trimmed === 'clear') {
    clearScreen();
    console.log(WELCOME);
    return true;
  }

  // Status
  if (trimmed === '/status' || trimmed === 'status') {
    try {
      showStatusInfo(state.db, state.projectDir);
    } catch (err) {
      writeError(`Status error: ${err instanceof Error ? err.message : String(err)}`);
    }
    return true;
  }

  // Last results
  if (trimmed === '/last') {
    if (state.lastResults) {
      console.log(state.lastResults);
    } else {
      console.log(chalk.dim('No previous results'));
    }
    return true;
  }

  // Copy
  if (trimmed === '/copy') {
    if (state.lastResults) {
      const success = await copyToClipboard(state.lastResults);
      if (success) {
        console.log(chalk.green('✓ Copied to clipboard'));
      } else {
        console.log(chalk.red('✗ Failed to copy (clipboard command not found)'));
      }
    } else {
      console.log(chalk.dim('No previous results to copy'));
    }
    return true;
  }

  // Symbol search
  if (trimmed.startsWith('/symbol ') || trimmed.startsWith('/sym ')) {
    const symbolName = trimmed.replace(/^\/(symbol|sym)\s+/, '');
    if (!symbolName) {
      console.log(chalk.yellow('Usage: /symbol <name>'));
      return true;
    }

    try {
      console.log(chalk.dim(`\nSearching symbols: "${symbolName}"...\n`));
      const results = searchSymbols(state.db, symbolName, { limit: 20 });
      const output = formatSymbolOutput(results, false);
      console.log(output || chalk.dim('No symbols found'));
      state.lastResults = output;
      state.lastQuery = `/symbol ${symbolName}`;
    } catch (err) {
      writeError(`Symbol search error: ${err instanceof Error ? err.message : String(err)}`);
    }
    return true;
  }

  // Call graph
  if (trimmed.startsWith('/graph ')) {
    const funcName = trimmed.replace(/^\/graph\s+/, '');
    if (!funcName) {
      console.log(chalk.yellow('Usage: /graph <function>'));
      return true;
    }

    try {
      console.log(chalk.dim(`\nBuilding call graph: "${funcName}"...\n`));
      const graphData = buildCallGraph(state.db, funcName, {});
      const output = formatCallGraph(graphData, false);
      console.log(output);
      state.lastResults = output;
      state.lastQuery = `/graph ${funcName}`;
    } catch (err) {
      writeError(`Graph error: ${err instanceof Error ? err.message : String(err)}`);
    }
    return true;
  }

  // Select (explicit or implicit)
  const query = trimmed.startsWith('/select ') ? trimmed.replace(/^\/select\s+/, '') : trimmed;

  if (!query) {
    console.log(chalk.yellow('Please enter a query'));
    return true;
  }

  try {
    console.log(chalk.dim(`\nSearching: "${query}"...\n`));

    const budget = parseInt(state.options.budget || '8000', 10);
    const format = (state.options.format || 'markdown') as 'markdown' | 'plain' | 'xml' | 'json';

    const selectOpts: SelectOptions = {
      query,
      budget,
      format,
      mode: 'full',
    };

    const result = await selectContext(state.db, selectOpts);

    if (result.isEmpty) {
      console.log(chalk.yellow('No indexed content found. Run: contextkit index'));
      return true;
    }

    const output = result.output.text;
    console.log(output);
    state.lastResults = output;
    state.lastQuery = query;

    // Show stats
    const stats = result.output.data.stats;
    console.log(chalk.dim(`\n📊 ${stats.chunksIncluded} chunks, ~${stats.totalTokens} tokens`));
    if (result.fromCache) {
      console.log(chalk.dim('  (cached)'));
    }
  } catch (err) {
    writeError(`Select error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return true;
}

/**
 * Start interactive mode
 */
async function startInteractive(options: InteractiveOptions): Promise<void> {
  const projectDir = process.cwd();

  // Ensure initialized
  ensureInitialized();

  // Open database
  const db = openDatabase();

  // Check if indexed
  const chunkCount = getChunkCount(db);
  if (chunkCount === 0) {
    writeError('No indexed content found.');
    writeMessage('Run: contextkit index');
    db.close();
    process.exit(1);
  }

  // Create state
  const state: SessionState = {
    db,
    projectDir,
    options,
  };

  // Print welcome
  console.log(WELCOME);
  console.log(chalk.dim(`📂 ${projectDir}`));
  console.log(chalk.dim(`📊 ${chunkCount} chunks indexed\n`));

  // Create readline interface
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: PROMPT,
    historySize: 100,
    completer: (line: string) => {
      const commands = [
        '/select',
        '/symbol',
        '/graph',
        '/status',
        '/clear',
        '/last',
        '/copy',
        '/help',
        '/exit',
      ];
      const hits = commands.filter((c) => c.startsWith(line));
      return [hits.length ? hits : commands, line];
    },
  });

  // Handle SIGINT (Ctrl+C)
  let ctrlCCount = 0;
  rl.on('SIGINT', () => {
    ctrlCCount++;
    if (ctrlCCount >= 2) {
      console.log(chalk.dim('\n\nForce exit'));
      db.close();
      process.exit(0);
    }
    console.log(chalk.dim('\n\nUse /exit to quit, or Ctrl+C again to force exit'));
    rl.prompt();
  });

  // Start prompting
  rl.prompt();

  // Handle lines
  for await (const line of rl) {
    ctrlCCount = 0; // Reset on any input
    const shouldContinue = await handleCommand(line, state);
    if (!shouldContinue) {
      rl.close();
      db.close();
      process.exit(0);
    }
    rl.prompt();
  }

  // Handle close
  db.close();
}

export const interactiveCommand = new Command('interactive')
  .alias('i')
  .alias('repl')
  .description('Start interactive mode for exploring context')
  .option('-b, --budget <tokens>', 'Token budget for select queries', '8000')
  .option('-f, --format <format>', 'Output format (markdown, plain, xml)', 'markdown')
  .action(startInteractive);
