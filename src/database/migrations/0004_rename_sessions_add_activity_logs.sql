-- Migration: Create user_sessions table (renamed from sessions)
-- This migration handles:
-- 1. Renaming sessions to user_sessions
-- 2. Creating user_activity_logs table

-- Step 1: Rename sessions to user_sessions if it exists
ALTER TABLE IF EXISTS "sessions" RENAME TO "user_sessions";

-- Step 2: Update foreign key constraint name
ALTER TABLE IF EXISTS "user_sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_users_id_fk";
ALTER TABLE IF EXISTS "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

-- Step 3: Create user_activity_logs table
CREATE TABLE IF NOT EXISTS "user_activity_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "action" text NOT NULL,
    "entity" text,
    "entity_id" uuid,
    "ip_address" text,
    "user_agent" text,
    "details" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "deleted_at" timestamp with time zone
);

-- Step 4: Create indexes for user_activity_logs
CREATE INDEX IF NOT EXISTS "activity_logs_user_id_idx" ON "user_activity_logs"("user_id");
CREATE INDEX IF NOT EXISTS "activity_logs_action_idx" ON "user_activity_logs"("action");
CREATE INDEX IF NOT EXISTS "activity_logs_created_at_idx" ON "user_activity_logs"("created_at");
CREATE INDEX IF NOT EXISTS "activity_logs_entity_idx" ON "user_activity_logs"("entity");

-- Step 5: Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
