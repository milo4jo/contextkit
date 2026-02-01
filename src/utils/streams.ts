/**
 * Stream utilities for proper stdout/stderr separation
 *
 * Based on CLI-DESIGN.md:
 * - stdout: Primary output (results, data)
 * - stderr: Progress, logs, errors, prompts
 */

import chalk from 'chalk';

/**
 * Check if stdout is a TTY
 */
export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}

/**
 * Check if colors should be disabled
 */
export function shouldUseColor(): boolean {
  return process.env.NO_COLOR === undefined && process.env.TERM !== 'dumb' && isTTY();
}

/**
 * Write data to stdout (for results, JSON, lists)
 */
export function writeData(data: string): void {
  process.stdout.write(data + '\n');
}

/**
 * Write message to stderr (for progress, logs, info)
 */
export function writeMessage(message: string): void {
  process.stderr.write(message + '\n');
}

/**
 * Write error to stderr
 */
export function writeError(message: string): void {
  const prefix = shouldUseColor() ? chalk.red('Error:') : 'Error:';
  process.stderr.write(`${prefix} ${message}\n`);
}

/**
 * Write success message to stderr
 */
export function writeSuccess(message: string): void {
  const prefix = shouldUseColor() ? chalk.green('✓') : '✓';
  process.stderr.write(`${prefix} ${message}\n`);
}

/**
 * Write warning to stderr
 */
export function writeWarning(message: string): void {
  const prefix = shouldUseColor() ? chalk.yellow('⚠') : '⚠';
  process.stderr.write(`${prefix} ${message}\n`);
}

/**
 * Write info to stderr
 */
export function writeInfo(message: string): void {
  const prefix = shouldUseColor() ? chalk.blue('ℹ') : 'ℹ';
  process.stderr.write(`${prefix} ${message}\n`);
}
