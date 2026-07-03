-- Flatten Projects out: notebooks become top-level, owned directly by the user.
ALTER TABLE "notebooks" ADD COLUMN "user_id" uuid;--> statement-breakpoint
UPDATE "notebooks" SET "user_id" = "projects"."user_id" FROM "projects" WHERE "notebooks"."project_id" = "projects"."id";--> statement-breakpoint
DELETE FROM "notebooks" WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "notebooks" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notebooks_user_idx" ON "notebooks" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "notebooks" DROP CONSTRAINT IF EXISTS "notebooks_project_id_projects_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "notebooks_project_idx";--> statement-breakpoint
ALTER TABLE "notebooks" DROP COLUMN "project_id";--> statement-breakpoint
DROP TABLE IF EXISTS "projects" CASCADE;
