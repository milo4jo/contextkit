/**
 * Status Command
 *
 * Show cloud sync status.
 */

import { Command } from 'commander';
import { existsSync, statSync } from 'fs';
import { join, basename } from 'path';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { isLoggedIn, getApiUrl } from '../../auth/credentials.js';
import {
  apiRequest,
  UnauthorizedError,
  type ProjectListResponse,
} from '../../auth/api-client.js';
import { writeSuccess, writeError, writeMessage } from '../../utils/streams.js';
import { formatBold, formatBytes, formatCommand } from '../../utils/format.js';
import { INDEX_DB } from '../../config/index.js';

export const statusCommand = new Command('status')
  .description('Show cloud sync status')
  .action(async () => {
    // Check login
    if (!isLoggedIn()) {
      writeMessage(formatBold('Cloud Status'));
      writeMessage('');
      writeMessage('  Status:  Not logged in');
      writeMessage('');
      writeMessage(`Run ${formatCommand('contextkit cloud login')} to get started.`);
      return;
    }

    const cwd = process.cwd();
    const contextKitDir = join(cwd, '.contextkit');
    const indexPath = join(contextKitDir, INDEX_DB);
    const projectName = basename(cwd);

    writeMessage(formatBold('Cloud Status'));
    writeMessage('');

    try {
      // Get projects
      const projectsResponse = await apiRequest<ProjectListResponse>('/api/v1/projects');

      // Check local index
      const hasLocalIndex = existsSync(indexPath);
      let localHash: string | null = null;
      let localSize: number = 0;

      if (hasLocalIndex) {
        const indexBuffer = readFileSync(indexPath);
        localHash = createHash('sha256').update(indexBuffer).digest('hex');
        localSize = statSync(indexPath).size;
      }

      // Find matching project
      const project = projectsResponse.projects.find(
        (p) =>
          p.name === projectName ||
          p.slug === projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      );

      writeMessage(`  Account: Logged in`);
      writeMessage(`  API:     ${getApiUrl()}`);
      writeMessage('');

      // Projects summary
      writeMessage(formatBold('Projects'));
      writeMessage(`  Count:   ${projectsResponse.limits.projectCount}/${projectsResponse.limits.maxProjects}`);
      writeMessage('');

      if (projectsResponse.projects.length === 0) {
        writeMessage('  No projects yet.');
        writeMessage(`  Run ${formatCommand('contextkit cloud sync')} to create one.`);
      } else {
        for (const p of projectsResponse.projects) {
          const isCurrent = p.name === projectName || p.slug === projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const marker = isCurrent ? '→' : ' ';
          const syncStatus = p.lastSyncedAt
            ? new Date(p.lastSyncedAt).toLocaleDateString()
            : 'Never';

          writeMessage(
            `  ${marker} ${p.name} (v${p.indexVersion || 0}) - ${formatBytes(p.indexSize || 0)} - ${syncStatus}`
          );
        }
      }

      writeMessage('');

      // Current project status
      writeMessage(formatBold('Current Directory'));
      writeMessage(`  Name:    ${projectName}`);

      if (!hasLocalIndex) {
        writeMessage('  Local:   No index');
        writeMessage(`  Run ${formatCommand('contextkit index')} to create one.`);
      } else {
        writeMessage(`  Local:   ${formatBytes(localSize)}`);

        if (project) {
          // Compare with cloud
          const projectDetails = await apiRequest<{ index: { hash?: string; version?: number } }>(
            `/api/v1/projects/${project.id}`
          );

          if (projectDetails.index?.hash === localHash) {
            writeSuccess('  Cloud:   ✓ In sync');
          } else if (projectDetails.index?.hash) {
            writeMessage('  Cloud:   ⚠ Out of sync');
            writeMessage(`  Run ${formatCommand('contextkit cloud sync')} to update.`);
          } else {
            writeMessage('  Cloud:   Not synced yet');
            writeMessage(`  Run ${formatCommand('contextkit cloud sync')} to upload.`);
          }
        } else {
          writeMessage('  Cloud:   Not synced');
          writeMessage(`  Run ${formatCommand('contextkit cloud sync')} to create project.`);
        }
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        writeError('Session expired. Run `contextkit cloud login` again.');
      } else if (error instanceof Error) {
        writeError(`Failed to get status: ${error.message}`);
      }
      process.exit(1);
    }
  });
