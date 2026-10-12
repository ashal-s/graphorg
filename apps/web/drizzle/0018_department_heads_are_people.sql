-- A department's heads are always among its people: add the ones that aren't.
INSERT INTO "department_people" ("department_id", "person_id")
SELECT "department_id", "person_id" FROM "department_heads"
ON CONFLICT DO NOTHING;--> statement-breakpoint
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
);
