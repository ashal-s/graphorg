# GraphOrg

GraphOrg is a single company-context product that maps people, teams, tools, technologies, repositories, services, infrastructure, documentation, ownership and dependencies. New employees, consultants and approved AI agents use it to understand the organisation before working, reviewing or advising.

**MVP scope:** company context is entered and maintained manually through the product's own forms and APIs — there is no "connect a tool" option yet. Connectors and the Databricks data platform are deferred to a later Post-MVP phase. See the [GraphOrg Architecture](https://linear.app/webifex/document/graphorg-architecture-44d635b43cc2) document (WEB-127) for the full picture.

## Monorepo layout

```
apps/web            Next.js app — UI + Route Handlers (primary backend)
packages/            Shared TypeScript packages (@graphorg/types, @graphorg/tsconfig)
services/ai-worker    Python AI worker — embeddings/retrieval/eval (scaffolded now, built out in Days 10-12)
infra/                Terraform/Helm/Ansible (Days 4-6)
docs/                 Repo-local reference docs
```

## Prerequisites

- Node.js 20+ and npm 10+
- Python 3.12+
- Docker (for local Postgres/Redis)

## Getting started

1. Install JS dependencies from the repo root:
   ```bash
   npm install
   ```
2. Copy the env file and fill in values as needed:
   ```bash
   cp apps/web/.env.example apps/web/.env
   ```
3. Start local services:
   ```bash
   docker compose up -d
   ```
4. Start the web app:

   ```bash
   npm run dev
   ```

   → http://localhost:3000, health check at http://localhost:3000/api/health

5. In a separate terminal, start the Python AI worker:
   ```bash
   cd services/ai-worker
   python3 -m venv .venv && source .venv/bin/activate
   pip install -e ".[dev]"
   uvicorn ai_worker.main:app --reload --port 8000
   ```
   → health check at http://localhost:8000/health

## Common commands

Run from the repo root:

```bash
npm run lint          # eslint (apps/web)
npm run typecheck      # tsc --noEmit across all workspaces
npm run format          # prettier --write
npm run format:check    # prettier --check
npm run build            # next build
```

For the Python worker (from `services/ai-worker`, with the virtualenv active):

```bash
pytest
```

## CI

`.github/workflows/ci.yml` installs dependencies, checks formatting, lints, type-checks and builds `apps/web`, and separately installs and tests `services/ai-worker`, on every push and pull request.
