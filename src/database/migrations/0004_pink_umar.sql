CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_type" varchar(50),
	"user_agent" text,
	"ip_address" varchar(45),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" RENAME TO "user_activity_logs";--> statement-breakpoint
ALTER TABLE "user_activity_logs" DROP CONSTRAINT "sessions_token_id_unique";--> statement-breakpoint
ALTER TABLE "user_activity_logs" DROP CONSTRAINT "sessions_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "products_name_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "products_price_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "products_stock_idx";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "product_attributes" ALTER COLUMN "name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "attribute_values" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(50) DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "images" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "images" text;--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD COLUMN "action" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD COLUMN "entity" varchar(100);--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD COLUMN "entity_id" uuid;--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD COLUMN "ip_address" varchar(45);--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_deleted_at_idx" ON "products" ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_attributes_deleted_at_idx" ON "product_attributes" ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_variants_deleted_at_idx" ON "product_variants" ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_variants_sku_idx" ON "product_variants" ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_activity_logs_user_id_idx" ON "user_activity_logs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_activity_logs_action_idx" ON "user_activity_logs" ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_activity_logs_created_at_idx" ON "user_activity_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_activity_logs_deleted_at_idx" ON "user_activity_logs" ("deleted_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "first_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_active";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified";--> statement-breakpoint
ALTER TABLE "user_activity_logs" DROP COLUMN IF EXISTS "token_id";--> statement-breakpoint
ALTER TABLE "user_activity_logs" DROP COLUMN IF EXISTS "refresh_token_hash";--> statement-breakpoint
ALTER TABLE "user_activity_logs" DROP COLUMN IF EXISTS "expires_at";--> statement-breakpoint
ALTER TABLE "user_activity_logs" DROP COLUMN IF EXISTS "is_revoked";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");