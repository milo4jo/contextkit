/**
 * CLI utilities
 *
 * Helper functions for CLI commands.
 */

import type { Command } from 'commander';

/** Global CLI options */
export interface GlobalOpts {
  json?: boolean;
  plain?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}

/**
 * Get global options from command hierarchy
 *
 * Traverses up the command tree to find the root program's options.
 */
export function getGlobalOpts(command: Command): GlobalOpts {
  let current: Command | null = command;

  // Walk up to root
  while (current?.parent) {
    current = current.parent;
  }

  return current?.opts() || {};
}
