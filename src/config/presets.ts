/**
 * Config presets for common project types
 * These provide optimized starting configurations
 */

export interface PresetConfig {
  name: string;
  description: string;
  sources: Array<{
    id: string;
    path: string;
    patterns: {
      include: string[];
      exclude: string[];
    };
  }>;
  settings: {
    chunk_size: number;
    chunk_overlap: number;
  };
}

export const PRESETS: Record<string, PresetConfig> = {
  react: {
    name: 'React / Next.js',
    description: 'Optimized for React and Next.js projects',
    sources: [
      {
        id: 'app',
        path: './src',
        patterns: {
          include: [
            '**/*.ts',
            '**/*.tsx',
            '**/*.js',
            '**/*.jsx',
            '**/*.css',
          ],
          exclude: [
            '**/node_modules/**',
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.spec.ts',
            '**/*.spec.tsx',
            '**/__tests__/**',
            '**/__mocks__/**',
          ],
        },
      },
    ],
    settings: {
      chunk_size: 400,
      chunk_overlap: 50,
    },
  },

  node: {
    name: 'Node.js / TypeScript',
    description: 'Optimized for Node.js and TypeScript projects',
    sources: [
      {
        id: 'src',
        path: './src',
        patterns: {
          include: ['**/*.ts', '**/*.js', '**/*.mts', '**/*.mjs'],
          exclude: [
            '**/node_modules/**',
            '**/*.test.ts',
            '**/*.spec.ts',
            '**/__tests__/**',
            '**/dist/**',
          ],
        },
      },
    ],
    settings: {
      chunk_size: 500,
      chunk_overlap: 50,
    },
  },

  python: {
    name: 'Python',
    description: 'Optimized for Python projects',
    sources: [
      {
        id: 'src',
        path: './src',
        patterns: {
          include: ['**/*.py'],
          exclude: [
            '**/__pycache__/**',
            '**/.venv/**',
            '**/venv/**',
            '**/.env/**',
            '**/test_*.py',
            '**/*_test.py',
            '**/tests/**',
          ],
        },
      },
    ],
    settings: {
      chunk_size: 400,
      chunk_overlap: 40,
    },
  },

  monorepo: {
    name: 'Monorepo',
    description: 'Optimized for monorepo structures (packages/*, apps/*)',
    sources: [
      {
        id: 'packages',
        path: './packages',
        patterns: {
          include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/*.test.*',
            '**/*.spec.*',
            '**/__tests__/**',
          ],
        },
      },
      {
        id: 'apps',
        path: './apps',
        patterns: {
          include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.next/**',
            '**/*.test.*',
            '**/*.spec.*',
            '**/__tests__/**',
          ],
        },
      },
    ],
    settings: {
      chunk_size: 450,
      chunk_overlap: 50,
    },
  },

  fullstack: {
    name: 'Full Stack',
    description: 'For full-stack apps with frontend and API',
    sources: [
      {
        id: 'frontend',
        path: './src',
        patterns: {
          include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.css'],
          exclude: [
            '**/node_modules/**',
            '**/*.test.*',
            '**/*.spec.*',
            '**/__tests__/**',
          ],
        },
      },
      {
        id: 'api',
        path: './api',
        patterns: {
          include: ['**/*.ts', '**/*.js'],
          exclude: ['**/node_modules/**', '**/*.test.*'],
        },
      },
    ],
    settings: {
      chunk_size: 450,
      chunk_overlap: 50,
    },
  },
};

/**
 * Get a preset by name
 */
export function getPreset(name: string): PresetConfig | undefined {
  return PRESETS[name.toLowerCase()];
}

/**
 * Get all available preset names
 */
export function getPresetNames(): string[] {
  return Object.keys(PRESETS);
}

/**
 * Get preset descriptions for display
 */
export function getPresetList(): Array<{ name: string; description: string }> {
  return Object.entries(PRESETS).map(([name, preset]) => ({
    name,
    description: preset.description,
  }));
}

/**
 * Generate YAML config string from a preset
 */
export function presetToYaml(preset: PresetConfig): string {
  const sourcesYaml = preset.sources
    .map(
      (source) => `  - id: ${source.id}
    path: ${source.path}
    patterns:
      include:
${source.patterns.include.map((p) => `        - "${p}"`).join('\n')}
      exclude:
${source.patterns.exclude.map((p) => `        - "${p}"`).join('\n')}`
    )
    .join('\n');

  return `# ContextKit Configuration
# Preset: ${preset.name}
# ${preset.description}
# https://github.com/milo4jo/contextkit

version: 1

# Sources to index
sources:
${sourcesYaml}

# Chunking settings (optimized for ${preset.name})
settings:
  chunk_size: ${preset.settings.chunk_size}
  chunk_overlap: ${preset.settings.chunk_overlap}
`;
}
