/**
 * ContextKit Core
 *
 * Shared types and constants for ContextKit Cloud
 */

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  plan: Plan;
  created_at: number;
  updated_at: number;
}

export type Plan = 'free' | 'pro' | 'team' | 'enterprise';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  created_at: number;
  updated_at: number;
}

export interface Snapshot {
  id: string;
  project_id: string;
  version: number;
  storage_key: string;
  size_bytes: number;
  chunk_count: number;
  file_count: number;
  checksum: string | null;
  created_at: number;
}

export interface IndexManifest {
  version: 1;
  metadata: {
    project_name: string;
    created_at: string;
    cli_version: string;
    chunk_count: number;
    file_count: number;
    total_tokens: number;
  };
  config: Record<string, unknown>;
  chunks: ChunkReference[];
}

export interface ChunkReference {
  id: string;
  file_path: string;
  checksum: string;
  start_line: number;
  end_line: number;
  token_count: number;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  scopes: string;
  last_used_at: number | null;
  created_at: number;
}

// ============================================================================
// Constants
// ============================================================================

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    projects: 1,
    sync_enabled: false,
    analytics_enabled: false,
    api_keys: 0,
    team_members: 0,
    storage_mb: 0,
  },
  pro: {
    projects: 10,
    sync_enabled: true,
    analytics_enabled: true,
    api_keys: 5,
    team_members: 0,
    storage_mb: 500,
  },
  team: {
    projects: 50,
    sync_enabled: true,
    analytics_enabled: true,
    api_keys: 20,
    team_members: 10,
    storage_mb: 5000,
  },
  enterprise: {
    projects: -1, // unlimited
    sync_enabled: true,
    analytics_enabled: true,
    api_keys: -1,
    team_members: -1,
    storage_mb: -1,
  },
};

export interface PlanLimits {
  projects: number;
  sync_enabled: boolean;
  analytics_enabled: boolean;
  api_keys: number;
  team_members: number;
  storage_mb: number;
}

export const API_VERSION = '2026-02-08';
export const CLI_MIN_VERSION = '0.5.10';

// ============================================================================
// Utilities
// ============================================================================

export function canSync(plan: Plan): boolean {
  return PLAN_LIMITS[plan].sync_enabled;
}

export function getProjectLimit(plan: Plan): number {
  return PLAN_LIMITS[plan].projects;
}

export function checkLimit(plan: Plan, current: number, limit: keyof PlanLimits): boolean {
  const max = PLAN_LIMITS[plan][limit] as number;
  return max === -1 || current < max;
}
