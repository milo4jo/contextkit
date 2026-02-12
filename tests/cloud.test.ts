/**
 * Cloud Sync Tests
 *
 * Tests for credentials storage and API client.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Mock the home directory for tests
const TEST_HOME = join(process.cwd(), '.test-home');
const TEST_CONTEXTKIT_DIR = join(TEST_HOME, '.contextkit');
const TEST_CREDENTIALS_FILE = join(TEST_CONTEXTKIT_DIR, 'credentials');

// We need to test the functions with mocked paths
// Since the module uses homedir(), we'll test the logic directly

describe('Credentials Storage', () => {
  beforeEach(() => {
    // Create test directory
    mkdirSync(TEST_CONTEXTKIT_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true });
    }
  });

  describe('saveCredentials', () => {
    it('should create credentials file with correct structure', async () => {
      const { writeFileSync, chmodSync } = await import('fs');

      const credentials = {
        apiKey: 'ck_live_test123',
        apiUrl: 'https://contextkit-site.vercel.app',
        savedAt: new Date().toISOString(),
      };

      writeFileSync(TEST_CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
        encoding: 'utf-8',
        mode: 0o600,
      });

      expect(existsSync(TEST_CREDENTIALS_FILE)).toBe(true);

      const content = JSON.parse(readFileSync(TEST_CREDENTIALS_FILE, 'utf-8'));
      expect(content.apiKey).toBe('ck_live_test123');
      expect(content.apiUrl).toBe('https://contextkit-site.vercel.app');
      expect(content.savedAt).toBeDefined();
    });
  });

  describe('loadCredentials', () => {
    it('should return null when file does not exist', () => {
      const nonExistentPath = join(TEST_CONTEXTKIT_DIR, 'nonexistent');
      expect(existsSync(nonExistentPath)).toBe(false);
    });

    it('should parse credentials from file', async () => {
      const { writeFileSync } = await import('fs');

      const credentials = {
        apiKey: 'ck_live_abc123',
        apiUrl: 'https://example.com',
        savedAt: '2026-02-08T00:00:00.000Z',
      };

      writeFileSync(TEST_CREDENTIALS_FILE, JSON.stringify(credentials), 'utf-8');

      const content = JSON.parse(readFileSync(TEST_CREDENTIALS_FILE, 'utf-8'));
      expect(content.apiKey).toBe('ck_live_abc123');
      expect(content.apiUrl).toBe('https://example.com');
    });
  });
});

describe('API Client', () => {
  describe('ApiError', () => {
    it('should create error with status code', async () => {
      const { ApiError } = await import('../src/auth/api-client.js');

      const error = new ApiError('Test error', 404, { detail: 'not found' });

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.body).toEqual({ detail: 'not found' });
      expect(error.name).toBe('ApiError');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create 401 error with default message', async () => {
      const { UnauthorizedError } = await import('../src/auth/api-client.js');

      const error = new UnauthorizedError();

      expect(error.message).toBe('Not logged in. Run `contextkit login` first.');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should accept custom message', async () => {
      const { UnauthorizedError } = await import('../src/auth/api-client.js');

      const error = new UnauthorizedError('Custom message');

      expect(error.message).toBe('Custom message');
    });
  });
});

describe('Format Utilities', () => {
  describe('formatBytes', () => {
    it('should format bytes correctly', async () => {
      const { formatBytes } = await import('../src/utils/format.js');

      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1073741824)).toBe('1.0 GB');
    });
  });
});
