# Analytics export (Databricks Free Edition)

Offline sample events for learning Databricks. This folder is not the app database. Neon/Postgres remains the source of truth for GraphOrg records. Commercial Databricks (a real lakehouse for the product) stays Post-MVP.

Databricks Free Edition is personal and non-commercial. It is quota-limited serverless compute, and Databricks may shut that compute off after fair-use limits or delete an inactive account. Do not use it as production analytics.

Event shapes: [events.schema.md](events.schema.md). Exports under `exports/` are gitignored. The notebook is [databricks/01_explore_exports.py](databricks/01_explore_exports.py).

## What you do

1. Sign up at [Databricks Free Edition](https://www.databricks.com/learn/free-edition) (Google, Microsoft, or email code). No credit card. Accept the personal-use terms.
2. From the repo root, write the sample file:

   ```bash
   npm run analytics:export --workspace=apps/web
   ```

   That creates `analytics/exports/events.jsonl` (8 sample events, no emails).

3. In the workspace sidebar, open **Catalog**. On the `default` schema, create a volume named `graphorg`.
4. **New → Add or upload data → Upload files to a volume**. Choose `events.jsonl` and the `graphorg` volume. Free Edition blocks a notebook from downloading the file itself, so the upload has to happen in the browser.
5. Copy the volume file path. It looks like `/Volumes/<catalog>/default/graphorg/events.jsonl`.
6. **Workspace → Import**. Select `analytics/databricks/01_explore_exports.py`. The `# Databricks notebook source` header imports it as a notebook.
7. Replace `EVENTS_PATH` with the path you copied. Attach serverless compute. **Run all**.

You should see 5 `page_view` rows and 3 `ai_chat_completed` rows. `/welcome` and `/people` are the most common paths. `local` answers outnumber `hosted`.
