# Production hosting

The live GraphOrg website is a Next.js app on Vercel. Postgres is Neon. Redis is Upstash. Vercel builds the app from the Git repository. It does not use `apps/web/Dockerfile`.

The app reads one configuration surface, `apps/web/.env.local` in development and Vercel environment variables in production. Missing optional keys turn that integration off. The process still boots.

## Runtime

| Piece    | Production service | What the app uses it for                                             |
| -------- | ------------------ | -------------------------------------------------------------------- |
| Web app  | Vercel             | Next.js UI, Route Handlers, and server actions                       |
| Postgres | Neon               | People, teams, departments, documents, and the rest of the org graph |
| Redis    | Upstash            | Login and Ask AI rate limits (`INCR` / `EXPIRE`)                     |
| Sessions | Auth.js on Vercel  | Signed with `AUTH_SECRET` (at least 32 characters)                   |

`DATABASE_URL` is the Neon pooled connection string (the host contains `-pooler`). `DATABASE_URL_UNPOOLED` is the direct Neon URL, used by `drizzle-kit` migrations. `REDIS_URL` is the Upstash Redis URL. The client is created on first use in `apps/web/src/lib/redis.ts`. Login rate limiting fails open if Redis is down.

Vercel deploys on push to the connected production branch. A preview deployment is a separate Vercel environment with its own env vars. It is not the kind cluster and it is not the Compose stack.

## Tools on the production path

These run against the deployed site or the Vercel build when their keys are set.

| Tool          | Role on production                                                                  | Off when                                           |
| ------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| Sentry        | Exceptions only. Source maps upload when `SENTRY_AUTH_TOKEN` is set at build time   | No DSN                                             |
| PostHog       | Product analytics and session replay. Feature flags in the PostHog SDK are disabled | No `NEXT_PUBLIC_POSTHOG_KEY`                       |
| LaunchDarkly  | Feature flags. `ai-chat-enabled` gates Ask AI and `POST /api/ai/chat`               | No `LAUNCHDARKLY_SDK_KEY` (the flag then stays on) |
| Resend        | Transactional email                                                                 | No API key (the mailer skips the send)             |
| Better Stack  | Uptime monitor of the public `GET /api/health` URL. No SDK in the app               | Monitor not created                                |
| OpenTelemetry | Traces and metrics, only if `OTEL_EXPORTER_OTLP_ENDPOINT` is set on Vercel          | Variable unset (the SDK does not start)            |

Pino writes JSON logs to stdout. On Vercel those lines are the function logs. They are not shipped to Grafana.

## Tools around the repo

These do not serve a page request.

| Tool                    | Role                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| GitHub Actions          | Primary CI. `.github/workflows/ci.yml` runs on push to `main` and `development`, and on every pull request |
| CodeRabbit              | AI review comments on pull requests. Config is `.coderabbit.yaml`. It does not run in the website          |
| Mintlify                | Public docs site built from `docs/`. It is not the product UI                                              |
| Jenkins                 | Local copy of the GitHub Actions checks. It does not deploy production                                     |
| Buildkite               | The same checks again, on an agent you run. GitHub Actions stays the gate                                  |
| Databricks Free Edition | Offline notebook over an exported event file. The app never calls it. Neon stays the database of record    |

CI does not receive Sentry, PostHog, Resend, LaunchDarkly, or OpenTelemetry keys. Those paths are the no-op ones in CI.

Each tool’s setup steps are in [tooling.md](tooling.md).
