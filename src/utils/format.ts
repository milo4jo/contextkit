/**
 * Formatting utilities for CLI output
 *
 * Centralized formatting functions to avoid duplication.
 */

import chalk from 'chalk';
import { shouldUseColor } from './streams.js';

/**
 * Format a command for display
 */
export function formatCommand(cmd: string): string {
  return shouldUseColor() ? chalk.cyan(cmd) : `'${cmd}'`;
}

/**
 * Format a path for display
 */
export function formatPath(path: string): string {
  return shouldUseColor() ? chalk.cyan(path) : path;
}

/**
 * Format highlighted text
 */
export function formatHighlight(text: string): string {
  return shouldUseColor() ? chalk.cyan(text) : text;
}

/**
 * Format bold text
 */
export function formatBold(text: string): string {
  return shouldUseColor() ? chalk.bold(text) : text;
}

/**
 * Format dim/secondary text
 */
export function formatDim(text: string): string {
  return shouldUseColor() ? chalk.gray(text) : text;
}

/**
 * Format gray text (alias for formatDim)
 */
export function formatGray(text: string): string {
  return formatDim(text);
}

/**
 * Format bytes as human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}
