/**
 * Type definitions for ContextKit API
 */

// Cloudflare Workers environment bindings
export interface Env {
  // Secrets
  DATABASE_URL: string;
  QDRANT_URL: string;
  QDRANT_API_KEY: string;
  OPENAI_API_KEY: string;
  UPSTASH_REDIS_URL: string;
  UPSTASH_REDIS_TOKEN: string;

  // Variables
  ENVIRONMENT: "development" | "staging" | "production";

  // Bindings
  STORAGE: R2Bucket;
  CACHE: KVNamespace;
}

// Request context variables
export interface Variables {
  orgId: string;
  userId?: string;
  apiKeyId: string;
  plan: Plan;
  requestId: string;
}

// Plans
export type Plan = "free" | "pro" | "team" | "enterprise";

// Plan limits
export const PLAN_LIMITS: Record<
  Plan,
  {
    requestsPerMinute: number;
    queriesPerMonth: number | null; // null = unlimited
    projectsLimit: number | null;
    storageBytes: number | null;
  }
> = {
  free: {
    requestsPerMinute: 20,
    queriesPerMonth: 1000,
    projectsLimit: 1,
    storageBytes: 100 * 1024 * 1024, // 100 MB
  },
  pro: {
    requestsPerMinute: 100,
    queriesPerMonth: 50000,
    projectsLimit: 5,
    storageBytes: 1024 * 1024 * 1024, // 1 GB
  },
  team: {
    requestsPerMinute: 500,
    queriesPerMonth: null,
    projectsLimit: null,
    storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
  },
  enterprise: {
    requestsPerMinute: 1000,
    queriesPerMonth: null,
    projectsLimit: null,
    storageBytes: null,
  },
};

// Database models
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSettings {
  chunkSize?: number;
  chunkOverlap?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  projectIds: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface IndexedFile {
  id: string;
  projectId: string;
  filePath: string;
  contentHash: string;
  chunkCount: number;
  indexedAt: Date;
}

// API request/response types
export interface SelectRequest {
  query: string;
  project_id: string;
  budget?: number;
  include_imports?: boolean;
  mode?: "full" | "map";
  format?: "markdown" | "xml" | "json" | "plain";
  sources?: string[];
}

export interface SelectResponse {
  context: string;
  chunks: Chunk[];
  metadata: {
    tokens_used: number;
    files_included: number;
    processing_time_ms: number;
    cache_hit: boolean;
  };
}

export interface Chunk {
  file: string;
  start_line: number;
  end_line: number;
  content: string;
  score: number;
  symbols?: string[];
}

export interface SyncRequest {
  project_id: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  incremental?: boolean;
}

export interface SyncJob {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: {
    files_total: number;
    files_processed: number;
    chunks_created: number;
  };
  error?: string;
  created_at: string;
  completed_at?: string;
}

// Error types
export class ApiError extends Error {
  constructor(
    public status: number,
    public type: string,
    public title: string,
    public detail: string
  ) {
    super(detail);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      type: `https://contextkit.dev/errors/${this.type}`,
      title: this.title,
      status: this.status,
      detail: this.detail,
    };
  }
}

export class BadRequestError extends ApiError {
  constructor(detail: string) {
    super(400, "bad-request", "Bad Request", detail);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(detail = "Invalid or missing API key") {
    super(401, "unauthorized", "Unauthorized", detail);
  }
}

export class ForbiddenError extends ApiError {
  constructor(detail = "Access denied") {
    super(403, "forbidden", "Forbidden", detail);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, "not-found", "Not Found", `${resource} not found`);
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter: number) {
    super(
      429,
      "rate-limited",
      "Too Many Requests",
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`
    );
  }
}

export class ConflictError extends ApiError {
  constructor(detail: string) {
    super(409, "conflict", "Conflict", detail);
  }
}
