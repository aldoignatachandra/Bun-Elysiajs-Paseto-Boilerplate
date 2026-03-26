-- Migration: Add refresh_token_id for single-use refresh token rotation
-- This migration implements secure refresh token rotation to prevent token reuse
-- and detect potential token theft.

-- Step 1: Add refresh_token_id column as nullable (for existing sessions)
ALTER TABLE "user_sessions" ADD COLUMN "refresh_token_id" text;

-- Step 2: Update existing sessions with empty string (they will need to re-login)
UPDATE "user_sessions" SET "refresh_token_id" = '' WHERE "refresh_token_id" IS NULL;

-- Step 3: Make the column NOT NULL
ALTER TABLE "user_sessions" ALTER COLUMN "refresh_token_id" SET NOT NULL;

-- Step 4: Create index for efficient refresh token lookups
CREATE INDEX IF NOT EXISTS "user_sessions_refresh_token_id_idx" ON "user_sessions"("refresh_token_id");

-- Step 5: Create composite index for active session lookup by refresh_token_id
-- This index is used by findByRefreshTokenId to find non-revoked sessions quickly
CREATE INDEX IF NOT EXISTS "user_sessions_refresh_token_id_active_idx" ON "user_sessions"("refresh_token_id", "revoked_at")
  WHERE "revoked_at" IS NULL;

-- Note: Existing sessions will have an empty refresh_token_id.
-- Users will need to re-login to get proper refresh token rotation.