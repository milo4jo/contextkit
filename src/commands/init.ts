import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { getDefaultConfig, CONFIG_FILE, INDEX_DB } from '../config/index.js';
import { initDatabase } from '../db/index.js';
import { writeSuccess, writeMessage } from '../utils/streams.js';
import { formatPath, formatCommand, formatBold } from '../utils/format.js';
import { AlreadyInitializedError } from '../errors/index.js';

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
      throw new AlreadyInitializedError();
    }

    // Clean existing if --force
    if (existsSync(contextKitDir) && options.force) {
      rmSync(contextKitDir, { recursive: true });
    }

    // Create directory
    mkdirSync(contextKitDir, { recursive: true });

    // Create config file
    const config = getDefaultConfig();
    writeFileSync(configPath, config);
    writeSuccess(`Created ${formatPath('.contextkit/config.yaml')}`);

    // Initialize database
    initDatabase(dbPath);
    writeSuccess(`Created ${formatPath('.contextkit/index.db')}`);

    // Add to .gitignore
    const gitignoreEntry = '\n# ContextKit\n.contextkit/index.db\n';
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf-8');
      if (!content.includes('.contextkit')) {
        appendFileSync(gitignorePath, gitignoreEntry);
        writeSuccess(`Added ${formatPath('.contextkit')} to .gitignore`);
      }
    } else {
      writeFileSync(gitignorePath, gitignoreEntry.trim() + '\n');
      writeSuccess(`Created .gitignore with ${formatPath('.contextkit')}`);
    }

    // Next steps
    writeMessage('');
    writeMessage(formatBold('Next steps:'));
    writeMessage(`  1. Add sources:    ${formatCommand('contextkit source add ./src')}`);
    writeMessage(`  2. Index:          ${formatCommand('contextkit index')}`);
    writeMessage(`  3. Select context: ${formatCommand('contextkit select "your query"')}`);
    writeMessage('');
  });
