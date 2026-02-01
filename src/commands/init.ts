import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { getDefaultConfig, CONFIG_FILE, INDEX_DB } from '../config/index.js';
import { initDatabase } from '../db/index.js';
import { output } from '../utils/output.js';

export const initCommand = new Command('init')
  .description('Initialize ContextKit in current directory')
  .option('-f, --force', 'Reinitialize (deletes existing index)')
  .action(async (options) => {
    const cwd = process.cwd();
    const contextKitDir = join(cwd, '.contextkit');
    const configPath = join(contextKitDir, CONFIG_FILE);
    const dbPath = join(contextKitDir, INDEX_DB);
    const gitignorePath = join(cwd, '.gitignore');

    // Check if already initialized
    if (existsSync(contextKitDir) && !options.force) {
      output.error('Already initialized');
      console.error(`
A .contextkit directory already exists.
Use ${chalk.cyan('--force')} to reinitialize (this will delete existing index).
`);
      process.exit(1);
    }

    // Create directory
    if (existsSync(contextKitDir) && options.force) {
      // Clean existing
      const { rmSync } = await import('fs');
      rmSync(contextKitDir, { recursive: true });
    }
    mkdirSync(contextKitDir, { recursive: true });

    // Create config file
    const config = getDefaultConfig();
    writeFileSync(configPath, config);
    output.success(`Created ${chalk.cyan('.contextkit/config.yaml')}`);

    // Initialize database
    initDatabase(dbPath);
    output.success(`Created ${chalk.cyan('.contextkit/index.db')}`);

    // Add to .gitignore
    const gitignoreEntry = '\n# ContextKit\n.contextkit/index.db\n';
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf-8');
      if (!content.includes('.contextkit')) {
        appendFileSync(gitignorePath, gitignoreEntry);
        output.success(`Added ${chalk.cyan('.contextkit')} to .gitignore`);
      }
    } else {
      writeFileSync(gitignorePath, gitignoreEntry.trim() + '\n');
      output.success(`Created .gitignore with ${chalk.cyan('.contextkit')}`);
    }

    // Next steps
    console.log(`
${chalk.bold('Next steps:')}
  1. Add sources:    ${chalk.cyan('contextkit source add ./src')}
  2. Index:          ${chalk.cyan('contextkit index')}
  3. Select context: ${chalk.cyan('contextkit select "your query"')}
`);
  });
