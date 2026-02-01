import { Command } from 'commander';
import cliProgress from 'cli-progress';
import { loadConfig, ensureInitialized } from '../config/index.js';
import { openDatabase } from '../db/index.js';
import { indexSources, type IndexProgress } from '../indexer/index.js';
import { writeData, writeMessage, writeSuccess, writeWarning, isTTY } from '../utils/streams.js';
import { formatCommand, formatDim, formatHighlight } from '../utils/format.js';
import { getGlobalOpts } from '../utils/cli.js';
import { SourceNotFoundError } from '../errors/index.js';

export const indexCommand = new Command('index')
  .description('Index all sources')
  .option('-s, --source <name>', 'Index only a specific source')
  .action(async (options) => {
    ensureInitialized();

    const config = loadConfig();
    const opts = getGlobalOpts(indexCommand);

    if (config.sources.length === 0) {
      writeWarning('No sources configured');
      writeMessage(`Add sources first with ${formatCommand('contextkit source add <path>')}`);
      process.exit(1);
    }

    // Filter sources if --source specified
    let sourcesToIndex = config.sources;
    if (options.source) {
      const source = config.sources.find((s) => s.id === options.source);
      if (!source) {
        throw new SourceNotFoundError(options.source);
      }
      sourcesToIndex = [source];
    }

    // Open database
    const db = openDatabase();

    try {
      if (!opts.quiet) {
        writeMessage('');
        writeMessage('Indexing sources...');
        writeMessage('');
      }

      // Setup progress bar (only in TTY mode)
      let progressBar: cliProgress.SingleBar | null = null;
      let currentSource = '';
      let currentPhase = '';

      if (isTTY() && !opts.quiet) {
        progressBar = new cliProgress.SingleBar(
          {
            format: `{phase} ${formatHighlight('[{source}]')} {bar} {value}/{total}`,
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true,
          },
          cliProgress.Presets.shades_classic
        );
      }

      // Progress callback
      const onProgress = (progress: IndexProgress) => {
        const phaseLabel = {
          discovery: 'Reading files  ',
          chunking: 'Chunking       ',
          embedding: 'Embedding      ',
          storing: 'Storing        ',
        }[progress.phase];

        if (progressBar) {
          if (currentSource !== progress.sourceId || currentPhase !== progress.phase) {
            if (currentSource) {
              progressBar.stop();
            }
            currentSource = progress.sourceId;
            currentPhase = progress.phase;
            progressBar.start(progress.total || 1, 0, {
              phase: phaseLabel,
              source: progress.sourceId,
            });
          }
          progressBar.update(progress.current);
        } else if (!opts.quiet) {
          // Non-TTY: simple line output
          if (progress.current === progress.total) {
            writeMessage(
              `${phaseLabel} [${progress.sourceId}]: ${progress.current}/${progress.total}`
            );
          }
        }
      };

      // Run indexing
      const stats = await indexSources(
        sourcesToIndex,
        process.cwd(),
        db,
        {
          chunkSize: config.settings.chunk_size,
          chunkOverlap: config.settings.chunk_overlap,
        },
        onProgress
      );

      // Stop progress bar
      if (progressBar) {
        progressBar.stop();
      }

      // Output results
      if (!opts.quiet) {
        writeMessage('');
        const timeStr = (stats.timeMs / 1000).toFixed(1);
        writeSuccess(`Indexed ${stats.chunks} chunks from ${stats.files} files in ${timeStr}s`);

        if (stats.skipped > 0) {
          writeMessage(formatDim(`  (${stats.skipped} files skipped - too large or binary)`));
        }
        writeMessage('');
      }

      // JSON output
      if (opts.json) {
        writeData(
          JSON.stringify(
            {
              status: 'success',
              stats,
            },
            null,
            2
          )
        );
      }
    } finally {
      db.close();
    }
  });
