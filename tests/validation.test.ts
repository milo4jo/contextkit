/**
 * Config Validation Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { validateConfig, formatValidationResults } from '../src/config/validation.js';
import type { Config } from '../src/config/types.js';

// Temp directory for tests
const TEST_DIR = join(process.cwd(), '.test-validation');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

function createValidConfig(): Config {
  return {
    version: 1,
    sources: [
      {
        id: 'src',
        path: './src',
        patterns: {
          include: ['**/*.ts'],
          exclude: ['**/node_modules/**'],
        },
      },
    ],
    settings: {
      chunk_size: 500,
      chunk_overlap: 50,
    },
  };
}

describe('validateConfig', () => {
  describe('version validation', () => {
    it('should accept valid version number', () => {
      const config = createValidConfig();
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(true);
    });

    it('should reject missing version', () => {
      const config = { ...createValidConfig(), version: undefined as unknown as number };
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ path: 'version' }));
    });
  });

  describe('sources validation', () => {
    it('should accept valid sources', () => {
      const config = createValidConfig();
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(true);
    });

    it('should reject non-array sources', () => {
      const config = { ...createValidConfig(), sources: 'invalid' as unknown as Config['sources'] };
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ path: 'sources' }));
    });

    it('should reject duplicate source ids', () => {
      const config = createValidConfig();
      config.sources.push({
        id: 'src', // duplicate
        path: './src',
        patterns: { include: ['**/*.js'], exclude: [] },
      });
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('Duplicate') })
      );
    });

    it('should reject missing source id', () => {
      const config = createValidConfig();
      config.sources[0].id = '' as string;
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(false);
    });

    it('should reject non-existent source path', () => {
      const config = createValidConfig();
      config.sources[0].path = './nonexistent';
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('does not exist') })
      );
    });

    it('should reject missing patterns', () => {
      const config = createValidConfig();
      config.sources[0].patterns = undefined as unknown as Config['sources'][0]['patterns'];
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(false);
    });

    it('should reject empty include patterns', () => {
      const config = createValidConfig();
      config.sources[0].patterns.include = [];
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(false);
    });

    it('should warn about missing node_modules exclusion', () => {
      const config = createValidConfig();
      config.sources[0].patterns.exclude = [];
      const result = validateConfig(config, TEST_DIR);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('node_modules') })
      );
    });

    it('should warn about special characters in id', () => {
      const config = createValidConfig();
      config.sources[0].id = 'my source!';
      const result = validateConfig(config, TEST_DIR);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('special characters') })
      );
    });
  });

  describe('settings validation', () => {
    it('should accept valid settings', () => {
      const config = createValidConfig();
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(true);
    });

    it('should warn about missing settings', () => {
      const config = createValidConfig();
      delete (config as Partial<Config>).settings;
      const result = validateConfig(config, TEST_DIR);
      expect(result.warnings).toContainEqual(expect.objectContaining({ path: 'settings' }));
    });

    it('should reject non-number chunk_size', () => {
      const config = createValidConfig();
      config.settings.chunk_size = 'big' as unknown as number;
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(false);
    });

    it('should warn about very small chunk_size', () => {
      const config = createValidConfig();
      config.settings.chunk_size = 10;
      const result = validateConfig(config, TEST_DIR);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('very small') })
      );
    });

    it('should warn about very large chunk_size', () => {
      const config = createValidConfig();
      config.settings.chunk_size = 5000;
      const result = validateConfig(config, TEST_DIR);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('very large') })
      );
    });

    it('should reject negative chunk_overlap', () => {
      const config = createValidConfig();
      config.settings.chunk_overlap = -10;
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(false);
    });

    it('should reject chunk_overlap >= chunk_size', () => {
      const config = createValidConfig();
      config.settings.chunk_overlap = 500; // same as chunk_size
      const result = validateConfig(config, TEST_DIR);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('less than') })
      );
    });
  });
});

describe('formatValidationResults', () => {
  it('should format errors', () => {
    const result = {
      valid: false,
      errors: [{ path: 'test.path', message: 'Test error', suggestion: 'Fix it' }],
      warnings: [],
    };
    const formatted = formatValidationResults(result);
    expect(formatted).toContain('❌ Configuration Errors');
    expect(formatted).toContain('test.path');
    expect(formatted).toContain('Test error');
    expect(formatted).toContain('Fix it');
  });

  it('should format warnings', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [{ path: 'test.path', message: 'Test warning' }],
    };
    const formatted = formatValidationResults(result);
    expect(formatted).toContain('⚠️ Warnings');
    expect(formatted).toContain('Test warning');
  });

  it('should show success for valid config without warnings', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };
    const formatted = formatValidationResults(result);
    expect(formatted).toContain('✅ Configuration is valid');
  });
});
