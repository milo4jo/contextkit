import chalk from 'chalk';

/**
 * Output utilities for consistent CLI formatting
 */
export const output = {
  /**
   * Print a success message with checkmark
   */
  success(message: string): void {
    console.log(chalk.green('✓') + ' ' + message);
  },

  /**
   * Print an error message
   */
  error(message: string): void {
    console.error(chalk.red('Error:') + ' ' + message);
  },

  /**
   * Print a warning message
   */
  warn(message: string): void {
    console.warn(chalk.yellow('⚠') + ' ' + message);
  },

  /**
   * Print an info message
   */
  info(message: string): void {
    console.log(chalk.blue('ℹ') + ' ' + message);
  },

  /**
   * Print a dim/secondary message
   */
  dim(message: string): void {
    console.log(chalk.dim(message));
  },

  /**
   * Print a heading
   */
  heading(message: string): void {
    console.log();
    console.log(chalk.bold(message));
  },

  /**
   * Print a key-value pair
   */
  keyValue(key: string, value: string): void {
    console.log(`  ${chalk.gray(key + ':')} ${value}`);
  },
};

/**
 * Check if stdout is a TTY (for progress bars, colors, etc.)
 */
export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}

/**
 * Check if colors should be disabled
 */
export function isNoColor(): boolean {
  return process.env.NO_COLOR !== undefined || process.env.TERM === 'dumb';
}
