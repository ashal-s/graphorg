---
title: Phase 2 tooling
description: Free-tier tooling role map — CodeRabbit, Mintlify, CI, observability, and SaaS lanes.
---

# Phase 2 tooling

Free-tier / OSS developer and ops tooling for the GraphOrg monorepo. Each tool has one job. Missing SaaS keys should no-op so local `npm run dev` still works.

**Anti-overlap:** only the CI trio may share a job (GitHub Actions ↔ Jenkins ↔ Buildkite). Everything else is single-owner.

| Tool                                             | Unique job                                      |
| ------------------------------------------------ | ----------------------------------------------- |
| **CodeRabbit**                                   | AI pull-request review                          |
| Mintlify                                         | Public docs site                                |
| **GitHub Actions** / **Jenkins** / **Buildkite** | CI (allowed overlap; GHA is primary)            |
| **Playwright**                                   | Browser E2E                                     |
| **Pino**                                         | Structured app logger API                       |
| **Better Stack**                                 | Uptime heartbeats only                          |
| **Resend**                                       | Transactional email                             |
| **Sentry**                                       | Exceptions only (no APM / replay)               |
| **PostHog**                                      | Product analytics + session replay (flags off)  |
| **LaunchDarkly**                                 | Feature flags only                              |
| **OpenTelemetry**                                | Emit traces / metrics / logs                    |
| **Grafana**                                      | Dashboards on OTel                              |
| **Databricks Free Edition**                      | Offline analytics on exported events (not Neon) |

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

## GitHub Actions (primary CI)

**Role:** primary CI on push and pull request. **Allowed overlap** with Jenkins and Buildkite — those should run the **same** checks later. Do not remove this workflow when the other two land.

**Repo config:** [`.github/workflows/ci.yml`](https://github.com/ashal-s/graphorg/blob/development/.github/workflows/ci.yml). Dependabot: [`.github/dependabot.yml`](https://github.com/ashal-s/graphorg/blob/development/.github/dependabot.yml) (weekly PRs, not a required check).

**Free tier:** included with GitHub. Private repos have a monthly Actions minutes quota — three jobs (web, e2e, ai-worker) on every push adds up; the workflow cancels in-progress runs on the same ref.

**Triggers:** push to `main` and `development`, and every pull request.

### Jobs (current gates)

| Job         | What it runs                                     | Needs live Postgres/Redis?                 |
| ----------- | ------------------------------------------------ | ------------------------------------------ |
| `web`       | Prettier, ESLint, `tsc`, Jest, `next build`      | No (placeholder URLs + `AUTH_SECRET` only) |
| `e2e`       | Playwright Chromium smoke (`/welcome`, `/login`) | No (health + public pages)                 |
| `ai-worker` | `pytest`                                         | No                                         |

CI **does not** set Sentry, PostHog, Resend, LaunchDarkly, or `OTEL_EXPORTER_OTLP_ENDPOINT`. Those paths no-op without keys, and CI should keep proving that.

Placeholder env on the `web` / `e2e` jobs:

```bash
DATABASE_URL=postgresql://graphorg:graphorg@127.0.0.1:5433/graphorg
REDIS_URL=redis://127.0.0.1:6379
AUTH_SECRET=ci-web-auth-secret-at-least-32-chars   # e2e uses its own 32+ char value
```

E2E also sets `AUTH_TRUST_HOST=true` and `AUTH_URL=http://127.0.0.1:3000`. Download the `playwright-report` artifact from a run to inspect failures.

### Not gated yet (and why)

| Idea                                    | Verdict                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Ruff / type check on `ai-worker`        | Worth adding once a Ruff config exists. Pytest is the only Python gate today.                                      |
| Postgres + Redis service containers     | Not needed for current Jest/Playwright. Add when a test actually opens the DB.                                     |
| `npm audit` as a failing gate           | Noisy on this tree (known transitive advisories). Dependabot PRs are the lighter signal.                           |
| Secret scanning in the workflow         | Use GitHub’s own **secret scanning + push protection** (repo Settings → Code security). Don’t commit `.env.local`. |
| CodeQL                                  | Optional later; overlaps CodeRabbit for review, not for compile/test.                                              |
| OTel / Grafana / Sentry / PostHog in CI | Out of lane — those are runtime observability, not PR gates.                                                       |

**Not required:** GitHub secrets for local SaaS keys. CI stays green without them.

---

## Jenkins (local CI)

**Role:** the **same checks** as GitHub Actions, run on your machine. GitHub Actions stays primary. Buildkite (WEB-221) should mirror this set too.

**Repo config:** [`Jenkinsfile`](https://github.com/ashal-s/graphorg/blob/development/Jenkinsfile) (web → Playwright e2e → ai-worker pytest) and the Compose service built from [`infra/jenkins/Dockerfile`](https://github.com/ashal-s/graphorg/blob/development/infra/jenkins/Dockerfile).

**Free tier:** Jenkins OSS. You host it; the software is free.

### Start

```bash
docker compose up -d --build jenkins
```

UI: [http://localhost:8080](http://localhost:8080). Agent port **50000** is published for a future inbound agent; the built-in controller runs the Jenkinsfile, so you do not need it for the local job. The Compose service raises Jetty's request-header limit (`JENKINS_OPTS=--requestHeaderSize=262144`) because cookies set by other apps on `localhost` are sent to this port too, and the 8KB default returns HTTP 431.

First launch:

1. Unlock with the initial admin password:

```bash
docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

2. Install the **suggested** plugins and create the admin user.
3. New Item → **Pipeline** → Definition: **Pipeline script from SCM** → Git. Repository URL: `https://github.com/ashal-s/graphorg.git`, branch `*/development`, script path `Jenkinsfile`.
4. Build now. The run uses placeholder `DATABASE_URL` / `REDIS_URL` / `AUTH_SECRET` and does **not** need Postgres, Redis, or any SaaS key. The Playwright HTML report is archived on the build.

### Docker Desktop on Mac

Checks run **inside the Jenkins container** (Node 20, uv/Python 3.12, Playwright’s Chromium libraries are in the image). The Docker socket is **not** mounted.

Do not switch this to Docker-in-Docker or `agent { docker { ... } }` on a Mac without reading this: Docker Desktop’s daemon lives in a Linux VM. `/var/run/docker.sock` on the Mac is a proxy into that VM. A sibling container can see host paths under `/Users`, but it **cannot** see `/var/jenkins_home` from inside the Jenkins container. Pipelines that `docker run -v $WORKSPACE` then fail with empty directories. That is why the socket stays off.

**Not required** for `npm run dev` or for GitHub Actions. Jenkins is optional local CI.

---

## Buildkite (CI pipeline)

**Role:** the **same checks** as GitHub Actions and Jenkins. GitHub Actions stays primary. Do not remove the workflow or the Jenkinsfile when this pipeline exists.

**Repo config:** [`.buildkite/pipeline.yml`](https://github.com/ashal-s/graphorg/blob/development/.buildkite/pipeline.yml) — web (format, lint, typecheck, Jest, build), Playwright e2e, ai-worker pytest. Placeholder `DATABASE_URL` / `REDIS_URL` / `AUTH_SECRET`. No SaaS keys.

**Free tier:** [Buildkite Free](https://buildkite.com/pricing) — up to 5 users and 10 concurrent self-hosted jobs. A new account starts with a 30-day all-access trial and no credit card. After the trial, stay on Free. Jobs in this pipeline are meant to run on an agent on your machine, so they do not spend the hosted-agent vCPU minutes.

The agent needs Node.js 20+, Python 3.12 (`python3.12` on `PATH`), and git. On Linux the e2e step also installs Chromium’s OS libraries. On a Mac it only downloads the browser.

### What you do (one-time)

1. Sign up at [buildkite.com/signup](https://buildkite.com/signup). Create an organization. Skip hosted agents.
2. **New pipeline**. Connect the GitHub app and choose `ashal-s/graphorg`. Leave the steps path as `.buildkite/pipeline.yml`.
3. Set the pipeline’s default branch to `development` (that is the branch that contains this file until it is on `main`).
4. In the cluster sidebar open **Agent Tokens** (not **Secrets**) → **New Token**. Leave **Allowed IP addresses** empty. Copy the token from the creation screen. The list never shows it again. Keep it out of the repo.
5. **Queues → New Queue**. Key `self-hosted`. Choose **Self-hosted**, not Hosted. The cluster’s existing default queue is hosted, and a Mac agent cannot join it. The pipeline targets `self-hosted`.
6. On your Mac, in a terminal you can leave open. Homebrew refuses the Buildkite tap until you trust that formula:

   ```bash
   brew trust --formula buildkite/buildkite/buildkite-agent@3
   brew install buildkite/buildkite/buildkite-agent
   buildkite-agent start --token "paste-token-here" --tags "queue=self-hosted"
   ```

7. On the pipeline page, **New Build**, branch `development`.

The three steps match GitHub Actions. The Playwright HTML report is uploaded as a build artifact. The agent must stay running for the build to be picked up.

**Not required** for `npm run dev` or for GitHub Actions. Buildkite is optional local CI.

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

The `e2e` job in GitHub Actions installs Chromium, builds, runs `npm run test:e2e`, and uploads the HTML report artifact. See [GitHub Actions](#github-actions-primary-ci) for the full gate list.

The root [`Jenkinsfile`](https://github.com/ashal-s/graphorg/blob/development/Jenkinsfile) and [`.buildkite/pipeline.yml`](https://github.com/ashal-s/graphorg/blob/development/.buildkite/pipeline.yml) run the same `npm run test:e2e`. Do not invent a second E2E suite.

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

---

## Resend (transactional email)

**Role:** transactional email only (member-added notice, future invites). **Not** a marketing platform and **not** the auth provider (Auth.js + credentials stay).

**Repo config:**

- Mailer: [`apps/web/src/lib/email/resend.ts`](https://github.com/ashal-s/graphorg/blob/development/apps/web/src/lib/email/resend.ts) — `sendEmail` / `notifyMemberAdded` no-op when `RESEND_API_KEY` is unset.
- Templates (React Email): [`apps/web/emails/`](https://github.com/ashal-s/graphorg/blob/development/apps/web/emails) — `member-added`, `welcome`, `invite`.

Creating a member (`POST /api/users`) renders `member-added` and sends it (never includes the password). `welcome` / `invite` are scaffolded for preview; invite is not wired to send yet.

**Free tier:** [Resend free](https://resend.com/pricing) monthly send quota. No credit card to start. Stay on free for scaffolding.

### Preview templates (React Email dashboard)

```bash
npm run email:dev --workspace=apps/web
```

Opens the React Email preview UI on [http://localhost:3334](http://localhost:3334) (port chosen to avoid Next on 3000 and Mintlify on 3333). Pick a template in the sidebar; hot-reload as you edit.

### What you do (one-time send setup)

1. Sign up at [resend.com](https://resend.com) and create an API key.
2. Add to `apps/web/.env.local`:

```bash
RESEND_API_KEY=re_...
# optional; defaults to GraphOrg <onboarding@resend.dev>
EMAIL_FROM="GraphOrg <onboarding@resend.dev>"
```

3. Smoke-test (until a domain is verified, use `onboarding@resend.dev` as from, and send only to **your** Resend account email or `delivered@resend.dev`):

```bash
npm run email:test --workspace=apps/web -- delivered@resend.dev
```

4. For production, [verify a domain](https://resend.com/domains) and set `EMAIL_FROM` to an address on that domain.

**Not required** for local app boot or the email preview dashboard: Resend account or env vars. Missing key → mailer skips and logs at debug.

---

## Sentry (exceptions only)

**Role:** application **exceptions / error events** only (“is something broken?”). **Not** APM / performance (OpenTelemetry → Grafana), **not** session replay (PostHog), **not** uptime (Better Stack).

**Repo config:**

- Init: `apps/web/src/instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` via `instrumentation.ts`
- Capture: `app/error.tsx`, `app/global-error.tsx`, `onRequestError`
- Build: `withSentryConfig` in `next.config.ts` (source maps upload only when `SENTRY_AUTH_TOKEN` is set)
- Shared options: [`apps/web/src/lib/sentry/options.ts`](https://github.com/ashal-s/graphorg/blob/development/apps/web/src/lib/sentry/options.ts) — **no** `tracesSampleRate`, **no** `replayIntegration`

**Free tier:** [Sentry Developer](https://sentry.io/pricing/) free plan. No credit card to start. Stay on free for scaffolding.

### What you do (one-time)

1. Create a Sentry project (Next.js) in your org.
2. Add to `apps/web/.env.local`:

```bash
# Prefer the public DSN so client + server share one value
NEXT_PUBLIC_SENTRY_DSN=https://...@o....ingest.sentry.io/...
# optional server-only alias if you prefer not to expose the DSN on the client name
# SENTRY_DSN=...
```

3. Optional for readable production stack traces (CI / Vercel):

```bash
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_...
```

4. Restart `npm run dev`, trigger an error in the UI (or throw from a route), and confirm it appears under **Issues** in Sentry.

**Not required** for local boot: any Sentry env vars. Missing DSN → SDK initializes with no DSN and sends nothing.

---

## PostHog (analytics + session replay)

**Role:** product **analytics** and **session replay** only (“what did users do?”). **Not** exceptions (Sentry), **not** uptime (Better Stack), **not** feature flags (LaunchDarkly — WEB-220). PostHog flag evaluation is disabled in the SDK.

**Repo config:**

- Init: `apps/web/src/instrumentation-client.ts` via `posthog-js` (same file as Sentry client)
- Identify: `PostHogIdentify` in `AppShell` — `userId` + org group only (**no** email)
- Reset on logout in `UserMenu`
- Shared options: [`apps/web/src/lib/posthog/config.ts`](https://github.com/ashal-s/graphorg/blob/development/apps/web/src/lib/posthog/config.ts) — `advanced_disable_feature_flags`, session replay on with `maskAllInputs`

**Free tier:** [PostHog Cloud](https://posthog.com/pricing) free/generous tier. No credit card to start. Stay on free for scaffolding.

### What you do (one-time)

1. Create a PostHog project (US or EU cloud).
2. Add to `apps/web/.env.local`:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
# optional — defaults to US; use EU host if your project is there
# NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

3. In the PostHog project settings, leave **feature flags** unused (or ignore them) — the SDK opts out with `advanced_disable_feature_flags`. Enable **session replay** if the project wizard asks.
4. Restart `npm run dev`, sign in, click around, and confirm events / a replay appear in PostHog.

**Not required** for local boot: any PostHog env vars. Missing key → init is skipped (no-op).

---

## LaunchDarkly (feature flags)

**Role:** **feature flags only** (“is this feature on for this user/org?”). **Not** analytics (PostHog), **not** CI, **not** exceptions (Sentry). PostHog flag evaluation stays disabled in the JS SDK.

**Repo config:**

- Server SDK: [`@launchdarkly/node-server-sdk`](https://www.npmjs.com/package/@launchdarkly/node-server-sdk) via [`apps/web/src/lib/flags/launchdarkly.ts`](https://github.com/ashal-s/graphorg/blob/development/apps/web/src/lib/flags/launchdarkly.ts)
- Example flag: `ai-chat-enabled` — gates Ask AI UI (`AiChatGate`) and `POST /api/ai/chat` (default **`true`** when LD is unset)
- Optional `NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID` reserved for a future client SDK (not required for this ticket)

**Free tier:** [LaunchDarkly Developer](https://launchdarkly.com/pricing/) plan. No credit card to start. Stay on free for scaffolding.

### What you do (one-time)

1. Create a LaunchDarkly account / project (Developer plan).
2. Create a boolean flag with key **`ai-chat-enabled`** (default on is fine).
3. Copy the **server-side SDK key** (Settings → Projects → … → SDK keys — **not** the client-side ID).
4. Add to `apps/web/.env.local`:

```bash
LAUNCHDARKLY_SDK_KEY=sdk-...
# optional, unused by the server gate today:
# NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID=...
```

5. Restart `npm run dev`. Toggle the flag in the LD dashboard and confirm Ask AI appears/disappears after a refresh (and that `/api/ai/chat` returns 403 when off).

**Not required** for local boot: any LaunchDarkly env vars. Missing key → `variation(...)` returns the caller’s default (`ai-chat-enabled` → `true`).

---

## OpenTelemetry (traces + metrics)

**Role:** **instrumentation standard** — emit traces and metrics from `apps/web` and `services/ai-worker` over OTLP. **Not** a UI (Grafana — WEB-224), **not** exceptions (Sentry), **not** uptime (Better Stack), **not** session replay (PostHog).

**Repo config:**

- Web: `NodeSDK` in [`apps/web/src/instrumentation.node.ts`](https://github.com/ashal-s/graphorg/blob/development/apps/web/src/instrumentation.node.ts), loaded from `instrumentation.ts` when `OTEL_EXPORTER_OTLP_ENDPOINT` is set
- AI worker: [`services/ai-worker/src/ai_worker/otel.py`](https://github.com/ashal-s/graphorg/blob/development/services/ai-worker/src/ai_worker/otel.py) + FastAPI instrumentation
- Trace context: `POST /api/ai/chat` injects W3C `traceparent` on the upstream worker fetch
- Collector: Compose service `otel-collector` (ports **4317** gRPC / **4318** HTTP) with config at [`infra/observability/otel-collector-config.yaml`](https://github.com/ashal-s/graphorg/blob/development/infra/observability/otel-collector-config.yaml) — forwards to Tempo + Prometheus (see Grafana below)
- Pino → OTel log bridge: not wired yet (optional follow-up)

**Free tier:** OSS OpenTelemetry SDKs + OSS collector image. No SaaS required.

### What you do (local)

1. Start the observability stack (or full Compose):

```bash
docker compose up -d otel-collector tempo prometheus grafana
```

2. Add to `apps/web/.env.local` (and `services/ai-worker/.env` if you run the worker):

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# optional
# OTEL_SERVICE_NAME=graphorg-web
```

3. Restart `npm run dev` and (if used) the AI worker. Hit a few pages / Ask AI.
4. Open Grafana at [http://localhost:3001](http://localhost:3001) (anonymous Viewer; sign in as admin/admin to explore) — see the Grafana section below.

**Not required** for local boot: any OTel env vars. Missing endpoint → SDK is not started (safe no-op even if the collector is down).

---

## Grafana (OTel dashboards)

**Role:** dashboards / Explore UI on **OpenTelemetry** system telemetry (Tempo traces + Prometheus metrics) — “how is the system performing?”. **Not** uptime (Better Stack), **not** exceptions (Sentry), **not** session replay / product analytics (PostHog).

**Repo config:**

- Compose: `tempo`, `prometheus`, `grafana`, `otel-collector` in [`docker-compose.yml`](https://github.com/ashal-s/graphorg/blob/development/docker-compose.yml)
- Provisioning + starter dashboard under [`infra/observability/`](https://github.com/ashal-s/graphorg/blob/development/infra/observability/)

**Ports (host):**

| Service        | Port | Notes                                |
| -------------- | ---- | ------------------------------------ |
| Grafana        | 3001 | UI on localhost (Next.js keeps 3000) |
| Prometheus     | 9090 | Metrics UI / API, localhost only     |
| Tempo          | 3200 | Trace query API                      |
| OTel collector | 4318 | OTLP HTTP (apps point here)          |
| OTel collector | 4317 | OTLP gRPC                            |

**Free tier:** Grafana OSS + Tempo + Prometheus in Docker Compose — fully free, no cloud account.

### What you do (local)

1. `docker compose up -d otel-collector tempo prometheus grafana`
2. Ensure `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` and restart the app; click around.
3. Open **http://localhost:3001**. The port is bound to localhost. Anonymous visitors are Viewers and can open dashboards. Sign in as admin/admin for Explore and admin actions.
4. Confirm **Connections → Data sources** lists **Prometheus** and **Tempo**.
5. Open dashboard **GraphOrg → GraphOrg OTel overview** (or Dashboards → search `OTel`).
6. **Explore → Tempo** → search service `graphorg-web` for traces.

**Not required** for `npm run dev`: Grafana stack. Apps boot without OTel; Grafana is optional local tooling.

---

## Databricks Free Edition (analytics export)

**Role:** offline analytics on **exported events**. A learning scaffold for the lakehouse. **Not** the app database — Neon/Postgres stays the source of truth for people, teams, and the rest of the org graph. **Not** product analytics (PostHog) and **not** the commercial Databricks platform deferred to Post-MVP.

**Repo config:**

- Event shapes: [`analytics/events.schema.md`](https://github.com/ashal-s/graphorg/blob/development/analytics/events.schema.md)
- Sample writer: `npm run analytics:export --workspace=apps/web` → gitignored `analytics/exports/events.jsonl`
- Notebook: [`analytics/databricks/01_explore_exports.py`](https://github.com/ashal-s/graphorg/blob/development/analytics/databricks/01_explore_exports.py)
- Steps: [`analytics/README.md`](https://github.com/ashal-s/graphorg/blob/development/analytics/README.md)

**Free tier:** [Databricks Free Edition](https://www.databricks.com/learn/free-edition) (Community Edition is retired). Personal and non-commercial only. Serverless, quota-limited, no SLA. Databricks may pause compute when you hit fair-use limits and may delete an inactive account. Do not point production traffic at it.

### What you do (one-time)

1. Sign up at [databricks.com/learn/free-edition](https://www.databricks.com/learn/free-edition) with Google, Microsoft, or an email code.
2. Generate the sample (no database, no API key):

   ```bash
   npm run analytics:export --workspace=apps/web
   ```

3. In the workspace, **Catalog → default schema → Create volume** named `graphorg`.
4. **New → Add or upload data → Upload files to a volume**, and upload `analytics/exports/events.jsonl`. Free Edition will not let the notebook download that file.
5. Copy the volume path (`/Volumes/<catalog>/default/graphorg/events.jsonl`).
6. **Workspace → Import** `analytics/databricks/01_explore_exports.py`.
7. Paste the path into `EVENTS_PATH`, attach serverless compute, and **Run all**.

The sample has 5 `page_view` events and 3 `ai_chat_completed` events. No emails, names, or photo URLs.

**Not required** for `npm run dev`. Nothing in the app calls Databricks.
