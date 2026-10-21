/**
 * @jest-environment node
 */
import {
  getSentryDsn,
  isSentryConfigured,
  sentryInitOptions,
} from "../../../../src/lib/sentry/options";

describe("sentry/options", () => {
  const originalPublic = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const originalServer = process.env.SENTRY_DSN;

  afterEach(() => {
    if (originalPublic === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    } else {
      process.env.NEXT_PUBLIC_SENTRY_DSN = originalPublic;
    }
    if (originalServer === undefined) {
      delete process.env.SENTRY_DSN;
    } else {
      process.env.SENTRY_DSN = originalServer;
    }
  });

  it("reports not configured when no DSN is set", () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    expect(isSentryConfigured()).toBe(false);
    expect(getSentryDsn()).toBeUndefined();
  });

  it("prefers NEXT_PUBLIC_SENTRY_DSN over SENTRY_DSN", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://public@o1.ingest.sentry.io/1";
    process.env.SENTRY_DSN = "https://server@o1.ingest.sentry.io/2";
    expect(getSentryDsn()).toBe("https://public@o1.ingest.sentry.io/1");
  });

  it("falls back to SENTRY_DSN", () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    process.env.SENTRY_DSN = "https://server@o1.ingest.sentry.io/2";
    expect(getSentryDsn()).toBe("https://server@o1.ingest.sentry.io/2");
  });

  it("keeps exceptions-only defaults (no tracing / logs / PII flags on)", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://public@o1.ingest.sentry.io/1";
    const options = sentryInitOptions();
    expect(options.dsn).toBe("https://public@o1.ingest.sentry.io/1");
    expect(options.enableLogs).toBe(false);
    expect(options.sendDefaultPii).toBe(false);
    expect(options.enableOpenTelemetrySetup).toBe(false);
    expect(options).not.toHaveProperty("tracesSampleRate");
    expect(options).not.toHaveProperty("replaysSessionSampleRate");
  });
});
