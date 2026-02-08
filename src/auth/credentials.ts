/**
 * Credentials Storage
 *
 * Stores API key for cloud sync in ~/.contextkit/credentials
 * Uses restrictive file permissions (600) for security.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONTEXTKIT_DIR = join(homedir(), '.contextkit');
const CREDENTIALS_FILE = join(CONTEXTKIT_DIR, 'credentials');
const API_URL = process.env.CONTEXTKIT_API_URL || 'https://contextkit-site.vercel.app';

interface Credentials {
  apiKey: string;
  apiUrl: string;
  savedAt: string;
}

/**
 * Ensure the ~/.contextkit directory exists
 */
function ensureDir(): void {
  if (!existsSync(CONTEXTKIT_DIR)) {
    mkdirSync(CONTEXTKIT_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Save credentials to disk
 */
export function saveCredentials(apiKey: string): void {
  ensureDir();

  const credentials: Credentials = {
    apiKey,
    apiUrl: API_URL,
    savedAt: new Date().toISOString(),
  };

  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
    encoding: 'utf-8',
    mode: 0o600, // Owner read/write only
  });

  // Ensure permissions are correct even if file existed
  chmodSync(CREDENTIALS_FILE, 0o600);
}

/**
 * Load credentials from disk
 */
export function loadCredentials(): Credentials | null {
  if (!existsSync(CREDENTIALS_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(content) as Credentials;
  } catch {
    return null;
  }
}

/**
 * Get API key from credentials or environment
 */
export function getApiKey(): string | null {
  // Environment variable takes precedence
  if (process.env.CONTEXTKIT_API_KEY) {
    return process.env.CONTEXTKIT_API_KEY;
  }

  const credentials = loadCredentials();
  return credentials?.apiKey || null;
}

/**
 * Get API URL from credentials or environment
 */
export function getApiUrl(): string {
  if (process.env.CONTEXTKIT_API_URL) {
    return process.env.CONTEXTKIT_API_URL;
  }

  const credentials = loadCredentials();
  return credentials?.apiUrl || API_URL;
}

/**
 * Delete credentials (logout)
 */
export function deleteCredentials(): boolean {
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE);
    return true;
  }
  return false;
}

/**
 * Check if logged in
 */
export function isLoggedIn(): boolean {
  return getApiKey() !== null;
}

/**
 * Get credentials file path (for display)
 */
export function getCredentialsPath(): string {
  return CREDENTIALS_FILE;
}
