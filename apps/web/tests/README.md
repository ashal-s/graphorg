# Tests

Tests live here, in `apps/web/tests/`, separate from the source they test, split by type:

```
tests/
├── unit/     plain-function / module tests: no rendering, no DOM
│   ├── api/           Zod schemas and pure helpers used by Route Handlers
│   ├── db/            Drizzle schema structure (tables, FKs, checks)
│   └── lib/           env, auth, AI limits, page-context, slugs, …
└── rtl/      component tests: React Testing Library + jsdom
    ├── catalog/
    ├── directory/
    ├── documents/
    ├── settings/
    ├── shared/        PageHeader, AI chat button, entity row, …
    ├── shell/         sidebar nav, workspace breadcrumb
    ├── states/        empty / loading / error / permission-denied
    └── workflows/
```

The tree grows as features land; mirror `src/` under `unit/` or `rtl/` rather than listing every file here.

## unit vs rtl

- **`unit/`** tests a single function or module in isolation: no `render()`, no DOM, no React. Fast and simple — e.g. does this Zod schema accept/reject the right shapes, does this helper return the right value for a given input.
- **`rtl/`** tests a React component's rendered output and behavior using [`@testing-library/react`](https://testing-library.com/docs/react-testing-library/intro/): render it, query the DOM the way a user or screen reader would (`getByRole`, `getByText`, ...), assert on what's there, and simulate interaction with `@testing-library/user-event`.

If a test file calls `render()`, it belongs in `rtl/`. Otherwise it belongs in `unit/`.

## Structure

Each folder mirrors `src/`: a file at `src/lib/env.ts` has its test at `tests/unit/lib/env.test.ts`; a component at `src/components/shell/sidebar-nav.tsx` has its test at `tests/rtl/shell/sidebar-nav.test.tsx`. To find a component's test, drop `src/` for `tests/rtl/` (or `tests/unit/` for a plain module) and keep the rest of the path.

Import the thing under test with the `@/` alias (e.g. `@/components/shell/sidebar-nav`), not a relative path. Tests no longer sit next to their source file, so relative imports would break.

## Notable coverage

| Area             | Where                                      | What it guards                                                                                                          |
| ---------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Schema structure | `unit/db/schema.test.ts`                   | Table exports, tenant `organization_id` on core tables, service self-dependency check, workflow join shape — no live DB |
| Env validation   | `unit/lib/env.test.ts`                     | `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET` (≥32 chars), optional AI worker settings and rate-limit default              |
| Auth helpers     | `unit/lib/auth/`                           | Login resolution, roles, IP rate limits, user-management rules                                                          |
| Ask AI           | `unit/lib/ai/`, `unit/api/ai-chat.test.ts` | Context/history budgets, SSE parsing, rate limit, route behaviour                                                       |
| Page context     | `unit/lib/page-context/`                   | Builders + `coverage.test.ts` (every `(app)` page has a copy button or an explicit `NO_CONTEXT` entry)                  |
| Shell            | `rtl/shell/`                               | Nav items (Overview, Directory, Org chart, Catalog, Documents, Workflows, Settings), workspace breadcrumb switching     |
| Shared UI states | `rtl/states/`                              | Empty / loading / error / permission-denied                                                                             |

API route and feature-area tests under `unit/api/` and `rtl/{directory,catalog,documents,workflows,settings}/` follow the same patterns — prefer reading those files over duplicating tables here.

`unit/db/schema.test.ts` is structural only: it does not prove constraint _behavior_ against real data (that's verified manually against a live Postgres instance; see the WEB-130 Linear comment). Live-DB integration tests are WEB-135.

## Running

From the repo root, or from `apps/web`:

```bash
npm run test                              # run once (from root: runs apps/web)
npm run test:watch --workspace=apps/web   # watch mode
```

`test:watch` uses `--watchAll`, not Jest's default `--watch`: `--watch` only re-runs tests related to files changed since the last commit, so on a clean working tree it finds nothing to run. `--watchAll` always runs the full suite first.

`jest.config.mjs` uses `next/jest`, which discovers every `*.test.ts`/`*.test.tsx` under this folder automatically, no per-file registration needed.

## Environment

No env file is needed to run the tests. `apps/web/.env.local` holds the real local `DATABASE_URL` / `REDIS_URL` / `AUTH_SECRET` (see the root README), but it's the _only_ env file in the repo, and Next deliberately does not load `.env.local` when `NODE_ENV=test` (Jest sets this itself) — tests should produce the same result for everyone, not depend on whatever happens to be in a developer's local config. That's safe here because `src/lib/env.ts`'s `getEnv()` only reads `process.env` when something actually calls it, and nothing in the current test suite does for real credentials; `env.test.ts` tests `envSchema` directly against a plain object instead.
