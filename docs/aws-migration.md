# AWS migration

This is the AWS shape of the local cluster. It is a design. Nothing in this document is applied, and `terraform apply` must not be run against it.

Production today stays on Vercel, Neon, and Upstash. Moving the website onto EKS is a separate decision from describing that shape. Vercel already builds and deploys on push. An EKS rollout replaces that path only if the app leaves Vercel.

## Service map

| Local                                        | AWS                                                           | Job                                        |
| -------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| kind cluster (`graphorg`)                    | EKS                                                           | Runs the web Deployment                    |
| kind nodes (Docker containers)               | EC2 instances in a managed node group, or Fargate             | The machines that run pods                 |
| `graphorg-web:local` loaded with `kind load` | ECR                                                           | Stores the web image                       |
| Compose Postgres                             | RDS for PostgreSQL 16                                         | The org-graph database                     |
| Compose Redis                                | ElastiCache for Redis                                         | Login and Ask AI rate limits               |
| Kubernetes Secret `graphorg-web`             | Secrets Manager                                               | `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET` |
| `kubectl port-forward`                       | An AWS load balancer in front of the Service                  | Public HTTP                                |
| Grafana + Tempo                              | CloudWatch and X-Ray, or Amazon Managed Grafana               | Metrics and traces                         |
| Pod stdout (`kubectl logs`)                  | CloudWatch Logs                                               | Log storage                                |
| GitHub Actions                               | GitHub Actions, building on a Linux runner and pushing to ECR | CI and deploy                              |
| Jenkins on Compose                           | Not required                                                  | The local mirror of the test checks        |

ElastiCache is AWS’s name for managed Redis. The app still uses it as a rate limiter. `checkRateLimit` sends `INCR` and `EXPIRE` to `REDIS_URL`. On AWS that URL is the ElastiCache endpoint.

EC2 is the bill for pod CPU, unless the node group is Fargate. Fargate bills each pod’s reserved CPU and memory while the pod exists. Extra replicas that fit on the nodes you already have do not add a new EC2 charge. A node autoscaler that starts another instance bills that instance for as long as it runs.

## What a deploy would do

GitHub Actions stays the gate. It already runs on push to `main` and on pull requests. After the checks pass on the production branch, the workflow would:

1. Build the web image.
2. Push it to the ECR repository `graphorg-web`.
3. Set the Deployment image to that tag and roll it.

GitHub gets AWS permission through OIDC, so the workflow does not store a long-lived access key. A bad release is `kubectl rollout undo` on the EKS Deployment, the same command used on the local cluster.

An Horizontal Pod Autoscaler would set `minReplicas` and `maxReplicas`. It will not grow past the maximum. The local cluster does not have one. The manifest says `replicas: 1`.

Jenkins on a laptop cannot receive GitHub webhooks, because `localhost:8080` is not a public URL. In AWS, Jenkins would need its own load balancer and agents before it could build and push. That is optional. GitHub Actions already covers the trigger.

## Observability

The pod emits OpenTelemetry traces and metrics when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Locally that endpoint is the Compose collector, which forwards traces to Tempo and metrics to Prometheus. Grafana is the UI.

On AWS, the AWS Distro for OpenTelemetry (or the CloudWatch add-on) is the collector. It delivers metrics and traces to CloudWatch and X-Ray. Container stdout is tailed into CloudWatch Logs. Grafana is optional. Amazon Managed Grafana is the hosted UI if the Tempo-style explore view is worth a separate service. The CloudWatch console is enough without it.

Sentry, PostHog, LaunchDarkly, Resend, and Better Stack stay what they are on Vercel. They are not replaced by CloudWatch. CloudWatch is the platform metrics, logs, and traces. Sentry remains exceptions. PostHog remains product analytics. Better Stack remains the uptime check of `/api/health`.

## Data

RDS replaces Compose Postgres, not Neon, only if the database moves with the app. Neon can stay the database while the app runs on EKS. The pod would then keep a `DATABASE_URL` in Secrets Manager and would not need the RDS instance in this design.

ElastiCache replaces Upstash on the same terms. The app does not care which product answers Redis commands.

ECR does not need a VPC. RDS (`db.t4g.micro`, Postgres 16, encrypted, not public) and ElastiCache (`cache.t4g.micro`, Redis 7.1) do. Without subnet and security-group settings, those two use the account's default VPC, which may not be the network a later EKS cluster uses. The database password is a sensitive variable, not a value in the file. The RDS resource keeps seven days of backups, takes a final snapshot named `graphorg-final` on deletion, and has deletion protection on. `terraform validate` checks that sketch. `terraform plan` and `terraform apply` contact AWS and can create billed resources. Do not run them.

EKS itself is not in that sketch. A cluster also needs a VPC, subnets, and an IAM role. Those are the expensive objects, and they stay out until there is a decision to provision them.
