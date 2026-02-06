import { Command } from 'commander';
import { ensureInitialized } from '../config/index.js';
import { openDatabase } from '../db/index.js';
import { selectContext, type OutputFormat } from '../selector/index.js';
import { writeData, writeMessage, writeWarning } from '../utils/streams.js';
import { formatCommand, formatDim } from '../utils/format.js';
import { getGlobalOpts } from '../utils/cli.js';
import { InvalidUsageError } from '../errors/index.js';

/** Valid output formats */
const VALID_FORMATS = ['markdown', 'xml', 'json', 'plain'] as const;

/** Valid selection modes */
const VALID_MODES = ['full', 'map'] as const;

export const selectCommand = new Command('select')
  .description('Select context for a query')
  .argument('<query>', 'The query to find context for')
  .option('-b, --budget <tokens>', 'Maximum tokens to include', '8000')
  .option('-f, --format <format>', 'Output format: markdown, xml, json, plain', 'markdown')
  .option('-m, --mode <mode>', 'Selection mode: full (code), map (signatures only)', 'full')
  .option('-s, --sources <sources>', 'Filter sources (comma-separated)')
  .option('--explain', 'Show scoring details')
  .option('--include-imports', 'Include files imported by selected chunks')
  .option('--no-cache', 'Skip cache lookup')
  .action(async (query: string, options) => {
    ensureInitialized();

    const opts = getGlobalOpts(selectCommand);
    const budget = parseInt(options.budget, 10);

    if (isNaN(budget) || budget <= 0) {
      throw new InvalidUsageError('Budget must be a positive number.');
    }

    // Validate format
    const format = options.format.toLowerCase() as OutputFormat;
    if (!VALID_FORMATS.includes(format)) {
      throw new InvalidUsageError(
        `Invalid format "${options.format}". Valid formats: ${VALID_FORMATS.join(', ')}`
      );
    }

    // Validate mode
    const mode = (options.mode?.toLowerCase() ?? 'full') as 'full' | 'map';
    if (!VALID_MODES.includes(mode)) {
      throw new InvalidUsageError(
        `Invalid mode "${options.mode}". Valid modes: ${VALID_MODES.join(', ')}`
      );
    }

    // Parse sources filter
    const sources = options.sources
      ? options.sources.split(',').map((s: string) => s.trim())
      : undefined;

    // Open database
    const db = openDatabase();

    try {
      // Determine effective format (--json flag overrides -f)
      const effectiveFormat: OutputFormat = opts.json ? 'json' : format;

      // Run selection
      const result = await selectContext(db, {
        query,
        budget,
        sources,
        explain: options.explain,
        format: effectiveFormat,
        mode,
        includeImports: options.includeImports,
        noCache: options.cache === false,
      });

      // Handle empty index
      if (result.isEmpty) {
        writeWarning('No indexed content found');
        writeMessage(`Run ${formatCommand('contextkit index')} first.`);
        return;
      }

      // Handle no results
      if (result.output.data.chunks.length === 0) {
        writeMessage('');
        writeMessage(formatDim('No relevant context found for this query.'));
        writeMessage(formatDim('Try a different query or add more sources.'));
        writeMessage('');
        return;
      }

      // Output the formatted text
      writeData(result.output.text);
    } finally {
      db.close();
    }
  });
