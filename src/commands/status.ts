import { Command } from 'commander';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { loadConfig } from '../config/index.js';
import { openDatabase, getIndexStats } from '../db/index.js';
import { writeData, writeMessage } from '../utils/streams.js';
import { formatDim, formatBytes } from '../utils/format.js';
import { getGlobalOpts } from '../utils/cli.js';
import { loadCredentials } from '../auth/credentials.js';

export const statusCommand = new Command('status')
  .alias('info')
  .description('Show ContextKit project status')
  .action(async () => {
    const opts = getGlobalOpts(statusCommand);
    const cwd = process.cwd();
    const configPath = resolve(cwd, '.contextkit', 'config.yaml');
    const dbPath = resolve(cwd, '.contextkit', 'index.db');

    // Check if initialized
    const initialized = existsSync(configPath);

    if (opts.json) {
      const status = {
        initialized,
        path: cwd,
        ...(initialized ? getDetailedStatus(dbPath) : {}),
      };
      writeData(JSON.stringify(status, null, 2));
      return;
    }

    writeMessage('');
    writeMessage('📊 ContextKit Status');
    writeMessage('');
    writeMessage(`   Project:      ${formatDim(cwd)}`);
    writeMessage(`   Initialized:  ${initialized ? '✓ Yes' : '✗ No'}`);

    if (!initialized) {
      writeMessage('');
      writeMessage(formatDim('   Run `contextkit init` to get started.'));
      writeMessage('');
      return;
    }

    // Load config
    const config = loadConfig();
    const sources = config.sources || [];
    writeMessage(
      `   Sources:      ${sources.length} (${sources.map((s) => s.id).join(', ') || 'none'})`
    );

    // Get index stats
    if (existsSync(dbPath)) {
      const db = openDatabase();
      try {
        const stats = getIndexStats(db);
        writeMessage('');
        writeMessage('   Index:');
        writeMessage(`     Files:      ${stats.fileCount}`);
        writeMessage(`     Chunks:     ${stats.chunkCount}`);
        writeMessage(
          `     Embedded:   ${stats.embeddedCount}/${stats.chunkCount} (${Math.round((stats.embeddedCount / stats.chunkCount) * 100) || 0}%)`
        );
        writeMessage(`     Size:       ${formatBytes(stats.dbSize)}`);
        if (stats.lastIndexed) {
          writeMessage(`     Updated:    ${formatRelativeTime(stats.lastIndexed)}`);
        }
      } finally {
        db.close();
      }
    } else {
      writeMessage('');
      writeMessage('   Index:        Not built yet');
      writeMessage(formatDim('     Run `contextkit index` to build.'));
    }

    // Check cloud status
    const creds = loadCredentials();
    writeMessage('');
    writeMessage('   Cloud:');
    if (creds) {
      writeMessage(`     Status:     Logged in ✓`);
      writeMessage(`     API Key:    ${creds.apiKey.substring(0, 12)}...`);
    } else {
      writeMessage(`     Status:     Not logged in`);
      writeMessage(formatDim('     Run `contextkit cloud login` to sync.'));
    }

    writeMessage('');
  });

function getDetailedStatus(dbPath: string): Record<string, unknown> {
  if (!existsSync(dbPath)) {
    return { indexed: false };
  }

  const db = openDatabase();
  try {
    const stats = getIndexStats(db);
    const creds = loadCredentials();

    return {
      indexed: true,
      files: stats.fileCount,
      chunks: stats.chunkCount,
      embedded: stats.embeddedCount,
      dbSize: stats.dbSize,
      lastIndexed: stats.lastIndexed,
      cloud: creds ? { loggedIn: true } : { loggedIn: false },
    };
  } finally {
    db.close();
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
}
