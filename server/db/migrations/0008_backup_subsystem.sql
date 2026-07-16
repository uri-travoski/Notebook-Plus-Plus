CREATE TABLE "backup_history" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"type" text NOT NULL,
	"ok" boolean NOT NULL,
	"name" text,
	"size" bigint,
	"location" text,
	"includes_uploads" boolean,
	"error" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_settings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"schedule" text DEFAULT 'off' NOT NULL,
	"retention" integer DEFAULT 14 NOT NULL,
	"include_uploads" boolean DEFAULT true NOT NULL,
	"destination_type" text DEFAULT 'local' NOT NULL,
	"local_path" text DEFAULT '' NOT NULL,
	"s3_endpoint" text DEFAULT '' NOT NULL,
	"s3_region" text DEFAULT 'auto' NOT NULL,
	"s3_bucket" text DEFAULT '' NOT NULL,
	"s3_force_path_style" boolean DEFAULT false NOT NULL,
	"s3_access_key_id" text DEFAULT '' NOT NULL,
	"s3_secret_ciphertext" text,
	"s3_secret_iv" text,
	"s3_secret_auth_tag" text,
	"password_ciphertext" text,
	"password_iv" text,
	"password_auth_tag" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "backup_history_created_idx" ON "backup_history" USING btree ("created_at");
