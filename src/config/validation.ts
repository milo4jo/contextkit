/**
 * Config Validation Module
 *
 * Validates config.yaml and provides helpful error messages.
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import type { Config, Source, Settings } from './types.js';

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/** Validation error (config won't work) */
export interface ValidationError {
  path: string;
  message: string;
  suggestion?: string;
}

/** Validation warning (config might have issues) */
export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

/**
 * Validate the entire config
 */
export function validateConfig(config: Config, baseDir: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate version
  if (typeof config.version !== 'number') {
    errors.push({
      path: 'version',
      message: 'Version must be a number',
      suggestion: 'Set version: 1',
    });
  }

  // Validate sources
  if (!Array.isArray(config.sources)) {
    errors.push({
      path: 'sources',
      message: 'Sources must be an array',
      suggestion: 'Add sources: [] to your config',
    });
  } else {
    // Validate each source
    const sourceIds = new Set<string>();

    for (let i = 0; i < config.sources.length; i++) {
      const source = config.sources[i];
      const sourcePath = `sources[${i}]`;

      const sourceResult = validateSource(source, sourcePath, baseDir, sourceIds);
      errors.push(...sourceResult.errors);
      warnings.push(...sourceResult.warnings);

      if (source.id) {
        sourceIds.add(source.id);
      }
    }
  }

  // Validate settings
  if (config.settings) {
    const settingsResult = validateSettings(config.settings);
    errors.push(...settingsResult.errors);
    warnings.push(...settingsResult.warnings);
  } else {
    warnings.push({
      path: 'settings',
      message: 'Settings not specified, using defaults',
      suggestion: 'Add settings: { chunk_size: 500, chunk_overlap: 50 }',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a source configuration
 */
function validateSource(
  source: Source,
  path: string,
  baseDir: string,
  existingIds: Set<string>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate id
  if (!source.id || typeof source.id !== 'string') {
    errors.push({
      path: `${path}.id`,
      message: 'Source must have a string id',
      suggestion: 'Add id: "src" or similar',
    });
  } else if (existingIds.has(source.id)) {
    errors.push({
      path: `${path}.id`,
      message: `Duplicate source id "${source.id}"`,
      suggestion: 'Each source must have a unique id',
    });
  } else if (!/^[a-zA-Z0-9_-]+$/.test(source.id)) {
    warnings.push({
      path: `${path}.id`,
      message: `Source id "${source.id}" contains special characters`,
      suggestion: 'Use only letters, numbers, dashes, and underscores',
    });
  }

  // Validate path
  if (!source.path || typeof source.path !== 'string') {
    errors.push({
      path: `${path}.path`,
      message: 'Source must have a path',
      suggestion: 'Add path: "./src"',
    });
  } else {
    // Check if path exists
    const absolutePath = resolve(baseDir, source.path);
    if (!existsSync(absolutePath)) {
      errors.push({
        path: `${path}.path`,
        message: `Path "${source.path}" does not exist`,
        suggestion: `Create the directory or fix the path. Looking for: ${absolutePath}`,
      });
    }
  }

  // Validate patterns
  if (!source.patterns) {
    errors.push({
      path: `${path}.patterns`,
      message: 'Source must have patterns',
      suggestion: 'Add patterns: { include: ["**/*.ts"], exclude: ["**/node_modules/**"] }',
    });
  } else {
    // Validate include patterns
    if (!Array.isArray(source.patterns.include) || source.patterns.include.length === 0) {
      errors.push({
        path: `${path}.patterns.include`,
        message: 'Include patterns must be a non-empty array',
        suggestion: 'Add include: ["**/*.ts", "**/*.js"]',
      });
    } else {
      for (const pattern of source.patterns.include) {
        if (typeof pattern !== 'string') {
          errors.push({
            path: `${path}.patterns.include`,
            message: 'Include patterns must be strings',
          });
        }
      }
    }

    // Validate exclude patterns
    if (!Array.isArray(source.patterns.exclude)) {
      warnings.push({
        path: `${path}.patterns.exclude`,
        message: 'Exclude patterns should be an array',
        suggestion: 'Add exclude: ["**/node_modules/**"]',
      });
    } else {
      // Check for common mistakes
      const hasNodeModules = source.patterns.exclude.some((p) => p.includes('node_modules'));
      if (!hasNodeModules) {
        warnings.push({
          path: `${path}.patterns.exclude`,
          message: 'node_modules is not excluded',
          suggestion: 'Add "**/node_modules/**" to exclude patterns',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate settings
 */
function validateSettings(settings: Settings): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate chunk_size
  if (typeof settings.chunk_size !== 'number') {
    errors.push({
      path: 'settings.chunk_size',
      message: 'chunk_size must be a number',
      suggestion: 'Set chunk_size: 500',
    });
  } else if (settings.chunk_size < 50) {
    warnings.push({
      path: 'settings.chunk_size',
      message: `chunk_size ${settings.chunk_size} is very small`,
      suggestion: 'Recommended: 300-800 tokens',
    });
  } else if (settings.chunk_size > 2000) {
    warnings.push({
      path: 'settings.chunk_size',
      message: `chunk_size ${settings.chunk_size} is very large`,
      suggestion: 'Recommended: 300-800 tokens',
    });
  }

  // Validate chunk_overlap
  if (typeof settings.chunk_overlap !== 'number') {
    errors.push({
      path: 'settings.chunk_overlap',
      message: 'chunk_overlap must be a number',
      suggestion: 'Set chunk_overlap: 50',
    });
  } else if (settings.chunk_overlap < 0) {
    errors.push({
      path: 'settings.chunk_overlap',
      message: 'chunk_overlap cannot be negative',
      suggestion: 'Set chunk_overlap: 50',
    });
  } else if (settings.chunk_overlap >= settings.chunk_size) {
    errors.push({
      path: 'settings.chunk_overlap',
      message: 'chunk_overlap must be less than chunk_size',
      suggestion: `Set chunk_overlap to less than ${settings.chunk_size}`,
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Format validation results for display
 */
export function formatValidationResults(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('❌ Configuration Errors:');
    for (const error of result.errors) {
      lines.push(`  • ${error.path}: ${error.message}`);
      if (error.suggestion) {
        lines.push(`    → ${error.suggestion}`);
      }
    }
  }

  if (result.warnings.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('⚠️ Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  • ${warning.path}: ${warning.message}`);
      if (warning.suggestion) {
        lines.push(`    → ${warning.suggestion}`);
      }
    }
  }

  if (result.valid && result.warnings.length === 0) {
    lines.push('✅ Configuration is valid');
  }

  return lines.join('\n');
}
