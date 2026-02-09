/**
 * Database seed script
 *
 * Run with: npx tsx scripts/seed.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  console.log("🌱 Seeding database...");

  // Create demo organization
  const [demoOrg] = await db
    .insert(schema.organizations)
    .values({
      name: "Demo Organization",
      slug: "demo",
      plan: "free",
    })
    .returning();

  console.log(`✅ Created organization: ${demoOrg.name} (${demoOrg.id})`);

  // Create demo user
  const [demoUser] = await db
    .insert(schema.users)
    .values({
      email: "demo@example.com",
      name: "Demo User",
    })
    .returning();

  console.log(`✅ Created user: ${demoUser.email} (${demoUser.id})`);

  // Add user to organization
  await db.insert(schema.orgMembers).values({
    orgId: demoOrg.id,
    userId: demoUser.id,
    role: "owner",
  });

  console.log(`✅ Added ${demoUser.email} as owner of ${demoOrg.name}`);

  // Create demo project
  const [demoProject] = await db
    .insert(schema.projects)
    .values({
      orgId: demoOrg.id,
      name: "Demo Project",
      slug: "demo-project",
      description: "A demo project for testing",
    })
    .returning();

  console.log(`✅ Created project: ${demoProject.name} (${demoProject.id})`);

  // Create demo API key
  // Note: In production, you'd hash the key. This is just for demo.
  const demoKeyPlain = `ck_test_demo${Date.now().toString(36)}`;
  const [demoKey] = await db
    .insert(schema.apiKeys)
    .values({
      orgId: demoOrg.id,
      name: "Demo Key",
      keyHash: demoKeyPlain, // In production: hash this
      keyPrefix: "test_demo",
      scopes: ["project:read", "project:write"],
    })
    .returning();

  console.log(`✅ Created API key: ${demoKey.name}`);
  console.log(`   Key (save this!): ${demoKeyPlain}`);

  console.log("\n🎉 Seed complete!");
  console.log("\nDemo credentials:");
  console.log(`  Organization ID: ${demoOrg.id}`);
  console.log(`  Project ID: ${demoProject.id}`);
  console.log(`  API Key: ${demoKeyPlain}`);
}

seed().catch(console.error);
