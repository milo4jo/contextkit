/**
 * Sync Command
 *
 * Upload local index to ContextKit Cloud.
 */

import { Command } from 'commander';
import { existsSync, statSync } from 'fs';
import { join, basename } from 'path';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { isLoggedIn } from '../../auth/credentials.js';
import {
  apiRequest,
  uploadFile,
  UnauthorizedError,
  type ProjectListResponse,
  type SyncResponse,
} from '../../auth/api-client.js';
import { writeSuccess, writeError, writeMessage } from '../../utils/streams.js';
import { formatBold, formatCommand, formatBytes } from '../../utils/format.js';
import { INDEX_DB } from '../../config/index.js';

export const syncCommand = new Command('sync')
  .description('Upload index to ContextKit Cloud')
  .option('-n, --name <name>', 'Project name (defaults to directory name)')
  .option('-f, --force', 'Force upload even if unchanged')
  .action(async (options) => {
    // Check login
    if (!isLoggedIn()) {
      writeError('Not logged in. Run `contextkit cloud login` first.');
      process.exit(1);
    }

    // Check for local index
    const cwd = process.cwd();
    const contextKitDir = join(cwd, '.contextkit');
    const indexPath = join(contextKitDir, INDEX_DB);

    if (!existsSync(indexPath)) {
      writeError('No index found. Run `contextkit index` first.');
      process.exit(1);
    }

    const projectName = options.name || basename(cwd);
    writeMessage(`Syncing ${formatBold(projectName)}...`);

    try {
      // Get or create project
      const projectsResponse = await apiRequest<ProjectListResponse>('/api/v1/projects');

      let project = projectsResponse.projects.find(
        (p) => p.name === projectName || p.slug === projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      );

      if (!project) {
        // Check limits
        if (!projectsResponse.limits.canCreateProject) {
          writeError(
            `Project limit reached (${projectsResponse.limits.projectCount}/${projectsResponse.limits.maxProjects}). Upgrade to add more projects.`
          );
          process.exit(1);
        }

        // Create project
        writeMessage('Creating project...');
        const createResponse = await apiRequest<{ project: { id: string; name: string; slug: string } }>(
          '/api/v1/projects',
          {
            method: 'POST',
            body: { name: projectName },
          }
        );
        project = {
          ...createResponse.project,
          createdAt: new Date().toISOString(),
        };
        writeSuccess(`Created project: ${project.name}`);
      }

      // Calculate local hash
      const indexBuffer = readFileSync(indexPath);
      const localHash = createHash('sha256').update(indexBuffer).digest('hex');
      const indexSize = statSync(indexPath).size;

      // Check if upload needed
      if (!options.force && project.indexVersion && project.indexVersion > 0) {
        // Get current cloud hash
        const projectDetails = await apiRequest<{ index: { hash?: string } }>(
          `/api/v1/projects/${project.id}`
        );

        if (projectDetails.index?.hash === localHash) {
          writeMessage('Index is already up to date.');
          writeMessage(`  Version: ${project.indexVersion}`);
          writeMessage(`  Size: ${formatBytes(project.indexSize || 0)}`);
          return;
        }
      }

      // Upload index
      writeMessage(`Uploading ${formatBytes(indexSize)}...`);

      const syncResponse = await uploadFile(
        `/api/v1/projects/${project.id}/sync`,
        indexPath,
        {
          hash: localHash,
        }
      ) as SyncResponse;

      writeSuccess('Sync complete!');
      writeMessage('');
      writeMessage(`  Project:  ${formatBold(syncResponse.project.name)}`);
      writeMessage(`  Version:  ${syncResponse.project.indexVersion}`);
      writeMessage(`  Size:     ${formatBytes(syncResponse.project.indexSize)}`);
      writeMessage(`  Synced:   ${new Date(syncResponse.project.lastSyncedAt).toLocaleString()}`);
      writeMessage('');
      writeMessage(`Pull on another machine with:`);
      writeMessage(`  ${formatCommand(`contextkit cloud pull --project ${project.slug}`)}`);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        writeError('Session expired. Run `contextkit cloud login` again.');
      } else if (error instanceof Error) {
        writeError(`Sync failed: ${error.message}`);
      } else {
        writeError('Sync failed');
      }
      process.exit(1);
    }
  });
