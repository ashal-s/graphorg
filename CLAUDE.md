@AGENTS.md

# Every page has a copy-context button

Each page under `apps/web/src/app/(app)` shows a copy icon in its header that puts the page's context on the clipboard as JSON, to paste into an AI for advice or review.

- `PageHeader` requires a `context` prop: a `ContextScope` from `src/lib/page-context/types.ts`, or `null` where copying makes no sense (e.g. a "new" form). Pages with their own header render `CopyContextButton` directly.
- New page: add a scope kind to `types.ts`, a builder in `src/lib/page-context/builders/`, and a `case` in `build.ts` (the switch is exhaustive, so it won't compile until you do).
- Keep context shallow: the page's own record in full, related records as `{ name, path, ... }` references only. The record's own page carries its full detail.
- Leave out emails (except on that person's own page), credentials and photo URLs.
- `tests/unit/lib/page-context/coverage.test.ts` fails if a page has neither button nor an entry in its `NO_CONTEXT` list.
