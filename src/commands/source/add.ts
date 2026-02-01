import { Command } from 'commander';
import { existsSync, statSync } from 'fs';
import { resolve, relative, basename } from 'path';
import fg from 'fast-glob';
import { loadConfig, saveConfig, ensureInitialized } from '../../config/index.js';
import { writeSuccess, writeMessage } from '../../utils/streams.js';
import { formatCommand, formatHighlight } from '../../utils/format.js';
import { PathNotFoundError, SourceExistsError, InvalidUsageError } from '../../errors/index.js';
import type { Source } from '../../config/types.js';

/** Default file patterns to include */
const DEFAULT_INCLUDE = ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx', '**/*.md', '**/*.json'];

/** Default patterns to exclude */
const DEFAULT_EXCLUDE = ['**/node_modules/**', '**/dist/**', '**/.git/**'];

export const addCommand = new Command('add')
  .description('Add a directory as a source')
  .argument('<path>', 'Directory path to add')
  .option('-n, --name <name>', 'Custom name for the source')
  .option('-i, --include <patterns...>', 'Include patterns (glob)')
  .option('-e, --exclude <patterns...>', 'Exclude patterns (glob)')
  .action(async (path: string, options) => {
    ensureInitialized();

    const absolutePath = resolve(process.cwd(), path);
    const relativePath = './' + relative(process.cwd(), absolutePath);

    // Validate path exists
    if (!existsSync(absolutePath)) {
      const suggestion = findSimilarPath(path);
      throw new PathNotFoundError(path, suggestion);
    }

    // Validate it's a directory
    if (!statSync(absolutePath).isDirectory()) {
      throw new InvalidUsageError(`'${path}' is a file, not a directory.`);
    }

    const config = loadConfig();
    const sourceId = options.name || basename(absolutePath);

    // Check for duplicates
    const existing = config.sources.find((s) => s.id === sourceId);
    if (existing) {
      throw new SourceExistsError(sourceId, existing.path);
    }

    // Resolve patterns
    const include = options.include || DEFAULT_INCLUDE;
    const exclude = options.exclude || DEFAULT_EXCLUDE;

    // Count matching files
    const files = fg.sync(include, {
      cwd: absolutePath,
      ignore: exclude,
      onlyFiles: true,
    });

    // Create and save source
    const source: Source = {
      id: sourceId,
      path: relativePath,
      patterns: { include, exclude },
    };

    config.sources.push(source);
    saveConfig(config);

    // Output
    writeSuccess(`Added source '${formatHighlight(sourceId)}'`);
    writeMessage(`  Path:     ${relativePath}`);
    writeMessage(`  Files:    ${files.length} (${summarizeExtensions(files)})`);
    writeMessage('');
    writeMessage(`Run ${formatCommand('contextkit index')} to index this source.`);
  });

/**
 * Find a similar path to suggest
 */
function findSimilarPath(path: string): string | undefined {
  const parent = resolve(path, '..');
  if (!existsSync(parent)) return undefined;

  const entries = fg.sync(['*'], { cwd: parent, onlyDirectories: true });
  const needle = basename(path).toLowerCase();

  return entries.find((e) => e.toLowerCase().includes(needle));
}

/**
 * Summarize file extensions for display
 */
function summarizeExtensions(files: string[]): string {
  const exts = new Set<string>();
  for (const file of files) {
    const ext = file.split('.').pop();
    if (ext) exts.add(ext);
  }
  const list = Array.from(exts).slice(0, 5).join(', ');
  return exts.size > 5 ? `${list}...` : list;
}
