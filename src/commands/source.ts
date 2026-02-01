import { Command } from 'commander';
import { existsSync, statSync } from 'fs';
import { resolve, relative, basename } from 'path';
import chalk from 'chalk';
import fg from 'fast-glob';
import { loadConfig, saveConfig, ensureInitialized } from '../config/index.js';
import { output } from '../utils/output.js';
import type { Source } from '../config/types.js';

export const sourceCommand = new Command('source')
  .description('Manage sources')
  .action(() => {
    // Show subcommand help when no subcommand given
    sourceCommand.help();
  });

// source add
sourceCommand
  .command('add <path>')
  .description('Add a directory as a source')
  .option('-n, --name <name>', 'Custom name for the source')
  .option('-i, --include <patterns...>', 'Include patterns (glob)')
  .option('-e, --exclude <patterns...>', 'Exclude patterns (glob)')
  .action(async (path: string, options) => {
    ensureInitialized();

    const absolutePath = resolve(process.cwd(), path);
    const relativePath = './' + relative(process.cwd(), absolutePath);

    // Validate path exists
    if (!existsSync(absolutePath)) {
      output.error('Path not found');
      
      // Try to suggest similar paths
      const parent = resolve(absolutePath, '..');
      if (existsSync(parent)) {
        const entries = fg.sync(['*'], { cwd: parent, onlyDirectories: true });
        const similar = entries.filter((e) => 
          e.toLowerCase().includes(basename(path).toLowerCase())
        );
        if (similar.length > 0) {
          console.error(`Did you mean '${similar[0]}'?`);
        }
      }
      process.exit(1);
    }

    // Validate it's a directory
    if (!statSync(absolutePath).isDirectory()) {
      output.error('Not a directory');
      console.error(`'${path}' is a file, not a directory.`);
      process.exit(1);
    }

    // Load config
    const config = loadConfig();
    
    // Generate source ID
    const sourceId = options.name || basename(absolutePath);
    
    // Check for duplicates
    const existing = config.sources.find((s) => s.id === sourceId);
    if (existing) {
      output.error('Source already exists');
      console.error(`A source named '${sourceId}' already exists.`);
      console.error(`Use a different name with ${chalk.cyan('--name')}`);
      process.exit(1);
    }

    // Count files
    const defaultInclude = ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx', '**/*.md', '**/*.json'];
    const defaultExclude = ['**/node_modules/**', '**/dist/**', '**/.git/**'];
    
    const include = options.include || defaultInclude;
    const exclude = options.exclude || defaultExclude;
    
    const files = fg.sync(include, {
      cwd: absolutePath,
      ignore: exclude,
      onlyFiles: true,
    });

    // Create source entry
    const source: Source = {
      id: sourceId,
      path: relativePath,
      patterns: {
        include,
        exclude,
      },
    };

    // Add to config
    config.sources.push(source);
    saveConfig(config);

    // Output
    output.success(`Added source '${chalk.cyan(sourceId)}'`);
    console.log(`  Path:     ${relativePath}`);
    console.log(`  Files:    ${files.length} (${getFileExtensions(files)})`);
    console.log();
    console.log(`Run ${chalk.cyan('contextkit index')} to index this source.`);
  });

// source list
sourceCommand
  .command('list')
  .description('List configured sources')
  .action(() => {
    ensureInitialized();

    const config = loadConfig();
    const opts = sourceCommand.parent?.opts() || {};

    if (config.sources.length === 0) {
      if (opts.json) {
        console.log(JSON.stringify({ sources: [] }));
      } else {
        console.log('No sources configured.');
        console.log(`Add one with ${chalk.cyan('contextkit source add <path>')}`);
      }
      return;
    }

    if (opts.json) {
      console.log(JSON.stringify({ sources: config.sources }, null, 2));
      return;
    }

    if (opts.plain) {
      for (const source of config.sources) {
        console.log(`${source.id}\t${source.path}`);
      }
      return;
    }

    // Table output
    console.log();
    console.log(chalk.bold('Sources:'));
    console.log(`  ${chalk.gray('NAME'.padEnd(15))} ${chalk.gray('PATH')}`);
    
    for (const source of config.sources) {
      console.log(`  ${source.id.padEnd(15)} ${source.path}`);
    }
    
    console.log();
    console.log(`Total: ${config.sources.length} source${config.sources.length === 1 ? '' : 's'}`);
  });

// source remove
sourceCommand
  .command('remove <name>')
  .alias('rm')
  .description('Remove a source')
  .action((name: string) => {
    ensureInitialized();

    const config = loadConfig();
    const index = config.sources.findIndex((s) => s.id === name);
    
    if (index === -1) {
      output.error('Source not found');
      console.error(`No source named '${name}'.`);
      console.error(`Run ${chalk.cyan('contextkit source list')} to see available sources.`);
      process.exit(1);
    }

    config.sources.splice(index, 1);
    saveConfig(config);

    output.success(`Removed source '${chalk.cyan(name)}'`);
    console.log(`Run ${chalk.cyan('contextkit index')} to update the index.`);
  });

function getFileExtensions(files: string[]): string {
  const exts = new Set<string>();
  for (const file of files) {
    const ext = file.split('.').pop();
    if (ext) exts.add(ext);
  }
  return Array.from(exts).slice(0, 5).join(', ') + (exts.size > 5 ? '...' : '');
}
