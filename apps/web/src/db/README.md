# Database

The relational context model: organisations, users, teams, people, technologies, tools, systems, services, repositories and documents, in PostgreSQL via [Drizzle ORM](https://orm.drizzle.team).

## Layout

```
drizzle.config.ts              drizzle-kit config (schema path, migrations out dir, db credentials)
drizzle/                       generated + hand-authored SQL migrations, committed to git
src/db/
├── index.ts                   the query client (getDb())
└── schema/
    ├── _columns.ts             shared column helpers: id(), timestamps(), organizationId()
    ├── organizations.ts        tenant root
    ├── users.ts                product accounts (role: owner/admin/editor/viewer)
    ├── teams.ts
    ├── people.ts                directory entries; optionally linked to a user; self-referential manager
    ├── technologies.ts          languages/frameworks/databases/infra, catalog per org
    ├── tools.ts                 SaaS tools catalog per org (GitHub, Jira, ...)
    ├── systems.ts                groups of related services
    ├── repositories.ts
    ├── services.ts               the central entity: system, repository, owner team
    ├── service-technologies.ts   join table: a service's tech stack
    ├── service-dependencies.ts   join table: direct service-to-service dependencies
    ├── documents.ts
    └── index.ts                  barrel export, also the drizzle-kit schema entrypoint
scripts/seed.ts                 populates the "Acme Corp" demo organisation
```

## Design

- **Tenant boundary**: every table except `organizations` has a required `organization_id` column (`references organizations.id, onDelete: cascade`), via the shared `organizationId()` helper. Deleting an organization removes every row that belongs to it.
- **Ownership**: modeled as direct `owner_team_id` foreign keys (nullable, `onDelete: set null`) on `systems`, `services`, `repositories` and `documents` — not a generic polymorphic ownership table. `people.team_id` and `people.manager_id` (self-referential) round out the org chart.
- **Dependencies**: `service_dependencies` is a self-referential many-to-many join on `services`, with a `CHECK` constraint that a service can't depend on itself.
- **Tech stack**: `service_technologies` is a many-to-many join between `services` and `technologies`.
- **Timestamps**: every table has `created_at`/`updated_at`. `updated_at` is kept correct at the database level by a `set_updated_at()` trigger (see `drizzle/0001_set_updated_at_triggers.sql`), not just by application code, so it stays right regardless of what writes the row.
- **Constraints**: per-organization `UNIQUE` constraints on natural keys (e.g. `(organization_id, name)` on `teams`, `(organization_id, email)` on `users`), `CHECK` constraints on categorical fields (`users.role`, `technologies.category`, `tools.category`, `documents.type`) and on `service_dependencies` (no self-reference).
- **Indexes**: every `organization_id` column is indexed, along with every other foreign key that isn't already the leading column of a unique constraint.

## Workflow

All commands run from `apps/web` (or the repo root with `--workspace=apps/web`), and need `apps/web/.env.local` to exist (see the root README's Getting Started) since `drizzle-kit`/`tsx` don't load Next's env files themselves — the `db:*` scripts source it via `dotenv-cli`.

```bash
npm run db:generate       # after changing schema/*.ts: generate a new SQL migration
npm run db:migrate        # apply pending migrations
npm run db:seed           # (re-)populate the "Acme Corp" demo organisation
npm run db:studio         # browse the database in Drizzle Studio
```

To add a hand-authored migration (e.g. a trigger, like `0001_set_updated_at_triggers.sql`) that isn't a plain schema diff: `npm run db:generate -- --custom --name <name>`, then fill in the empty file it creates.

### Seeding

`scripts/seed.ts` is safely re-runnable: it looks up the demo org by `slug = "acme"`, deletes it if found (the `organization_id` cascade removes every child row), then inserts a fresh copy. It creates:

- 5 teams, 9 people with a manager hierarchy, 4 of them linked to product accounts (`users`, one of each role)
- 8 technologies and 6 tools (flat catalogs)
- 3 systems, 5 repositories, 5 services — each service has an owner team, a system, an optional repository, a tech stack (`service_technologies`) and dependencies on other services (`service_dependencies`)
- 3 documents (an ADR, a runbook, an onboarding doc)

Verified manually against a live Postgres instance (not just "the script exits 0"): re-running `db:seed` twice produces identical row counts; a duplicate `(organization_id, name)` insert, an out-of-enum `role`, and a self-referencing `service_dependencies` row are all rejected by the database; updating a row moves its `updated_at` via the trigger, not the application. See the WEB-130 Linear comment for the exact queries.
