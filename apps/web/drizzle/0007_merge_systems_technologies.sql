CREATE TABLE "service_tools" (
	"service_id" uuid NOT NULL,
	"tool_id" uuid NOT NULL,
	CONSTRAINT "service_tools_service_id_tool_id_pk" PRIMARY KEY("service_id","tool_id")
);
--> statement-breakpoint
ALTER TABLE "tools" DROP CONSTRAINT "tools_category_check";--> statement-breakpoint
ALTER TABLE "tools" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
INSERT INTO "tools" ("id", "organization_id", "name", "category", "description", "created_at", "updated_at")
SELECT t."id", t."organization_id",
	CASE
		-- No tool already has this name: keep it.
		WHEN NOT EXISTS (
			SELECT 1 FROM "tools" x
			WHERE x."organization_id" = t."organization_id" AND x."name" = t."name"
		) THEN t."name"
		-- Otherwise "<name> (technology)", unless that is taken by a tool or
		-- by another technology...
		WHEN NOT EXISTS (
			SELECT 1 FROM "tools" x
			WHERE x."organization_id" = t."organization_id"
				AND x."name" = t."name" || ' (technology)'
		) AND NOT EXISTS (
			SELECT 1 FROM "technologies" y
			WHERE y."organization_id" = t."organization_id"
				AND y."name" = t."name" || ' (technology)'
		) THEN t."name" || ' (technology)'
		-- ...in which case the technology's own id makes the name unique.
		ELSE t."name" || ' (technology ' || t."id" || ')'
	END,
	t."category", t."description", t."created_at", t."updated_at"
FROM "technologies" t;--> statement-breakpoint
INSERT INTO "service_tools" ("service_id", "tool_id")
SELECT "service_id", "technology_id" FROM "service_technologies";--> statement-breakpoint
INSERT INTO "services" ("id", "organization_id", "owner_team_id", "name", "description", "created_at", "updated_at")
SELECT s."id", s."organization_id", s."owner_team_id",
	CASE
		WHEN NOT EXISTS (
			SELECT 1 FROM "services" x
			WHERE x."organization_id" = s."organization_id" AND x."name" = s."name"
		) THEN s."name"
		WHEN NOT EXISTS (
			SELECT 1 FROM "services" x
			WHERE x."organization_id" = s."organization_id"
				AND x."name" = s."name" || ' (system)'
		) AND NOT EXISTS (
			SELECT 1 FROM "systems" y
			WHERE y."organization_id" = s."organization_id"
				AND y."name" = s."name" || ' (system)'
		) THEN s."name" || ' (system)'
		ELSE s."name" || ' (system ' || s."id" || ')'
	END,
	s."description", s."created_at", s."updated_at"
FROM "systems" s;--> statement-breakpoint
UPDATE "services" SET "parent_id" = "system_id" WHERE "system_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "services" DROP CONSTRAINT "services_system_id_systems_id_fk";--> statement-breakpoint
DROP INDEX "services_system_id_idx";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "system_id";--> statement-breakpoint
DROP TABLE "service_technologies" CASCADE;--> statement-breakpoint
DROP TABLE "technologies" CASCADE;--> statement-breakpoint
DROP TABLE "systems" CASCADE;--> statement-breakpoint
ALTER TABLE "service_tools" ADD CONSTRAINT "service_tools_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tools" ADD CONSTRAINT "service_tools_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_parent_id_services_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "services_parent_id_idx" ON "services" USING btree ("parent_id");
