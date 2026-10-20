# GraphOrg

GraphOrg is a single company-context product that maps people, teams, departments, tools, technologies, services, infrastructure, documentation, ownership and dependencies. New employees, consultants and approved AI agents use it to understand the organisation before working, reviewing or advising.

**MVP scope:** company context is entered and maintained manually through the product's own forms and APIs — there is no "connect a tool" option yet. Connectors and the Databricks data platform are deferred to a later Post-MVP phase. See the [GraphOrg Architecture](https://linear.app/webifex/document/graphorg-architecture-44d635b43cc2) document (WEB-127) for the full picture.

## Monorepo layout

```
apps/web              Next.js app — UI + Route Handlers (primary backend)
packages/             Shared TypeScript packages (@graphorg/types, @graphorg/tsconfig)
services/ai-worker    Python FastAPI worker — Ask AI chat (prompt + LLM streaming)
infra/                Terraform/Helm/Ansible (Post-MVP — Cloud, CI/CD & Observability)
docs/                 Mintlify docs source (local AI setup, tooling) — npm run docs:dev
```

## Prerequisites

- Node.js 20+ and npm 10+
- Python 3.12+
- Docker (for local Postgres/Redis)
- Optional for Ask AI: [Ollama](https://ollama.com) — see [docs/ai-local-setup.md](docs/ai-local-setup.md)

## Getting started

1. Install JS dependencies from the repo root:
   ```bash
   npm install
   ```
2. Create `apps/web/.env.local` (gitignored — this is the only env file for the web app; nothing is committed):

   ```bash
   cat > apps/web/.env.local <<EOF
   DATABASE_URL=postgresql://graphorg:graphorg@localhost:5433/graphorg
   REDIS_URL=redis://localhost:6379
   AUTH_SECRET=$(openssl rand -base64 32)
   EOF
   ```

   `AUTH_SECRET` must be at least 32 characters (Auth.js session signing). For Ask AI, also set `AI_WORKER_URL` and `AI_WORKER_SECRET` as in [docs/ai-local-setup.md](docs/ai-local-setup.md). Optional Resend and Sentry vars are documented in [docs/tooling.md](docs/tooling.md) — the app boots without them.

   On Vercel/Neon, use the **pooled** connection string for `DATABASE_URL` (host contains `-pooler`) and set `DATABASE_URL_UNPOOLED` to the **direct** URL so `drizzle-kit` migrations work. Locally with Docker Postgres you only need `DATABASE_URL`.

3. Start local services (needs Docker Desktop running):

   ```bash
   docker compose up -d
   ```

   Postgres is exposed on host port **5433**, not 5432, so it doesn't collide with a Postgres you might already have running locally (Homebrew, Postgres.app, another project) — that's why `.env.local` above points at 5433. Redis is on the standard 6379.

   Check both are up: `docker compose ps`. Stop them: `docker compose down` (add `-v` to also drop the data volumes).

4. Apply database migrations and load the demo organisation:

   ```bash
   npm run db:migrate --workspace=apps/web
   npm run db:seed --workspace=apps/web
   ```

   See `apps/web/src/db/README.md` for the schema and migration workflow. After seeding, sign in at `/login` with workspace **acme**, any seeded user email (e.g. `priya@acme.example`), and password **`acme-demo-password`**.

5. Start the web app:

   ```bash
   npm run dev
   ```

   → http://localhost:3000, health check at http://localhost:3000/api/health

6. In a separate terminal, start the Python AI worker (needed for Ask AI):

   ```bash
   cd services/ai-worker
   python3 -m venv .venv && source .venv/bin/activate
   pip install -e ".[dev]"
   cp .env.example .env   # then fill it in: see docs/ai-local-setup.md
   uvicorn ai_worker.main:app --reload --port 8001
   ```

   → health check at http://localhost:8001/health

   Port 8001 is what the web app expects (`AI_WORKER_URL`). The worker's
   `/health` runs without a model, but Ask AI needs Ollama (or a hosted
   model) and a few environment variables:
   [docs/ai-local-setup.md](docs/ai-local-setup.md) walks through them.

## Common commands

Run from the repo root:

```bash
npm run lint                          # eslint (apps/web)
npm run typecheck                     # tsc --noEmit across all workspaces
npm run test                          # jest + React Testing Library (apps/web)
npm run test:watch --workspace=apps/web   # same, in watch mode
npm run format                        # prettier --write
npm run format:check                  # prettier --check
npm run build                         # next build
```

Database (from repo root, or from `apps/web`):

```bash
npm run db:migrate --workspace=apps/web
npm run db:seed --workspace=apps/web
npm run db:studio --workspace=apps/web
```

For the Python worker (from `services/ai-worker`, with the virtualenv active):

```bash
pytest
```

## CI

`.github/workflows/ci.yml` installs dependencies, checks formatting, lints, type-checks, tests and builds `apps/web`, and separately installs and tests `services/ai-worker`, on every push to `main` and on every pull request.
