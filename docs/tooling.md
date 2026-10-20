---
title: Phase 2 tooling
description: Free-tier tooling role map — CodeRabbit, Mintlify, CI, observability, and SaaS lanes.
---

# Phase 2 tooling

Free-tier / OSS developer and ops tooling for the GraphOrg monorepo. Each tool has one job. Missing SaaS keys should no-op so local `npm run dev` still works.

**Anti-overlap:** only the CI trio may share a job (GitHub Actions ↔ Jenkins ↔ Buildkite). Everything else is single-owner.

| Tool                                 | Unique job                                      |
| ------------------------------------ | ----------------------------------------------- |
| **CodeRabbit**                       | AI pull-request review                          |
| Mintlify                             | Public docs site                                |
| GitHub Actions / Jenkins / Buildkite | CI (allowed overlap)                            |
| **Playwright**                       | Browser E2E                                     |
| **Pino**                             | Structured app logger API                       |
| **Better Stack**                     | Uptime heartbeats only                          |
| Resend                               | Transactional email                             |
| Sentry                               | Exceptions only (no APM / replay)               |
| PostHog                              | Product analytics + session replay (flags off)  |
| LaunchDarkly                         | Feature flags only                              |
| OpenTelemetry                        | Emit traces / metrics / logs                    |
| Grafana                              | Dashboards on OTel                              |
| Databricks Free Edition              | Offline analytics on exported events (not Neon) |

Neon/Postgres remains the app OLTP database.

---

## CodeRabbit (AI PR review)

**Role:** reviews pull requests on GitHub. Does **not** run CI, host docs, or collect telemetry.

**Repo config:** [`.coderabbit.yaml`](https://github.com/ashal-s/graphorg/blob/development/.coderabbit.yaml) at the monorepo root (path filters, chill profile, path-specific guidance). CodeRabbit reads the YAML from the **feature branch** under review.

**Free tier:** free for public repos and limited private use for learning. No credit card required to start. Paid plans apply for heavier private-team usage — stay on free for scaffolding.

### What you do (one-time install)

1. Open [CodeRabbit’s quickstart](https://docs.coderabbit.ai/getting-started/quickstart) and sign up with your **GitHub** account (no credit card).
2. Install / authorize the [CodeRabbit GitHub App](https://github.com/apps/coderabbitai) for the org or user that owns this repo.
3. Grant access to the **GraphOrg** repository (all repos, or select this one only).
4. Confirm the app appears under the repo’s **Settings → Integrations → GitHub Apps** (or **Installed GitHub Apps**).
5. Open a PR (or push to an existing PR). Within a few minutes CodeRabbit should post a walkthrough / review comments. You can chat with `@coderabbitai` on the PR.

Optional checks:

- Comment `@coderabbitai configuration` on a PR to see the resolved config (should pick up `.coderabbit.yaml`).
- Prefer leaving `enable_free_tier: true` in `.coderabbit.yaml` so free-tier features stay on for users not on a paid plan.

**Not required:** any Next.js SDK, env vars, or secrets in the app. Config is GitHub App + YAML only.

---

## Mintlify (public docs site)

**Role:** browsable public documentation only. Not the product UI. Architecture ADRs stay in Linear; this site seeds runbooks from `docs/` and links out to architecture.

**Repo config:** [`docs/docs.json`](docs.json) plus MD/MDX pages in `docs/` (`index.mdx`, `architecture.mdx`, `ai-local-setup.md`, `tooling.md`).

**Free tier:** [Mintlify Starter](https://www.mintlify.com/pricing) (formerly Hobby) — free, no credit card, Git sync, custom domain options. Stay on Starter for scaffolding.

### Local preview

From the repo root (Node 20.17+):

```bash
npm run docs:dev
```

That `cd`s into `docs/` and runs `npx mint@latest dev` on port **3333** so it does not clash with `apps/web` on 3000. Open [http://localhost:3333](http://localhost:3333).

Or:

```bash
cd docs && npx mint@latest dev --port 3333
```

### Publish (Starter)

1. Go to [mintlify.com/start](https://mintlify.com/start) and create a project (no card required).
2. Connect this GitHub repo. In Git settings, enable **docs.json is in a subdirectory** and set the path to `/docs` (no trailing slash). See [Monorepo setup](https://www.mintlify.com/docs/deploy/monorepo).
3. Install the Mintlify GitHub App so pushes to the connected branch deploy automatically.
4. Use the project’s `*.mintlify.app` / `*.mintlify.site` URL for the live site; add a custom domain later if needed.

**Not required:** any Next.js SDK or app env vars. Docs are static MD/MDX + `docs.json` only.

---

## Better Stack (uptime heartbeats)

**Role:** external uptime checks only (“is the service alive?”). **Not** an app log drain — Pino / OpenTelemetry / Grafana own logs. Do **not** install a Better Stack (Logtail) logging SDK in the app.

**App endpoint:** [`GET /api/health`](https://github.com/ashal-s/graphorg/blob/development/apps/web/src/app/api/health/route.ts) returns `200` with `{ "ok": true, "data": { "status": "ok" } }`. It is unauthenticated (`proxy.ts` excludes `/api` from the auth redirect matcher). Optional DB ping is deferred.

**Free tier:** [Better Stack free](https://betterstack.com/pricing) — personal projects, up to **10 monitors & heartbeats**, ~**3-minute** check interval, email/Slack alerts. No credit card to start. Stay on free for scaffolding (do not enable log ingest for this lane).

### What you do (one-time monitor)

1. Sign up at [betterstack.com](https://betterstack.com) (free).
2. Open **Uptime → Monitors → Create monitor**.
3. Set the URL to your deployed health endpoint, e.g. `https://graphorg.com/api/health` (or a tunnel URL for local demos).
4. Keep HTTP status monitoring (expect **2xx**). Optionally require the keyword `ok` in the body.
5. Choose email and/or Slack for alerts; create the monitor.

Verify locally when the web app is running:

```bash
curl -sS http://localhost:3000/api/health
# {"ok":true,"data":{"status":"ok"}}
```

**Not required:** Better Stack API keys or SDKs in `apps/web`. The monitor only needs a public URL.

---

## Playwright (browser E2E)

**Role:** browser end-to-end smoke tests only. Jest + RTL stay for unit/component tests (`apps/web/tests/unit`, `tests/rtl`).

**Repo config:** [`apps/web/playwright.config.ts`](https://github.com/ashal-s/graphorg/blob/development/apps/web/playwright.config.ts) + specs under `apps/web/tests/e2e/`. Chromium only for now.

**Free tier:** OSS (`@playwright/test`).

### Local

```bash
npm run test:e2e:install --workspace=apps/web   # once per machine
npm run test:e2e --workspace=apps/web           # builds, starts next, runs smoke
npm run test:e2e:report --workspace=apps/web    # open HTML report dashboard
```

Smoke covers `/welcome` and `/login`. The config starts `next start` with placeholder `DATABASE_URL` / `REDIS_URL` / `AUTH_SECRET` if unset (pages under test do not need a live DB).

**HTML dashboard:** every run writes `apps/web/playwright-report/`. Locally the report opens automatically on failure; otherwise run `test:e2e:report`. On CI, download the `playwright-report` artifact from the workflow run, then:

```bash
npx playwright show-report path/to/playwright-report   # or playwright-report.zip
```

### CI

GitHub Actions job `e2e` in [`.github/workflows/ci.yml`](https://github.com/ashal-s/graphorg/blob/development/.github/workflows/ci.yml) installs Chromium, builds, runs `npm run test:e2e`, and uploads the HTML report artifact.

Jenkins (WEB-222) and Buildkite (WEB-221) should **mirror the same** `test:e2e` command when those pipelines land — do not invent a second E2E suite.

---

## Pino (structured app logging)

**Role:** in-process structured logger (`info` / `warn` / `error` with fields) for server code. Writes JSON to stdout/stderr. **Not** a SaaS product and **not** a Better Stack / Sentry / Logtail drain — those tools keep their own lanes (uptime, exceptions). OpenTelemetry may bridge logs later (WEB-223).

**Repo config:** [`apps/web/src/lib/logger.ts`](https://github.com/ashal-s/graphorg/blob/development/apps/web/src/lib/logger.ts). Used from auth failures, AI rate-limit fail-open, and `instrumentation.ts` env validation. Client components (e.g. `error.tsx`) keep `console.*`.

**Free tier:** OSS (`pino`, `pino-pretty` in development).

### Usage

```ts
import { logger } from "@/lib/logger";

logger.info({ userId }, "session started");
logger.error({ err }, "sign-in failed");
```

Optional env (also validated in `env.ts` when set):

| Variable    | Effect                                                                  |
| ----------- | ----------------------------------------------------------------------- |
| `LOG_LEVEL` | `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` (optional) |

Defaults: `debug` outside production, `info` in production. Development uses `pino-pretty`; production and tests emit JSON lines.

**Not required:** any external account or API key. Do **not** install a Better Stack logging SDK for this lane.
