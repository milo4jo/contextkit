/**
 * Logout Command
 *
 * Remove stored credentials.
 */

import { Command } from 'commander';
import { deleteCredentials, isLoggedIn } from '../../auth/credentials.js';
import { writeSuccess, writeMessage } from '../../utils/streams.js';

export const logoutCommand = new Command('logout')
  .description('Sign out of ContextKit Cloud')
  .action(async () => {
    if (!isLoggedIn()) {
      writeMessage('Not logged in.');
      return;
    }

    const deleted = deleteCredentials();
    if (deleted) {
      writeSuccess('Logged out successfully.');
    } else {
      writeMessage('Already logged out.');
    }
  });
