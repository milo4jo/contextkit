/**
 * Login Command
 *
 * Authenticate with ContextKit Cloud using an API key.
 */

import { Command } from 'commander';
import {
  saveCredentials,
  getCredentialsPath,
  isLoggedIn,
  getApiUrl,
} from '../../auth/credentials.js';
import { apiRequest } from '../../auth/api-client.js';
import { writeSuccess, writeError, writeMessage } from '../../utils/streams.js';
import { formatPath, formatBold, formatCommand } from '../../utils/format.js';

export const loginCommand = new Command('login')
  .description('Authenticate with ContextKit Cloud')
  .option('-k, --api-key <key>', 'API key (or enter interactively)')
  .action(async (options) => {
    // Check if already logged in
    if (isLoggedIn() && !options.apiKey) {
      writeMessage(
        `Already logged in. Run ${formatCommand('contextkit cloud logout')} to sign out.`
      );
      writeMessage(`Or provide a new key with ${formatCommand('--api-key')}`);
      return;
    }

    let apiKey = options.apiKey;

    // Interactive prompt if no key provided
    if (!apiKey) {
      writeMessage(formatBold('ContextKit Cloud Login'));
      writeMessage('');
      writeMessage('Get your API key from:');
      writeMessage(`  ${getApiUrl()}/dashboard/api-keys`);
      writeMessage('');

      // Use readline for interactive input
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      apiKey = await new Promise<string>((resolve) => {
        rl.question('API Key: ', (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });
    }

    if (!apiKey) {
      writeError('No API key provided');
      process.exit(1);
    }

    // Validate key by making a test request
    writeMessage('Validating API key...');

    try {
      // Temporarily set the key to test it
      process.env.CONTEXTKIT_API_KEY = apiKey;

      await apiRequest<{ usage: unknown }>('/api/v1/usage');

      // Key is valid, save it
      saveCredentials(apiKey);

      writeSuccess('Logged in successfully!');
      writeMessage(`Credentials saved to ${formatPath(getCredentialsPath())}`);
      writeMessage('');
      writeMessage(formatBold('Next steps:'));
      writeMessage(`  ${formatCommand('contextkit cloud sync')}   # Upload your index`);
      writeMessage(`  ${formatCommand('contextkit cloud status')} # Check sync status`);
    } catch (error) {
      // Clear the temp key
      delete process.env.CONTEXTKIT_API_KEY;

      if (error instanceof Error && error.message.includes('Unauthorized')) {
        writeError('Invalid API key. Please check and try again.');
      } else {
        writeError(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      process.exit(1);
    }
  });
