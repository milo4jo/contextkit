/**
 * Cloud Commands
 *
 * Commands for ContextKit Cloud sync.
 */

import { Command } from 'commander';
import { loginCommand } from './login.js';
import { logoutCommand } from './logout.js';
import { syncCommand } from './sync.js';
import { pullCommand } from './pull.js';
import { statusCommand } from './status.js';

export const cloudCommand = new Command('cloud')
  .description('ContextKit Cloud sync commands')
  .addCommand(loginCommand)
  .addCommand(logoutCommand)
  .addCommand(syncCommand)
  .addCommand(pullCommand)
  .addCommand(statusCommand);
