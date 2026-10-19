# Docs

The GraphOrg architecture (product boundaries, user journeys, monorepo structure, runtime components, data ownership rules and ADRs) is recorded in Linear as the [GraphOrg Architecture](https://linear.app/webifex/document/graphorg-architecture-44d635b43cc2) document (WEB-127), kept up to date there rather than duplicated here.

This folder is the **Mintlify** docs source (`docs.json` + pages). Preview locally with `npm run docs:dev` from the repo root (see [tooling.md](tooling.md#mintlify-public-docs-site)).

| Doc                                    | What it covers                                                              |
| -------------------------------------- | --------------------------------------------------------------------------- |
| [index.mdx](index.mdx)                 | Mintlify home — product overview and navigation                             |
| [architecture.mdx](architecture.mdx)   | Link-out to the Linear architecture document                                |
| [ai-local-setup.md](ai-local-setup.md) | Running Ask AI locally (Ollama, Redis, AI worker, web app env, rate limits) |
| [tooling.md](tooling.md)               | Phase 2 free-tier tooling (CodeRabbit, Mintlify, CI, observability)         |

For schema and migrations see `apps/web/src/db/README.md`. For the test layout see `apps/web/tests/README.md`. For provisioning (still empty in MVP) see `infra/README.md`.
