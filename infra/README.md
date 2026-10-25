# Infra

Local observability lives under [`observability/`](./observability/):

| Path                         | Purpose                             |
| ---------------------------- | ----------------------------------- |
| `otel-collector-config.yaml` | OTLP receive → Tempo + Prometheus   |
| `tempo.yaml`                 | Local Tempo single-binary           |
| `prometheus.yml`             | Scrapes collector `:8889`           |
| `grafana/`                   | Datasource + dashboard provisioning |

Compose services (repo root `docker-compose.yml`): `otel-collector`, `tempo`, `prometheus`, `grafana` (UI on **http://localhost:3001**), `jenkins` (UI on **http://localhost:8080**, image from [`jenkins/`](./jenkins/)). See [docs/tooling.md](../docs/tooling.md).

Terraform / Helm / Ansible for AWS land here in **Post-MVP — Cloud, CI/CD & Observability** (WEB-147, WEB-148). Branch: `cloud-cicd-observability`.

Otherwise local dev uses Compose for Postgres, Redis, and the observability stack. Production today is Next.js on Vercel with Neon Postgres and a Redis provider.


## Local Kubernetes

Cluster config is [`kind/cluster.yaml`](./kind/cluster.yaml). kind runs one control-plane node and two workers as Docker containers. The control-plane node runs the API server, scheduler, controller manager, and etcd. The workers are the data plane; application pods will run there. Namespaces are [`kind/namespaces.yaml`](./kind/namespaces.yaml).

| Namespace | Holds now |
| --- | --- |
| `graphorg` | GraphOrg web pod. Postgres and Redis stay on Compose.|
| `monitoring` | Empty. Prometheus, Grafana, Tempo, and the OpenTelemetry Collector stay on Compose. |
| `ci` | Empty. Jenkins stays on Compose. |
Postgres and Redis stay on Compose, outside the cluster. That is the local stand-in for RDS and ElastiCache: the pod has a hostname and a Secret, and the databases are not pods. `DATABASE_URL` and `REDIS_URL` use `host.docker.internal`, which is this Mac as seen from the kind nodes. The Compose volumes are the data. Replacing the GraphOrg pod does not replace them.

Inspect the cluster with:

    kubectl config current-context
    kubectl get nodes -o wide
    kubectl cluster-info
    kubectl get ns
    kubectl get pods -A