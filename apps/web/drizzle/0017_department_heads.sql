CREATE TABLE "department_heads" (
	"department_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "department_heads_department_id_person_id_pk" PRIMARY KEY("department_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "departments" DROP CONSTRAINT "departments_head_person_id_people_id_fk";
--> statement-breakpoint
DROP INDEX "departments_head_person_id_idx";--> statement-breakpoint
ALTER TABLE "department_heads" ADD CONSTRAINT "department_heads_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_heads" ADD CONSTRAINT "department_heads_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "department_heads_person_id_idx" ON "department_heads" USING btree ("person_id");--> statement-breakpoint
-- Keep every existing head before the column goes.
INSERT INTO "department_heads" ("department_id", "person_id")
SELECT "id", "head_person_id" FROM "departments" WHERE "head_person_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" DROP COLUMN "head_person_id";