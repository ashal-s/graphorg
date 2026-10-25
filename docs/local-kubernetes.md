# Local Kubernetes

The local cluster is a second way to run the same Next.js app. It does not replace `npm run dev`, and it does not deploy to Vercel or Neon.

kind runs Kubernetes inside Docker. The cluster name is `graphorg` (kubectl context `kind-graphorg`). Postgres, Redis, Jenkins, and the observability stack stay on Docker Compose. The cluster only runs the web process.

## Nodes

`infra/kind/cluster.yaml` defines three nodes. Each node is a Docker container. They share the Docker Desktop VM kernel.

| Node                     | Role          | What runs there                                                                      |
| ------------------------ | ------------- | ------------------------------------------------------------------------------------ |
| `graphorg-control-plane` | Control plane | API server, scheduler, controller manager, and etcd. App pods are kept off this node |
| `graphorg-worker`        | Worker        | Application pods, plus `kindnet` and `kube-proxy`                                    |
| `graphorg-worker2`       | Worker        | The same                                                                             |

`kindnet` gives pods their IP addresses and routes between nodes. `kube-proxy` implements Service addresses. etcd stores Kubernetes objects. Compose Postgres data is not in etcd. Deleting a pod does not delete the database.

The node image is pinned to Kubernetes 1.34.11 so it matches `kubectl`.

## Namespaces

| Namespace    | Contents                                                                           |
| ------------ | ---------------------------------------------------------------------------------- |
| `graphorg`   | The web Deployment, Service, ConfigMap, and Secret                                 |
| `monitoring` | Empty. Prometheus, Grafana, Tempo, and the OpenTelemetry Collector stay on Compose |
| `ci`         | Empty. Jenkins stays on Compose                                                    |

## What runs in `graphorg`

`infra/k8s/graphorg/web.yaml` holds three objects:

- **ConfigMap `graphorg-web`** — `AUTH_URL` (`http://localhost:30080`), `AUTH_TRUST_HOST`, and the OpenTelemetry endpoint `http://host.docker.internal:4318`.
- **Deployment `graphorg-web`** — one replica. The container is `graphorg-web:local`, with `imagePullPolicy: Never`, because the image is loaded into each node’s containerd with `kind load`. It is not pulled from a registry. Requests are 50m CPU and 128Mi memory. Limits are 250m CPU and 384Mi memory. Startup, readiness, and liveness all call `GET /api/health`.
- **Service `graphorg-web`** — a ClusterIP on port 3000. It selects pods labeled `app=graphorg-web` that are Ready (`1/1`). A pod at `0/1` is running and is not in the Service yet.

The Secret `graphorg-web` is created with kubectl and is not in git. It holds `DATABASE_URL`, `REDIS_URL`, and `AUTH_SECRET`.

`DATABASE_URL` points at Compose Postgres through `host.docker.internal:5433`. `REDIS_URL` points at Compose Redis on port 6379. Inside a pod, `localhost` is the pod, so those URLs cannot use `localhost`. The pod spec maps `host.docker.internal` to `192.168.65.254`, the Docker Desktop host address on this machine. Kind pods do not inherit Docker's DNS for that name. If the address changes, read it with `docker exec graphorg-worker getent hosts host.docker.internal` and update `hostAliases` in `infra/k8s/graphorg/web.yaml`.

There is no Horizontal Pod Autoscaler. The replica count stays at 1 until someone runs `kubectl scale`. A rolling update starts a new pod, waits until it is Ready, then removes the old one. `kubectl rollout undo` returns to the previous pod template.

`kubectl port-forward` to the Service binds port 30080 on the Mac to one pod’s port 3000. That tunnel stays on the pod it picked. If that pod is deleted, start the forward again. A real load balancer would send the next request to any Ready pod. This tunnel does not.

## Compose services the pod depends on

Start Postgres and Redis before the pod. Their volumes hold the data.

| Compose service  | Host port | Cluster stand-in                    |
| ---------------- | --------- | ----------------------------------- |
| `postgres`       | 5433      | RDS                                 |
| `redis`          | 6379      | ElastiCache                         |
| `otel-collector` | 4318      | The collector the pod exports to    |
| `tempo`          | 3200      | Trace store                         |
| `prometheus`     | 9090      | Metrics store                       |
| `grafana`        | 3001      | UI for Tempo and Prometheus         |
| `jenkins`        | 8080      | CI. It does not deploy this cluster |

Grafana at http://localhost:3001 reads traces for the service name `graphorg-web`. Jenkins at http://localhost:8080 runs the `Jenkinsfile` checks inside its own container. The Docker socket is not mounted, so that job does not build the image or roll the Deployment.

## Deploy

From the repo root, with Docker Desktop running.

Create the cluster and the namespaces:

```bash
kind create cluster --config infra/kind/cluster.yaml
kubectl apply -f infra/kind/namespaces.yaml
```

Build the image and copy it onto every node. Repeat the load after `kind delete cluster` / `kind create cluster`. A reboot does not require a rebuild while the node containers still exist.

```bash
docker build -f apps/web/Dockerfile -t graphorg-web:local .
kind load docker-image graphorg-web:local --name graphorg
```

Create the Secret from the local env file. The value never goes into a manifest.

```bash
AUTH_SECRET=$(awk -F= '/^AUTH_SECRET=/{print substr($0, index($0,"=")+1)}' apps/web/.env.local)
kubectl create secret generic graphorg-web --namespace graphorg \
  --from-literal=DATABASE_URL=postgresql://graphorg:graphorg@host.docker.internal:5433/graphorg \
  --from-literal=REDIS_URL=redis://host.docker.internal:6379 \
  --from-literal=AUTH_SECRET="$AUTH_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -
unset AUTH_SECRET
```

Apply the app and open it:

```bash
kubectl apply -f infra/k8s/graphorg/web.yaml
kubectl rollout status deploy/graphorg-web -n graphorg
kubectl port-forward -n graphorg svc/graphorg-web 30080:3000
```

The site is http://localhost:30080. Compose Postgres must already be migrated and seeded (`npm run db:migrate` and `npm run db:seed` from the root README). Sign in with workspace `acme`, `priya@acme.example`, and `acme-demo-password`.

Changing the ConfigMap does not restart a running pod. After an env change, apply the file and run:

```bash
kubectl rollout restart deploy/graphorg-web -n graphorg
```

Useful checks:

```bash
kubectl get pods -n graphorg -o wide
kubectl logs -n graphorg deploy/graphorg-web
kubectl rollout history deploy/graphorg-web -n graphorg
```

A successful OpenTelemetry start logs `opentelemetry sdk started` with `endpointOrigin` `http://host.docker.internal:4318`. The collector, Tempo, Prometheus, and Grafana have to be up (`docker compose up -d otel-collector tempo prometheus grafana`) or the export has nowhere to go.
