# Analytics event export

These events are an offline copy for Databricks Free Edition. They are not rows in Neon/Postgres. The app database stays the source of truth for people, teams, and the rest of the org graph. This file describes a point-in-time export, not a live sync.

Do not put emails, names, credentials, or photo URLs in an export. Identify a browser session with `anonymous_id` and a workspace with `org_slug`.

Every event shares these fields:

| Field          | Type     | Meaning                                                |
| -------------- | -------- | ------------------------------------------------------ |
| `event`        | string   | One of the names below                                 |
| `occurred_at`  | string   | UTC timestamp, ISO-8601                                |
| `anonymous_id` | string   | Opaque browser/session id. Not a user email or user id |
| `org_slug`     | string   | Workspace slug                                         |
| `source`       | `sample` | `sample` means the export script invented the row      |

## `page_view`

Someone opened a page.

| Field  | Type   | Meaning                    |
| ------ | ------ | -------------------------- |
| `path` | string | Path only, no query string |

## `ai_chat_completed`

Ask AI finished a turn.

| Field         | Type                | Meaning                      |
| ------------- | ------------------- | ---------------------------- |
| `model_kind`  | `local` or `hosted` | Which kind of model answered |
| `duration_ms` | number              | Time until the turn finished |

Adding a new event means a new `event` name and its extra fields. It does not mean a new Postgres table.
