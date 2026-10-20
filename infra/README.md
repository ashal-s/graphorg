# Infra

Local observability lives under [`observability/`](./observability/):

| Path | Purpose |
| ---- | ------- |
| `otel-collector-config.yaml` | OTLP receive → Tempo + Prometheus |
| `tempo.yaml` | Local Tempo single-binary |
| `prometheus.yml` | Scrapes collector `:8889` |
| `grafana/` | Datasource + dashboard provisioning |

Compose services (repo root `docker-compose.yml`): `otel-collector`, `tempo`, `prometheus`, `grafana` (UI on **http://localhost:3001**). See [docs/tooling.md](../docs/tooling.md).

Terraform / Helm / Ansible for AWS land here in **Post-MVP — Cloud, CI/CD & Observability** (WEB-147, WEB-148). Branch: `cloud-cicd-observability`.

Otherwise local dev uses Compose for Postgres, Redis, and the observability stack. Production today is Next.js on Vercel with Neon Postgres and a Redis provider.