/**
 * Interactive prompts for CLI
 *
 * Based on CLI-DESIGN.md:
 * - Confirm before destructive actions
 * - Default to safe option (N)
 * - Support --yes to skip
 */

import * as readline from 'readline';
import { isTTY } from './streams.js';

/**
 * Ask for confirmation before a destructive action
 *
 * @param message - The question to ask
 * @param defaultNo - Default to No (safe option)
 * @returns Promise<boolean> - true if confirmed
 */
export async function confirm(message: string, defaultNo = true): Promise<boolean> {
  // If not interactive, default to safe option
  if (!isTTY()) {
    return !defaultNo;
  }

  const suffix = defaultNo ? '[y/N]' : '[Y/n]';

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr, // Prompts go to stderr
  });

  return new Promise((resolve) => {
    rl.question(`${message} ${suffix} `, (answer) => {
      rl.close();

      const normalized = answer.trim().toLowerCase();

      if (normalized === '') {
        resolve(!defaultNo);
        return;
      }

      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

/**
 * Check if --yes flag was passed (skip confirmations)
 */
export function shouldSkipConfirm(options: { yes?: boolean }): boolean {
  return options.yes === true;
}
