ALTER TABLE "teams" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "slug" text;--> statement-breakpoint
-- People and teams share one top-level URL namespace (/<slug>), so give every
-- existing row a slug in creation order: the name, lowercased and hyphenated,
-- with -2, -3, ... added until it is unused by any person, team or app page.
DO $$
DECLARE
	r record;
	base text;
	candidate text;
	n integer;
	reserved text[] := ARRAY[
		'api', 'login', 'signup', 'directory', 'org-chart', 'catalog',
		'documents', 'workflows', 'settings', 'new', 'forbidden',
		'unauthorized', 'not-found', 'error', 'loading', 'admin'
	];
BEGIN
	FOR r IN
		SELECT 'person' AS kind, id, organization_id, name, created_at FROM "people"
		UNION ALL
		SELECT 'team' AS kind, id, organization_id, name, created_at FROM "teams"
		ORDER BY created_at, id
	LOOP
		base := trim(both '-' from regexp_replace(lower(r.name), '[^a-z0-9]+', '-', 'g'));
		IF base = '' THEN
			base := 'item';
		END IF;
		candidate := base;
		n := 2;
		WHILE candidate = ANY (reserved)
			OR EXISTS (
				SELECT 1 FROM "people"
				WHERE organization_id = r.organization_id AND slug = candidate
			)
			OR EXISTS (
				SELECT 1 FROM "teams"
				WHERE organization_id = r.organization_id AND slug = candidate
			)
		LOOP
			candidate := base || '-' || n;
			n := n + 1;
		END LOOP;
		IF r.kind = 'person' THEN
			UPDATE "people" SET slug = candidate WHERE id = r.id;
		ELSE
			UPDATE "teams" SET slug = candidate WHERE id = r.id;
		END IF;
	END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_slug_unique" UNIQUE("organization_id","slug");--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_organization_id_slug_unique" UNIQUE("organization_id","slug");
