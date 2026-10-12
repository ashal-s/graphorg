-- 0016 added team_members.is_primary with everyone defaulting to false, so
-- people already on teams had no primary team. Give each of them their first
-- one (by team id, the same pick the app makes when it has to choose).
UPDATE "team_members" AS tm SET "is_primary" = true
WHERE NOT EXISTS (
  SELECT 1 FROM "team_members" x
  WHERE x."person_id" = tm."person_id" AND x."is_primary"
)
AND tm."team_id" = (
  SELECT y."team_id" FROM "team_members" y
  WHERE y."person_id" = tm."person_id"
  ORDER BY y."team_id" LIMIT 1
);--> statement-breakpoint
-- The same for anything else with links but no primary (a no-op on a
-- database that went through 0018 and 0019).
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
UPDATE "department_teams" AS dt SET "is_primary" = true
WHERE NOT EXISTS (
  SELECT 1 FROM "department_teams" x
  WHERE x."team_id" = dt."team_id" AND x."is_primary"
)
AND dt."department_id" = (
  SELECT y."department_id" FROM "department_teams" y
  WHERE y."team_id" = dt."team_id"
  ORDER BY y."department_id" LIMIT 1
);
