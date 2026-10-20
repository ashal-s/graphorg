import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    const { logger } = await import("./lib/logger");
    try {
      const { getEnv } = await import("./lib/env");
      const env = getEnv();
      logger.info({ nodeEnv: env.NODE_ENV }, "environment validated");
    } catch (error) {
      // Logged via Pino rather than left to propagate: zod's ZodError defines
      // `message` as a getter with no setter, which crashes Next's dev error
      // overlay (it tries to reassign `.message`) instead of showing this
      // validation error.
      logger.error(
        {
          err: error instanceof Error ? error.message : error,
          hint: "Create apps/web/.env.local with DATABASE_URL, REDIS_URL, and AUTH_SECRET (see the root README), and restart.",
        },
        "invalid or missing environment variables",
      );
      process.exit(1);
    }

    // OpenTelemetry NodeSDK (traces + metrics → OTLP). No-op when
    // OTEL_EXPORTER_OTLP_ENDPOINT is unset — see lib/otel/config.ts.
    const { isOtelConfigured } = await import("./lib/otel/config");
    if (isOtelConfigured()) {
      await import("./instrumentation.node");
      logger.info(
        { endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT },
        "opentelemetry sdk started",
      );
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/** Capture errors from Server Components, proxy, and nested RSC. */
export const onRequestError = Sentry.captureRequestError;
