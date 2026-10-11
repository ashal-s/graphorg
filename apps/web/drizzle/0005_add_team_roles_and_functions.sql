CREATE TABLE "team_functions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_functions_organization_id_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "team_role" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "function_id" uuid;--> statement-breakpoint
ALTER TABLE "team_functions" ADD CONSTRAINT "team_functions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_functions_organization_id_idx" ON "team_functions" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_function_id_team_functions_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."team_functions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_team_role_check" CHECK ("people"."team_role" in ('lead', 'member', 'trainee'));--> statement-breakpoint
CREATE TRIGGER team_functions_set_updated_at BEFORE UPDATE ON "team_functions"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
INSERT INTO "team_functions" ("organization_id", "name")
SELECT o."id", f."name"
FROM "organizations" o
CROSS JOIN (VALUES
  ('Developer'), ('Designer'), ('Tester'), ('Product Owner'),
  ('Scrum Master'), ('Engineering Manager'), ('Analyst')
) AS f("name")
ON CONFLICT ("organization_id", "name") DO NOTHING;
