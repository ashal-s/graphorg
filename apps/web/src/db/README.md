# Database

The relational context model: organisations, users, teams, people, tools, services, documents and workflows, in PostgreSQL via [Drizzle ORM](https://orm.drizzle.team).

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
    ├── team-members.ts          join table: which teams a person is on, and their level on each
    ├── tools.ts                 what the org uses to do its work: software, platforms, equipment (free-text category)
    ├── services.ts               what the org delivers or runs: optional parent service, owner team
    ├── service-tools.ts          join table: the tools a service uses
    ├── service-people.ts         join table: people assigned directly to a service (on top of its owner team)
    ├── service-dependencies.ts   join table: direct service-to-service dependencies
    ├── document-folders.ts       folders documents are filed in; nest via parent_id
    ├── documents.ts              a name and a link, optionally in a folder and assigned to a team and/or person
    ├── workflows.ts               trigger, status; a documentation record, not an execution engine
    ├── workflow-steps.ts          a workflow's condition/action steps, in order
    ├── workflow-people.ts         join table: a person's role (owner/creator/worker) on a workflow
    └── index.ts                  barrel export, also the drizzle-kit schema entrypoint
scripts/seed.ts                 populates the "Acme Corp" demo organisation
```

## Design

- **Tenant boundary**: every table except `organizations` has a required `organization_id` column (`references organizations.id, onDelete: cascade`), via the shared `organizationId()` helper. Deleting an organization removes every row that belongs to it.
- **Ownership**: modeled as direct `owner_team_id` foreign keys (nullable, `onDelete: set null`) on `services` and `documents` — not a generic polymorphic ownership table. `team_members` (a person can be on any number of teams, with a level of lead, member or trainee on each) and `people.manager_id` (self-referential) round out the org chart.
- **Dependencies**: `service_dependencies` is a self-referential many-to-many join on `services`, with a `CHECK` constraint that a service can't depend on itself.
- **Hierarchy**: `services.parent_id` is a self-reference (`onDelete: set null`), so a service can sit under another one; a "system" is just a service with children. The API rejects a parent that would create a loop.
- **Documents**: `document_folders` nest through a self-referencing `parent_id`; deleting a folder moves its subfolders and documents up a level (done in the API). A document has an optional `folder_id`, `owner_team_id` and `owner_person_id`, so it can be assigned to a team, a person or both.
- **Assignees**: `service_people` lists people assigned directly to a service. A person's services on their profile are the union of this and the services their teams own.
- **Tools**: `service_tools` is a many-to-many join between `services` and `tools`. `tools.category` is free text so each organization groups its tools its own way.
- **Wording**: `organizations` carries optional `services_label_*`/`tools_label_*` and `*_description` columns. Null means "use the default" (see `src/lib/terminology.ts`); the app reads them wherever it names a service or tool.
- **Workflows**: a `workflows` row holds a trigger (`trigger_type` + flexible `trigger_config` jsonb), a `name`/`description` and a `status` — a documentation record of what the workflow is, not something anything in the MVP executes. Its ordered condition/action chain lives in `workflow_steps` (`step_order`, `kind`, a flexible `type` + `config` jsonb — one row per step, not a wide table); `step_order` is intentionally _not_ unique per workflow, since this only documents a process and different teams may record it differently, including steps that tie. Who's involved is `workflow_people`, one row per `(workflow, person, role)` with `role` one of `owner`, `creator` or `worker` — a single join table rather than three, since a workflow can have more than one owner, more than one creator and more than one worker, and one person can hold more than one role on the same workflow. Only `workflows` itself carries `organization_id`; `workflow_steps` and `workflow_people` are scoped indirectly via `workflow_id`, the same pattern `service_tools`/`service_dependencies` use via `service_id`. See the GraphOrg Architecture document for the "Workflow builder" concept this models.
- **Timestamps**: every table has `created_at`/`updated_at`. `updated_at` is kept correct at the database level by a `set_updated_at()` trigger (see `drizzle/0001_set_updated_at_triggers.sql`), not just by application code, so it stays right regardless of what writes the row.
- **Constraints**: per-organization `UNIQUE` constraints on natural keys (e.g. `(organization_id, name)` on `teams`, `(organization_id, email)` on `users`, `(organization_id, name)` on `workflows`), `CHECK` constraints on categorical fields (`users.role`, `team_members.team_role`, `documents.type`, `workflows.trigger_type`, `workflows.status`, `workflow_steps.kind`, `workflow_people.role`), and on `service_dependencies` (no self-reference).
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
- 14 tools (languages, databases, infrastructure and work tools; one flat catalog)
- 3 platform services and 5 services — each service has an owner team, a parent platform, the tools it uses (`service_tools`) and dependencies on other services (`service_dependencies`)
- 3 documents (an ADR, a runbook, an onboarding doc)
- 2 workflows, each with one condition step, one action step, one or more owners, one or more creators and two workers (one workflow has two owners; the other has the same person as both an owner and a creator)

Verified manually against a live Postgres instance (not just "the script exits 0"): re-running `db:seed` twice produces identical row counts; a duplicate `(organization_id, name)` insert, an out-of-enum `role`, an out-of-enum `workflow_steps.kind`, and a self-referencing `service_dependencies` row are all rejected by the database; two `workflow_steps` on the same workflow can share a `step_order` without error; deleting an organization cascades through `workflows` to `workflow_steps`/`workflow_people`; updating a row moves its `updated_at` via the trigger, not the application. See the WEB-130 and WEB-169 Linear comments for the exact queries.
