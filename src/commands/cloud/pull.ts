/**
 * Pull Command
 *
 * Download index from ContextKit Cloud.
 */

import { Command } from 'commander';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { isLoggedIn } from '../../auth/credentials.js';
import {
  apiRequest,
  downloadFile,
  UnauthorizedError,
  type ProjectListResponse,
  type DownloadResponse,
} from '../../auth/api-client.js';
import { writeSuccess, writeError, writeMessage, writeWarning } from '../../utils/streams.js';
import { formatBold, formatCommand, formatBytes } from '../../utils/format.js';
import { INDEX_DB } from '../../config/index.js';

export const pullCommand = new Command('pull')
  .description('Download index from ContextKit Cloud')
  .option('-p, --project <name>', 'Project name or slug')
  .option('-f, --force', 'Overwrite existing index')
  .action(async (options) => {
    // Check login
    if (!isLoggedIn()) {
      writeError('Not logged in. Run `contextkit cloud login` first.');
      process.exit(1);
    }

    const cwd = process.cwd();
    const contextKitDir = join(cwd, '.contextkit');
    const indexPath = join(contextKitDir, INDEX_DB);
    const projectName = options.project || basename(cwd);

    // Check for existing index
    if (existsSync(indexPath) && !options.force) {
      writeWarning('Local index already exists. Use --force to overwrite.');
      process.exit(1);
    }

    writeMessage(`Pulling ${formatBold(projectName)}...`);

    try {
      // Find project
      const projectsResponse = await apiRequest<ProjectListResponse>('/api/v1/projects');

      const project = projectsResponse.projects.find(
        (p) =>
          p.name === projectName ||
          p.slug === projectName ||
          p.slug === projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      );

      if (!project) {
        writeError(`Project not found: ${projectName}`);
        writeMessage('');
        writeMessage('Available projects:');
        for (const p of projectsResponse.projects) {
          writeMessage(`  - ${p.name} (${p.slug})`);
        }
        process.exit(1);
      }

      // Get download URL
      const downloadResponse = await apiRequest<DownloadResponse>(
        `/api/v1/projects/${project.id}/sync`
      );

      if (!downloadResponse.index.exists) {
        writeError('No index found for this project. Run `contextkit cloud sync` first.');
        process.exit(1);
      }

      // Ensure .contextkit directory exists
      if (!existsSync(contextKitDir)) {
        mkdirSync(contextKitDir, { recursive: true });
      }

      // Download index
      writeMessage(`Downloading ${formatBytes(downloadResponse.index.size || 0)}...`);

      // Remove existing index if force
      if (existsSync(indexPath)) {
        unlinkSync(indexPath);
      }

      await downloadFile(downloadResponse.downloadUrl, indexPath);

      writeSuccess('Pull complete!');
      writeMessage('');
      writeMessage(`  Project:  ${formatBold(project.name)}`);
      writeMessage(`  Version:  ${downloadResponse.index.version}`);
      writeMessage(`  Size:     ${formatBytes(downloadResponse.index.size || 0)}`);
      writeMessage(`  Synced:   ${downloadResponse.index.lastSynced ? new Date(downloadResponse.index.lastSynced).toLocaleString() : 'Unknown'}`);
      writeMessage('');
      writeMessage('Now you can run:');
      writeMessage(`  ${formatCommand('contextkit select "your query"')}`);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        writeError('Session expired. Run `contextkit cloud login` again.');
      } else if (error instanceof Error) {
        writeError(`Pull failed: ${error.message}`);
      } else {
        writeError('Pull failed');
      }
      process.exit(1);
    }
  });
