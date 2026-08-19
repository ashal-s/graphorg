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

## What each test covers

### `unit/lib/env.test.ts` — `envSchema` (`src/lib/env.ts`)

The zod schema that validates `DATABASE_URL`, `REDIS_URL` and `NODE_ENV`. This is the schema itself (`envSchema.safeParse`), not the eagerly-parsed `env` singleton, so a bad input here doesn't throw or crash the test process.

| Test                                            | Input                                           | Expected outcome                                                  |
| ----------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| accepts a valid `DATABASE_URL` and `REDIS_URL`  | Well-formed `postgresql://` and `redis://` URLs | `safeParse` succeeds (`result.success === true`)                  |
| rejects a missing `DATABASE_URL`                | `DATABASE_URL` omitted entirely                 | `safeParse` fails (`result.success === false`)                    |
| rejects a `DATABASE_URL` that isn't a URL       | `DATABASE_URL: "not-a-url"`                     | `safeParse` fails                                                 |
| defaults `NODE_ENV` to development when omitted | Valid URLs, no `NODE_ENV`                       | `safeParse` succeeds and `result.data.NODE_ENV === "development"` |

Why it matters: this schema is what makes the app fail fast with a readable error at server startup (`src/instrumentation.ts`) instead of crashing later inside a database call, or (as happened once) crashing Next's own dev error overlay when the raw `ZodError` propagated unhandled. These tests protect the validation rules themselves; they don't touch a real database or Redis.

### `unit/lib/utils.test.ts` — `cn` (`src/lib/utils.ts`)

The shadcn/ui class-name merge helper (`clsx` + `tailwind-merge`).

| Test                                                 | Input                                  | Expected outcome                                                     |
| ---------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| joins class names                                    | `cn("a", "b")`                         | Returns `"a b"`                                                      |
| drops falsy values                                   | `cn("a", false, undefined, null, "b")` | Returns `"a b"` (falsy args ignored)                                 |
| resolves conflicting Tailwind classes, last one wins | `cn("px-2", "px-4")`                   | Returns `"px-4"` (later class overrides the earlier conflicting one) |

Why it matters: every component in `src/components/ui/` and the shell/state components use `cn()` to merge a caller-supplied `className` with a component's own default classes. If it stopped deduplicating conflicting utility classes correctly, styling overrides on every component would silently misbehave.

### `rtl/shell/sidebar-nav.test.tsx` — `SidebarNav` (`src/components/shell/sidebar-nav.tsx`)

The nav link list used in both the desktop sidebar and the mobile drawer. `next/navigation`'s `usePathname` is mocked to return `/directory` so the "active route" behavior is deterministic.

| Test                                      | What it does                                                                | Expected outcome                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| renders a link for every nav item         | Renders `<SidebarNav />`                                                    | A link with an accessible name of Dashboard, Directory, Catalog and Settings each exist              |
| marks the current route as active         | Renders with the mocked pathname `/directory`                               | The Directory link has `aria-current="page"`; the Dashboard link does not have `aria-current` at all |
| calls `onNavigate` when a link is clicked | Renders with an `onNavigate` spy, clicks the Dashboard link via `userEvent` | The spy is called exactly once                                                                       |

Why it matters: `onNavigate` is how the mobile `Sheet` drawer closes itself after the user picks a destination (`src/components/shell/mobile-nav.tsx`). If it stopped firing, the mobile menu would stay open after navigating.

### `rtl/shell/workspace-switcher.test.tsx` — `WorkspaceSwitcher` (`src/components/shell/workspace-switcher.tsx`)

The workspace-picker dropdown. Currently backed by two hardcoded workspaces (no tenancy model exists until WEB-133), so this only checks the default rendered state, not switching between workspaces yet.

| Test                                              | What it does                    | Expected outcome                                                                    |
| ------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| shows the default active workspace on the trigger | Renders `<WorkspaceSwitcher />` | The trigger button (accessible name "Switch workspace") contains the text "Webifex" |

Why it matters: catches a broken initial render (e.g. the default workspace failing to resolve, or the trigger's accessible name changing and silently breaking screen-reader/keyboard users). Extend this file with a selection test once WEB-133 makes workspace switching do something real.

### `rtl/states/empty-state.test.tsx` — `EmptyState` (`src/components/states/empty-state.tsx`)

Used on every placeholder route (`/`, `/directory`, `/catalog`, `/settings`) until real data exists.

| Test                                      | What it does                                           | Expected outcome                                                          |
| ----------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| renders the title, description and action | Renders with a title, description and an action button | All three are present in the document                                     |
| omits the description when none is given  | Renders with only a title                              | The title renders; nothing errors from the missing optional `description` |

### `rtl/states/loading-state.test.tsx` — `LoadingState` (`src/components/states/loading-state.tsx`)

Rendered by `src/app/loading.tsx` (Next's route-level loading UI).

| Test                                          | What it does                        | Expected outcome                                                                                                  |
| --------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| announces a loading status                    | Renders `<LoadingState />`          | An element with `role="status"` and an accessible name matching "loading" exists (so assistive tech announces it) |
| renders the requested number of skeleton rows | Renders `<LoadingState rows={5} />` | Exactly 5 elements with `data-slot="skeleton"` are in the DOM                                                     |

### `rtl/states/error-state.test.tsx` — `ErrorState` (`src/components/states/error-state.tsx`)

Rendered by `src/app/error.tsx` (Next's route-level error boundary), wired to Next's `retry()`.

| Test                                             | What it does                                                      | Expected outcome                                   |
| ------------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------- |
| renders the title and description                | Renders `<ErrorState />` with defaults                            | The default title and description text are present |
| calls `onRetry` when the retry button is clicked | Renders with an `onRetry` spy, clicks "Try again" via `userEvent` | The spy is called exactly once                     |
| does not render a retry button without `onRetry` | Renders `<ErrorState />` with no `onRetry` prop                   | No "Try again" button exists in the document       |

Why it matters: `onRetry` is how a user recovers from a transient error without a full page reload (Next's `error.tsx` passes its own `retry()` through as this prop). The last test guards against always showing a non-functional retry button.

### `rtl/states/permission-denied.test.tsx` — `PermissionDenied` (`src/components/states/permission-denied.tsx`)

Rendered by `src/app/forbidden.tsx` (Next's `forbidden()` file convention, enabled via `experimental.authInterrupts`), ahead of WEB-133 wiring up real authorization checks.

| Test                                                      | What it does                                 | Expected outcome                                                        |
| --------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| renders the default access-denied message and a link home | Renders `<PermissionDenied />` with defaults | "Access denied" is present; a "Return home" link exists with `href="/"` |
| renders a custom message when given                       | Renders with a custom `message` prop         | The custom message text is present instead of the default               |

## Running

From the repo root, or from `apps/web`:

```bash
npm run test          # run once
npm run test:watch    # watch mode
```

`jest.config.mjs` uses `next/jest`, which discovers every `*.test.ts`/`*.test.tsx` under this folder automatically, no per-file registration needed.

## Environment

`apps/web/.env.test` holds dummy `DATABASE_URL`/`REDIS_URL` values. `next/jest` loads it automatically whenever `NODE_ENV=test` (which Jest sets itself), so importing `@/lib/env` in a test doesn't need real database credentials. It's committed like `.env.example`; real secrets never go in it.
