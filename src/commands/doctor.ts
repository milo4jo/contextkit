import { Command } from 'commander';
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { loadConfig, getDbPath } from '../config/index.js';
import { openDatabase } from '../db/index.js';
import { writeMessage } from '../utils/streams.js';

interface CheckResult {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  detail?: string;
}

const CHECK_OK = chalk.green('✓');
const CHECK_WARN = chalk.yellow('⚠');
const CHECK_ERROR = chalk.red('✗');

function formatResult(result: CheckResult): string {
  const icon =
    result.status === 'ok' ? CHECK_OK : result.status === 'warn' ? CHECK_WARN : CHECK_ERROR;

  let output = `${icon} ${result.name}: ${result.message}`;
  if (result.detail) {
    output += chalk.dim(`\n    ${result.detail}`);
  }
  return output;
}

async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);

  if (major >= 18) {
    return {
      name: 'Node.js version',
      status: 'ok',
      message: version,
    };
  }

  return {
    name: 'Node.js version',
    status: 'error',
    message: `${version} (requires >= 18)`,
    detail: 'Upgrade Node.js: https://nodejs.org/',
  };
}

async function checkConfig(): Promise<CheckResult> {
  try {
    const config = await loadConfig();
    const sourceCount = config.sources?.length || 0;

    if (sourceCount === 0) {
      return {
        name: 'Configuration',
        status: 'warn',
        message: 'No sources configured',
        detail: 'Run: contextkit source add ./src',
      };
    }

    return {
      name: 'Configuration',
      status: 'ok',
      message: `${sourceCount} source(s) configured`,
    };
  } catch {
    return {
      name: 'Configuration',
      status: 'error',
      message: 'Not initialized',
      detail: 'Run: contextkit init',
    };
  }
}

async function checkDatabase(): Promise<CheckResult> {
  try {
    const dbPath = getDbPath();

    if (!existsSync(dbPath)) {
      return {
        name: 'Index database',
        status: 'warn',
        message: 'Not indexed yet',
        detail: 'Run: contextkit index',
      };
    }

    const stats = statSync(dbPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    const db = openDatabase();
    const chunks = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number };
    const files = db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number };
    db.close();

    return {
      name: 'Index database',
      status: 'ok',
      message: `${chunks.count} chunks, ${files.count} files (${sizeMB} MB)`,
    };
  } catch (error) {
    return {
      name: 'Index database',
      status: 'error',
      message: 'Database error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkEmbeddings(): Promise<CheckResult> {
  try {
    const dbPath = getDbPath();

    if (!existsSync(dbPath)) {
      return {
        name: 'Embeddings',
        status: 'warn',
        message: 'No index yet',
      };
    }

    const db = openDatabase();
    const result = db
      .prepare('SELECT COUNT(*) as count FROM chunks WHERE embedding IS NOT NULL')
      .get() as { count: number };
    const total = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number };
    db.close();

    if (result.count === 0) {
      return {
        name: 'Embeddings',
        status: 'warn',
        message: 'No embeddings generated',
        detail: 'Run: contextkit index --full',
      };
    }

    const coverage = ((result.count / total.count) * 100).toFixed(0);
    return {
      name: 'Embeddings',
      status: 'ok',
      message: `${result.count}/${total.count} chunks (${coverage}%)`,
    };
  } catch (error) {
    return {
      name: 'Embeddings',
      status: 'error',
      message: 'Error checking embeddings',
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkDiskSpace(): Promise<CheckResult> {
  try {
    const dbPath = getDbPath();
    const dir = join(dbPath, '..');

    if (!existsSync(dir)) {
      return {
        name: 'Disk space',
        status: 'ok',
        message: 'Not yet initialized',
      };
    }

    // Simple check - just report db size
    if (existsSync(dbPath)) {
      const stats = statSync(dbPath);
      const sizeMB = stats.size / 1024 / 1024;

      if (sizeMB > 500) {
        return {
          name: 'Disk space',
          status: 'warn',
          message: `Database is ${sizeMB.toFixed(0)} MB`,
          detail: 'Consider: contextkit cache clear',
        };
      }
    }

    return {
      name: 'Disk space',
      status: 'ok',
      message: 'OK',
    };
  } catch {
    return {
      name: 'Disk space',
      status: 'ok',
      message: 'Could not check',
    };
  }
}

async function checkQueryCache(): Promise<CheckResult> {
  try {
    const dbPath = getDbPath();

    if (!existsSync(dbPath)) {
      return {
        name: 'Query cache',
        status: 'ok',
        message: 'No cache yet',
      };
    }

    const db = openDatabase();

    // Check if query_cache table exists
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='query_cache'")
      .get();

    if (!tableExists) {
      db.close();
      return {
        name: 'Query cache',
        status: 'ok',
        message: 'Not enabled',
      };
    }

    const result = db.prepare('SELECT COUNT(*) as count FROM query_cache').get() as {
      count: number;
    };
    db.close();

    return {
      name: 'Query cache',
      status: 'ok',
      message: `${result.count} cached queries`,
    };
  } catch {
    return {
      name: 'Query cache',
      status: 'ok',
      message: 'Could not check',
    };
  }
}

async function runDoctor(options: { json?: boolean }): Promise<void> {
  const checks: CheckResult[] = [];

  writeMessage(chalk.bold('\n🩺 ContextKit Doctor\n'));
  writeMessage('Running diagnostics...\n');

  // Run all checks
  checks.push(await checkNodeVersion());
  checks.push(await checkConfig());
  checks.push(await checkDatabase());
  checks.push(await checkEmbeddings());
  checks.push(await checkQueryCache());
  checks.push(await checkDiskSpace());

  if (options.json) {
    console.log(JSON.stringify(checks, null, 2));
    return;
  }

  // Output results
  for (const result of checks) {
    writeMessage(formatResult(result));
  }

  // Summary
  const errors = checks.filter((c) => c.status === 'error').length;
  const warnings = checks.filter((c) => c.status === 'warn').length;

  writeMessage('');

  if (errors > 0) {
    writeMessage(chalk.red(`\n${errors} error(s) found. Fix these issues to use ContextKit.`));
    process.exit(1);
  } else if (warnings > 0) {
    writeMessage(
      chalk.yellow(`\n${warnings} warning(s). ContextKit will work but may be limited.`)
    );
  } else {
    writeMessage(chalk.green('\n✓ All checks passed! ContextKit is ready to use.'));
  }

  // Quick tips
  writeMessage(chalk.dim('\nQuick commands:'));
  writeMessage(chalk.dim('  contextkit init           # Initialize project'));
  writeMessage(chalk.dim('  contextkit source add .   # Add sources'));
  writeMessage(chalk.dim('  contextkit index          # Build index'));
  writeMessage(chalk.dim('  contextkit select "query" # Find context\n'));
}

export const doctorCommand = new Command('doctor')
  .description('Diagnose ContextKit setup and configuration')
  .option('--json', 'Output as JSON')
  .action(runDoctor);
