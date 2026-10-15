-- /welcome is now the public marketing landing page. Free any person/team
-- profile that already claimed that slug so it remains reachable.
DO $$
DECLARE
	r record;
	candidate text;
	n integer;
BEGIN
	FOR r IN
		SELECT 'person' AS kind, id, organization_id FROM "people" WHERE slug = 'welcome'
		UNION ALL
		SELECT 'team' AS kind, id, organization_id FROM "teams" WHERE slug = 'welcome'
		ORDER BY kind, id
	LOOP
		n := 2;
		LOOP
			candidate := 'welcome-' || n;
			EXIT WHEN NOT EXISTS (
				SELECT 1 FROM "people"
				WHERE organization_id = r.organization_id AND slug = candidate
			) AND NOT EXISTS (
				SELECT 1 FROM "teams"
				WHERE organization_id = r.organization_id AND slug = candidate
			);
			n := n + 1;
		END LOOP;
		IF r.kind = 'person' THEN
			UPDATE "people" SET slug = candidate WHERE id = r.id;
		ELSE
			UPDATE "teams" SET slug = candidate WHERE id = r.id;
		END IF;
	END LOOP;
END $$;
