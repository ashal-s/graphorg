# Docs

The GraphOrg architecture (product boundaries, user journeys, monorepo structure, runtime components, data ownership rules and ADRs) is recorded in Linear as the [GraphOrg Architecture](https://linear.app/webifex/document/graphorg-architecture-44d635b43cc2) document (WEB-127), kept up to date there rather than duplicated here.

This folder holds repo-local reference material that belongs next to the code:

| Doc                                    | What it covers                                                              |
| -------------------------------------- | --------------------------------------------------------------------------- |
| [ai-local-setup.md](ai-local-setup.md) | Running Ask AI locally (Ollama, Redis, AI worker, web app env, rate limits) |

For schema and migrations see `apps/web/src/db/README.md`. For the test layout see `apps/web/tests/README.md`. For provisioning (still empty in MVP) see `infra/README.md`.
