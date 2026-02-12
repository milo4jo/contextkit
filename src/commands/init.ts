import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { getDefaultConfig, CONFIG_FILE, INDEX_DB } from '../config/index.js';
import { getPreset, getPresetList, presetToYaml } from '../config/presets.js';
import { initDatabase } from '../db/index.js';
import { writeSuccess, writeMessage, writeError } from '../utils/streams.js';
import { formatPath, formatCommand, formatBold } from '../utils/format.js';
import { AlreadyInitializedError } from '../errors/index.js';

export const initCommand = new Command('init')
  .description('Initialize ContextKit in current directory')
  .option('-f, --force', 'Reinitialize (deletes existing index)')
  .option('-p, --preset <name>', 'Use a preset config (react, node, python, monorepo, fullstack)')
  .option('--list-presets', 'List available presets')
  .action(async (options) => {
    // List presets and exit
    if (options.listPresets) {
      writeMessage(formatBold('Available presets:'));
      writeMessage('');
      for (const preset of getPresetList()) {
        writeMessage(`  ${formatCommand(preset.name.padEnd(12))} ${preset.description}`);
      }
      writeMessage('');
      writeMessage(`Usage: ${formatCommand('contextkit init --preset react')}`);
      return;
    }

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

    // Create config file (use preset or default)
    let config: string;
    let presetName: string | undefined;

    if (options.preset) {
      const preset = getPreset(options.preset);
      if (!preset) {
        writeError(`Unknown preset: ${options.preset}`);
        writeMessage('');
        writeMessage(
          `Available presets: ${getPresetList()
            .map((p) => p.name)
            .join(', ')}`
        );
        writeMessage(`Run ${formatCommand('contextkit init --list-presets')} for details.`);
        rmSync(contextKitDir, { recursive: true });
        process.exit(1);
      }
      config = presetToYaml(preset);
      presetName = preset.name;
    } else {
      config = getDefaultConfig();
    }

    writeFileSync(configPath, config);
    if (presetName) {
      writeSuccess(`Created ${formatPath('.contextkit/config.yaml')} (preset: ${presetName})`);
    } else {
      writeSuccess(`Created ${formatPath('.contextkit/config.yaml')}`);
    }

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

    // Next steps (different for preset vs manual)
    writeMessage('');
    writeMessage(formatBold('Next steps:'));
    if (presetName) {
      writeMessage(`  1. Review config:  ${formatCommand('cat .contextkit/config.yaml')}`);
      writeMessage(`  2. Index:          ${formatCommand('contextkit index')}`);
      writeMessage(`  3. Select context: ${formatCommand('contextkit select "your query"')}`);
    } else {
      writeMessage(`  1. Add sources:    ${formatCommand('contextkit source add ./src')}`);
      writeMessage(`  2. Index:          ${formatCommand('contextkit index')}`);
      writeMessage(`  3. Select context: ${formatCommand('contextkit select "your query"')}`);
    }
    writeMessage('');
  });
