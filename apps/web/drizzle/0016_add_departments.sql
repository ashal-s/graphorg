CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"parent_id" uuid,
	"head_person_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_organization_id_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "department_teams" (
	"department_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "department_teams_department_id_team_id_pk" PRIMARY KEY("department_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "department_people" (
	"department_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "department_people_department_id_person_id_pk" PRIMARY KEY("department_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_departments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_person_id_people_id_fk" FOREIGN KEY ("head_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_teams" ADD CONSTRAINT "department_teams_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_teams" ADD CONSTRAINT "department_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_people" ADD CONSTRAINT "department_people_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_people" ADD CONSTRAINT "department_people_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "departments_organization_id_idx" ON "departments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "departments_parent_id_idx" ON "departments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "departments_head_person_id_idx" ON "departments" USING btree ("head_person_id");--> statement-breakpoint
CREATE INDEX "department_teams_team_id_idx" ON "department_teams" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "department_teams_one_primary_per_team" ON "department_teams" USING btree ("team_id") WHERE "department_teams"."is_primary";--> statement-breakpoint
CREATE INDEX "department_people_person_id_idx" ON "department_people" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "department_people_one_primary_per_person" ON "department_people" USING btree ("person_id") WHERE "department_people"."is_primary";--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_one_primary_per_person" ON "team_members" USING btree ("person_id") WHERE "team_members"."is_primary";