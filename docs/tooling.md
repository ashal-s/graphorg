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
| Playwright                           | Browser E2E                                     |
| Pino                                 | Structured app logger API                       |
| Better Stack                         | Uptime heartbeats only                          |
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
