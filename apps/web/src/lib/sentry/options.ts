/**
 * Shared Sentry.init options for client / server / edge.
 *
 * Lane: exceptions only. Do not set tracesSampleRate (OTel→Grafana owns
 * perf). Do not add replayIntegration (PostHog owns session replay).
 * No-ops when neither DSN env is set.
 */
export function getSentryDsn(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    process.env.SENTRY_DSN?.trim() ||
    undefined
  );
}

export function isSentryConfigured(): boolean {
  return Boolean(getSentryDsn());
}

export function sentryInitOptions() {
  return {
    dsn: getSentryDsn(),
    // Keep Pino as the app logger; Sentry is for exceptions only.
    enableLogs: false as const,
    sendDefaultPii: false as const,
    // Next.js defaults this to true, which registers Sentry's tracer provider
    // and drops spans from the app's NodeSDK. OTel owns traces (WEB-223).
    enableOpenTelemetrySetup: false as const,
  };
}
