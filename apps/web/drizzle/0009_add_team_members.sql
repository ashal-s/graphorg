CREATE TABLE "team_members" (
	"team_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"team_role" text DEFAULT 'member' NOT NULL,
	CONSTRAINT "team_members_team_id_person_id_pk" PRIMARY KEY("team_id","person_id"),
	CONSTRAINT "team_members_team_role_check" CHECK ("team_members"."team_role" in ('lead', 'member', 'trainee'))
);
--> statement-breakpoint
INSERT INTO "team_members" ("team_id", "person_id", "team_role")
SELECT "team_id", "id", "team_role" FROM "people" WHERE "team_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "people" DROP CONSTRAINT "people_team_role_check";--> statement-breakpoint
ALTER TABLE "people" DROP CONSTRAINT "people_team_id_teams_id_fk";
--> statement-breakpoint
DROP INDEX "people_team_id_idx";--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_members_person_id_idx" ON "team_members" USING btree ("person_id");--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN "team_id";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN "team_role";