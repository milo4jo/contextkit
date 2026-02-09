/**
 * ContextKit API Client for Dashboard
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.contextkit.dev";

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  apiKey?: string;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = "GET", body, apiKey } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${API_URL}/v1${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(response.status, error.detail || error.message);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Projects
export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  index_status: {
    files: number;
    chunks: number;
    last_indexed: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectList {
  projects: Project[];
  total: number;
  limit: number;
  offset: number;
}

export async function listProjects(apiKey: string): Promise<ProjectList> {
  return apiRequest<ProjectList>("/projects", { apiKey });
}

export async function getProject(apiKey: string, projectId: string): Promise<Project> {
  return apiRequest<Project>(`/projects/${projectId}`, { apiKey });
}

export async function createProject(
  apiKey: string,
  data: { name: string; description?: string }
): Promise<Project> {
  return apiRequest<Project>("/projects", {
    method: "POST",
    body: data,
    apiKey,
  });
}

export async function deleteProject(apiKey: string, projectId: string): Promise<void> {
  return apiRequest<void>(`/projects/${projectId}`, {
    method: "DELETE",
    apiKey,
  });
}

// Context
export interface SelectResponse {
  context: string;
  chunks: Array<{
    file: string;
    start_line: number;
    end_line: number;
    content: string;
    score: number;
  }>;
  metadata: {
    tokens_used: number;
    files_included: number;
    processing_time_ms: number;
    cache_hit: boolean;
  };
}

export async function selectContext(
  apiKey: string,
  data: {
    query: string;
    project_id: string;
    budget?: number;
    mode?: "full" | "map";
    format?: "markdown" | "xml" | "json" | "plain";
  }
): Promise<SelectResponse> {
  return apiRequest<SelectResponse>("/context/select", {
    method: "POST",
    body: data,
    apiKey,
  });
}

// Usage
export interface UsageStats {
  period: {
    start: string;
    end: string;
  };
  queries: {
    used: number;
    limit: number | null;
  };
  tokens: {
    used: number;
  };
  storage: {
    used_bytes: number;
    limit_bytes: number | null;
  };
  plan: string;
}

export async function getUsage(apiKey: string): Promise<UsageStats> {
  return apiRequest<UsageStats>("/usage", { apiKey });
}

export { ApiError };
