# Tests

Tests live here, in `apps/web/tests/`, separate from the source they test, split by type:

```
tests/
├── unit/   plain-function tests: no rendering, no DOM
│   └── lib/
│       ├── env.test.ts     envSchema validation
│       └── utils.test.ts   cn() class-name merging
└── rtl/    component tests: React Testing Library + jsdom
    ├── shell/
    │   ├── sidebar-nav.test.tsx
    │   └── workspace-switcher.test.tsx
    └── states/
        ├── empty-state.test.tsx
        ├── loading-state.test.tsx
        ├── error-state.test.tsx
        └── permission-denied.test.tsx
```

## unit vs rtl

- **`unit/`** tests a single function or module in isolation: no `render()`, no DOM, no React. Fast and simple, e.g. does this zod schema accept/reject the right shapes, does this helper return the right value for a given input.
- **`rtl/`** tests a React component's rendered output and behavior using [`@testing-library/react`](https://testing-library.com/docs/react-testing-library/intro/): render it, query the DOM the way a user or screen reader would (`getByRole`, `getByText`, ...), assert on what's there, and simulate interaction with `@testing-library/user-event`.

If a test file calls `render()`, it belongs in `rtl/`. Otherwise it belongs in `unit/`.

## Structure

Each folder mirrors `src/`: a file at `src/lib/env.ts` has its test at `tests/unit/lib/env.test.ts`; a component at `src/components/shell/sidebar-nav.tsx` has its test at `tests/rtl/shell/sidebar-nav.test.tsx`. To find a component's test, drop `src/` for `tests/rtl/` (or `tests/unit/` for a plain module) and keep the rest of the path.

Import the thing under test with the `@/` alias (e.g. `@/components/shell/sidebar-nav`), not a relative path. Tests no longer sit next to their source file, so relative imports would break.

## Running

From the repo root, or from `apps/web`:

```bash
npm run test          # run once
npm run test:watch    # watch mode
```

`jest.config.mjs` uses `next/jest`, which discovers every `*.test.ts`/`*.test.tsx` under this folder automatically, no per-file registration needed.

## Environment

`apps/web/.env.test` holds dummy `DATABASE_URL`/`REDIS_URL` values. `next/jest` loads it automatically whenever `NODE_ENV=test` (which Jest sets itself), so importing `@/lib/env` in a test doesn't need real database credentials. It's committed like `.env.example`; real secrets never go in it.
