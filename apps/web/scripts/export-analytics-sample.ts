/**
 * Writes a deterministic sample analytics export for Databricks Free Edition.
 *
 * The file is not loaded from Postgres. It is fake traffic that matches
 * analytics/events.schema.md so a notebook can be tried without production
 * data. Output is gitignored.
 *
 *   npm run analytics:export --workspace=apps/web
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type PageView = {
  event: "page_view";
  occurred_at: string;
  anonymous_id: string;
  org_slug: string;
  source: "sample";
  path: string;
};

type AiChatCompleted = {
  event: "ai_chat_completed";
  occurred_at: string;
  anonymous_id: string;
  org_slug: string;
  source: "sample";
  model_kind: "local" | "hosted";
  duration_ms: number;
};

type AnalyticsEvent = PageView | AiChatCompleted;

const events: AnalyticsEvent[] = [
  {
    event: "page_view",
    occurred_at: "2026-10-20T01:00:00.000Z",
    anonymous_id: "anon_sample_1",
    org_slug: "acme",
    source: "sample",
    path: "/welcome",
  },
  {
    event: "page_view",
    occurred_at: "2026-10-20T01:02:00.000Z",
    anonymous_id: "anon_sample_1",
    org_slug: "acme",
    source: "sample",
    path: "/login",
  },
  {
    event: "page_view",
    occurred_at: "2026-10-20T02:10:00.000Z",
    anonymous_id: "anon_sample_2",
    org_slug: "acme",
    source: "sample",
    path: "/people",
  },
  {
    event: "ai_chat_completed",
    occurred_at: "2026-10-20T02:12:00.000Z",
    anonymous_id: "anon_sample_2",
    org_slug: "acme",
    source: "sample",
    model_kind: "local",
    duration_ms: 840,
  },
  {
    event: "page_view",
    occurred_at: "2026-10-21T03:00:00.000Z",
    anonymous_id: "anon_sample_3",
    org_slug: "acme",
    source: "sample",
    path: "/people",
  },
  {
    event: "ai_chat_completed",
    occurred_at: "2026-10-21T03:01:00.000Z",
    anonymous_id: "anon_sample_3",
    org_slug: "acme",
    source: "sample",
    model_kind: "hosted",
    duration_ms: 1260,
  },
  {
    event: "ai_chat_completed",
    occurred_at: "2026-10-21T03:05:00.000Z",
    anonymous_id: "anon_sample_3",
    org_slug: "acme",
    source: "sample",
    model_kind: "local",
    duration_ms: 610,
  },
  {
    event: "page_view",
    occurred_at: "2026-10-21T04:20:00.000Z",
    anonymous_id: "anon_sample_1",
    org_slug: "acme",
    source: "sample",
    path: "/welcome",
  },
];

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.resolve(scriptDir, "../../../analytics/exports");
  const outFile = path.join(outDir, "events.jsonl");
  await mkdir(outDir, { recursive: true });
  const body = events.map((event) => JSON.stringify(event)).join("\n") + "\n";
  await writeFile(outFile, body, "utf8");
  console.log(`Wrote ${events.length} events to ${outFile}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
