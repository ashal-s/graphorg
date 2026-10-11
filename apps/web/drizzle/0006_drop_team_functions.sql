ALTER TABLE "people" DROP CONSTRAINT IF EXISTS "people_function_id_team_functions_id_fk";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN IF EXISTS "function_id";--> statement-breakpoint
DROP TABLE IF EXISTS "team_functions" CASCADE;
