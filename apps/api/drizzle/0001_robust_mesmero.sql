ALTER TABLE "users" ADD COLUMN "clerk_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_clerk_id_idx" ON "users" ("clerk_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id");