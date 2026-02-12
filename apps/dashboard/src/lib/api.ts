/**
 * ContextKit API Client
 *
 * Handles all API calls from the dashboard to the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://contextkit-api.milo4jo.workers.dev';

interface ApiOptions {
  token?: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function apiCall<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { token, method = 'GET', body } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/dashboard${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// === User / Organization ===

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
}

export interface MeResponse {
  user: User;
  organization: Organization;
}

export async function getMe(token: string): Promise<MeResponse> {
  return apiCall('/me', { token });
}

// === Projects ===

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  indexStatus: {
    files: number;
    chunks: number;
    lastIndexed: string | null;
    status: 'pending' | 'indexing' | 'indexed' | 'failed';
  };
}

export interface ProjectsResponse {
  projects: Project[];
}

export async function getProjects(token: string): Promise<ProjectsResponse> {
  return apiCall('/projects', { token });
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export async function createProject(
  token: string,
  data: CreateProjectInput
): Promise<{ project: Project }> {
  return apiCall('/projects', { token, method: 'POST', body: data });
}

export async function getProject(token: string, slug: string): Promise<{ project: Project }> {
  return apiCall(`/projects/${slug}`, { token });
}

export async function deleteProject(token: string, slug: string): Promise<{ success: boolean }> {
  return apiCall(`/projects/${slug}`, { token, method: 'DELETE' });
}

// === API Keys ===

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ApiKeysResponse {
  apiKeys: ApiKey[];
}

export async function getApiKeys(token: string): Promise<ApiKeysResponse> {
  return apiCall('/api-keys', { token });
}

export interface CreateApiKeyInput {
  name: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey & { key: string }; // Full key only on creation
}

export async function createApiKey(
  token: string,
  data: CreateApiKeyInput
): Promise<CreateApiKeyResponse> {
  return apiCall('/api-keys', { token, method: 'POST', body: data });
}

export async function deleteApiKey(token: string, id: string): Promise<{ success: boolean }> {
  return apiCall(`/api-keys/${id}`, { token, method: 'DELETE' });
}

// === Usage ===

export interface UsageResponse {
  usage: {
    queries: { used: number; limit: number };
    storage: { used: number; limit: number };
    tokens: { used: number };
  };
  plan: string;
}

export async function getUsage(token: string): Promise<UsageResponse> {
  return apiCall('/usage', { token });
}
