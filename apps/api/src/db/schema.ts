/**
 * Database schema using Drizzle ORM
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  bigint,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Organizations (tenants)
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    plan: text("plan").notNull().default("free"), // free, pro, team, enterprise
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("org_slug_idx").on(table.slug),
  })
);

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Organization memberships
export const orgMembers = pgTable(
  "org_members",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // owner, admin, member
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.userId] }),
  })
);

// Projects
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    settings: jsonb("settings").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    orgIdx: index("project_org_idx").on(table.orgId),
    orgSlugIdx: uniqueIndex("project_org_slug_idx").on(table.orgId, table.slug),
  })
);

// API Keys
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(), // SHA-256 of the key
    keyPrefix: text("key_prefix").notNull(), // First 8 chars for identification
    scopes: jsonb("scopes").default([]), // ["project:read", "project:write"]
    projectIds: jsonb("project_ids").default([]), // Empty = all projects
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    orgIdx: index("api_key_org_idx").on(table.orgId),
    prefixIdx: index("api_key_prefix_idx").on(table.keyPrefix),
  })
);

// Indexed files
export const indexedFiles = pgTable(
  "indexed_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    contentHash: text("content_hash").notNull(),
    chunkCount: integer("chunk_count").notNull(),
    indexedAt: timestamp("indexed_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    projectIdx: index("indexed_file_project_idx").on(table.projectId),
    projectPathIdx: uniqueIndex("indexed_file_project_path_idx").on(
      table.projectId,
      table.filePath
    ),
  })
);

// Usage events (for detailed tracking)
export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(), // 'query', 'index', 'sync'
    projectId: uuid("project_id"),
    tokensUsed: integer("tokens_used"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    orgCreatedIdx: index("usage_org_created_idx").on(
      table.orgId,
      table.createdAt
    ),
  })
);

// Monthly usage aggregates (for billing)
export const usageMonthly = pgTable(
  "usage_monthly",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    month: timestamp("month", { mode: "date" }).notNull(), // First day of month
    queries: integer("queries").default(0),
    tokens: integer("tokens").default(0),
    storageBytes: bigint("storage_bytes", { mode: "number" }).default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.month] }),
  })
);

// Type exports
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type IndexedFile = typeof indexedFiles.$inferSelect;
export type UsageEvent = typeof usageEvents.$inferSelect;
