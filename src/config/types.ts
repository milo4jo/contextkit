/**
 * Configuration types for ContextKit
 */

export interface Source {
  id: string;
  path: string;
  patterns: {
    include: string[];
    exclude: string[];
  };
}

export interface Settings {
  chunk_size: number;
  chunk_overlap: number;
}

export interface Config {
  version: number;
  sources: Source[];
  settings: Settings;
}
