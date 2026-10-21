import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  // App traffic: Neon *pooled* URL (`-pooler` in the host) on Vercel.
  DATABASE_URL: z.string().url(),
  // Migrations / drizzle-kit / pg_dump: Neon *direct* URL. Optional locally
  // (same as DATABASE_URL for Docker Postgres). Required in production if
  // DATABASE_URL is pooled — PgBouncer transaction mode breaks some DDL.
  DATABASE_URL_UNPOOLED: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AI_WORKER_URL: z.string().url().default("http://localhost:8001"),
  AI_WORKER_SECRET: z.string().min(1).optional(),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),
  /** Optional Pino level override (trace|debug|info|warn|error|fatal). */
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .optional(),
  /** Resend API key. Omit locally — mailer no-ops without it. */
  RESEND_API_KEY: z.string().min(1).optional(),
  /**
   * From address for transactional mail. Friendly name form allowed
   * (`GraphOrg <onboarding@resend.dev>`). Defaults in the mailer when unset.
   */
  EMAIL_FROM: z.string().min(1).optional(),
  /**
   * Sentry DSN. Prefer `NEXT_PUBLIC_SENTRY_DSN` so client + server share one
   * value; `SENTRY_DSN` is a server-only fallback. Omit locally — SDK no-ops.
   */
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  /**
   * PostHog project API key (client). Omit locally — analytics/replay no-op.
   * Feature flags stay disabled in SDK options (LaunchDarkly owns flags).
   */
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  /** PostHog ingest host. Defaults to US cloud when unset. */
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  /**
   * LaunchDarkly server SDK key. Omit locally — flags use safe defaults
   * (`ai-chat-enabled` → true). Optional client-side ID reserved for later.
   */
  LAUNCHDARKLY_SDK_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID: z.string().min(1).optional(),
  /**
   * OTLP HTTP base URL (e.g. `http://localhost:4318`). Omit locally —
   * OpenTelemetry SDK is not started. Compose collector listens on 4318.
   */
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  /** Overrides the default service name `graphorg-web`. */
  OTEL_SERVICE_NAME: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Validates process.env on first call, then caches the result. Lazy on
 * purpose: importing this module (directly, or via anything that imports
 * it, like the db client) must never trigger validation as a side effect,
 * only calling getEnv() does. src/instrumentation.ts calls it once at
 * server startup so a missing/malformed variable fails fast with a
 * readable message, instead of failing later with a raw `undefined` deep
 * in a connection call.
 */
export function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}
