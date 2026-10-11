ALTER TABLE "services" DROP CONSTRAINT "services_repository_id_repositories_id_fk";--> statement-breakpoint
DROP INDEX "services_repository_id_idx";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "repository_id";--> statement-breakpoint
DROP TABLE "repositories" CASCADE;
