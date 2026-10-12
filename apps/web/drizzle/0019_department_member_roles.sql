ALTER TABLE "department_people" ADD COLUMN "role" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "department_people" ADD CONSTRAINT "department_people_role_check" CHECK ("department_people"."role" in ('lead', 'member', 'trainee'));--> statement-breakpoint
-- Heads become people in the department at the lead level.
INSERT INTO "department_people" ("department_id", "person_id", "role")
SELECT "department_id", "person_id", 'lead' FROM "department_heads"
ON CONFLICT ("department_id", "person_id") DO UPDATE SET "role" = 'lead';--> statement-breakpoint
-- Anyone who now has departments but no primary one gets their first.
UPDATE "department_people" AS dp SET "is_primary" = true
WHERE NOT EXISTS (
  SELECT 1 FROM "department_people" x
  WHERE x."person_id" = dp."person_id" AND x."is_primary"
)
AND dp."department_id" = (
  SELECT y."department_id" FROM "department_people" y
  WHERE y."person_id" = dp."person_id"
  ORDER BY y."department_id" LIMIT 1
);--> statement-breakpoint
ALTER TABLE "department_heads" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "department_heads" CASCADE;
