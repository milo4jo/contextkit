import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parse, stringify } from 'yaml';
import { NotInitializedError } from '../errors/index.js';
import type { Config } from './types.js';

export const CONFIG_FILE = 'config.yaml';
export const INDEX_DB = 'index.db';
export const CONTEXTKIT_DIR = '.contextkit';

/**
 * Get the .contextkit directory path
 */
export function getContextKitDir(): string {
  return join(process.cwd(), CONTEXTKIT_DIR);
}

/**
 * Get the config file path
 */
export function getConfigPath(): string {
  return join(getContextKitDir(), CONFIG_FILE);
}

/**
 * Get the database file path
 */
export function getDbPath(): string {
  return join(getContextKitDir(), INDEX_DB);
}

/**
 * Check if ContextKit is initialized in the current directory
 */
export function isInitialized(): boolean {
  return existsSync(getContextKitDir()) && existsSync(getConfigPath());
}

/**
 * Ensure ContextKit is initialized, throw if not
 */
export function ensureInitialized(): void {
  if (!isInitialized()) {
    throw new NotInitializedError();
  }
}

/**
 * Load the configuration file
 */
export function loadConfig(): Config {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const content = readFileSync(configPath, 'utf-8');
  const config = parse(content) as Config;

  // Ensure sources array exists
  if (!config.sources) {
    config.sources = [];
  }

  return config;
}

/**
 * Save the configuration file
 */
export function saveConfig(config: Config): void {
  const configPath = getConfigPath();
  const content = stringify(config, { lineWidth: 0 });
  writeFileSync(configPath, content);
}

/**
 * Get the default configuration as YAML string
 */
export function getDefaultConfig(): string {
  const config: Config = {
    version: 1,
    sources: [],
    settings: {
      chunk_size: 500,
      chunk_overlap: 50,
    },
  };

  return `# ContextKit Configuration
# https://github.com/milo4jo/contextkit

version: ${config.version}

# Sources to index
sources: []
# Example:
#   - id: src
#     path: ./src
#     patterns:
#       include:
#         - "**/*.ts"
#         - "**/*.js"
#       exclude:
#         - "**/node_modules/**"
#         - "**/*.test.ts"

# Chunking settings
settings:
  chunk_size: ${config.settings.chunk_size}
  chunk_overlap: ${config.settings.chunk_overlap}
`;
}

export type { Config, Source, Settings } from './types.js';
