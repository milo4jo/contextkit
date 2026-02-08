/**
 * Cloud API Client
 *
 * HTTP client for ContextKit Cloud API.
 */

import { getApiKey, getApiUrl } from './credentials.js';
import { readFileSync } from 'fs';
import { basename } from 'path';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Not logged in. Run `contextkit login` first.') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new UnauthorizedError();
  }

  const apiUrl = getApiUrl();
  const url = `${apiUrl}${path}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json() as { message?: string; error?: string };

  if (!response.ok) {
    throw new ApiError(
      data.message || data.error || 'API request failed',
      response.status,
      data
    );
  }

  return data as T;
}

/**
 * Upload file to API
 */
export async function uploadFile(
  path: string,
  filePath: string,
  metadata: Record<string, string | number> = {}
): Promise<unknown> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new UnauthorizedError();
  }

  const apiUrl = getApiUrl();
  const url = `${apiUrl}${path}`;

  // Read file
  const fileBuffer = readFileSync(filePath);

  // Create form data manually (Node.js native)
  const boundary = `----ContextKit${Date.now()}`;
  const fileName = basename(filePath);

  // Build multipart body
  let body = '';

  // Add metadata fields
  for (const [key, value] of Object.entries(metadata)) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
    body += `${value}\r\n`;
  }

  // Add file field header
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
  body += `Content-Type: application/octet-stream\r\n\r\n`;

  // Combine parts
  const header = Buffer.from(body, 'utf-8');
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  const fullBody = Buffer.concat([header, fileBuffer, footer]);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': fullBody.length.toString(),
    },
    body: fullBody,
  });

  const data = await response.json() as { message?: string; error?: string };

  if (!response.ok) {
    throw new ApiError(
      data.message || data.error || 'Upload failed',
      response.status,
      data
    );
  }

  return data;
}

/**
 * Download file from URL
 */
export async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new ApiError('Download failed', response.status);
  }

  const buffer = await response.arrayBuffer();
  const { writeFileSync } = await import('fs');
  writeFileSync(destPath, Buffer.from(buffer));
}

// Type definitions for API responses
export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  indexSize?: number;
  indexVersion?: number;
  fileCount?: number;
  chunkCount?: number;
  lastSyncedAt?: string;
  createdAt: string;
}

export interface ProjectListResponse {
  projects: Project[];
  limits: {
    projectCount: number;
    maxProjects: number;
    canCreateProject: boolean;
  };
}

export interface SyncResponse {
  success: boolean;
  project: {
    id: string;
    name: string;
    indexSize: number;
    indexVersion: number;
    indexHash: string;
    lastSyncedAt: string;
  };
  blobUrl: string;
}

export interface IndexMetadata {
  exists: boolean;
  hash?: string;
  size?: number;
  version?: number;
  lastSynced?: string;
}

export interface DownloadResponse {
  downloadUrl: string;
  index: IndexMetadata;
}
