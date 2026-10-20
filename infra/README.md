# Infra

Local observability config lives under [`observability/`](./observability/) (OpenTelemetry Collector for WEB-223; Grafana/Tempo/Prometheus land in WEB-224).

Terraform modules, Helm charts and Ansible playbooks for provisioning AWS (VPC, EKS, ECS Fargate, RDS, ElastiCache, S3, IAM, ALB, Secrets Manager) land here in **Post-MVP — Cloud, CI/CD & Observability** (WEB-147, WEB-148). Branch for that work: `cloud-cicd-observability`.

Local development otherwise uses `docker-compose.yml` at the repo root (Postgres, Redis, otel-collector). Production today is Next.js on Vercel with Neon Postgres and a Redis provider.
