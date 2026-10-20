import { envSchema } from "@/lib/env";

const AUTH_SECRET = "a".repeat(32);

describe("envSchema", () => {
  it("accepts a valid DATABASE_URL, REDIS_URL and AUTH_SECRET", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing DATABASE_URL", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "test",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a DATABASE_URL that isn't a URL", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "test",
      DATABASE_URL: "not-a-url",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an AUTH_SECRET shorter than 32 characters", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET: "too-short",
    });

    expect(result.success).toBe(false);
  });

  it("defaults NODE_ENV to development when omitted", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe("development");
    }
  });

  it("treats the AI worker settings as optional", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.AI_WORKER_URL).toBe("http://localhost:8001");
      expect(result.data.AI_WORKER_SECRET).toBeUndefined();
    }
  });

  it("defaults the AI rate limit and reads it from a string", () => {
    const base = {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
    };

    const defaulted = envSchema.safeParse(base);
    const fromEnv = envSchema.safeParse({
      ...base,
      AI_RATE_LIMIT_PER_MINUTE: "3",
    });

    expect(defaulted.success && defaulted.data.AI_RATE_LIMIT_PER_MINUTE).toBe(
      20,
    );
    expect(fromEnv.success && fromEnv.data.AI_RATE_LIMIT_PER_MINUTE).toBe(3);
  });

  it("rejects a zero or fractional AI rate limit", () => {
    const base = {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
    };

    expect(
      envSchema.safeParse({ ...base, AI_RATE_LIMIT_PER_MINUTE: "0" }).success,
    ).toBe(false);
    expect(
      envSchema.safeParse({ ...base, AI_RATE_LIMIT_PER_MINUTE: "2.5" }).success,
    ).toBe(false);
  });

  it("rejects an AI_WORKER_URL that isn't a URL", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
      AI_WORKER_URL: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  it("accepts an optional LOG_LEVEL and rejects unknown values", () => {
    const base = {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
    };

    expect(envSchema.safeParse(base).success).toBe(true);
    expect(
      envSchema.safeParse({ ...base, LOG_LEVEL: "debug" }).success,
    ).toBe(true);
    expect(
      envSchema.safeParse({ ...base, LOG_LEVEL: "verbose" }).success,
    ).toBe(false);
  });

  it("treats Resend settings as optional", () => {
    const base = {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
    };

    expect(envSchema.safeParse(base).success).toBe(true);
    const withKey = envSchema.safeParse({
      ...base,
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "GraphOrg <onboarding@resend.dev>",
    });
    expect(withKey.success).toBe(true);
    if (withKey.success) {
      expect(withKey.data.RESEND_API_KEY).toBe("re_test");
      expect(withKey.data.EMAIL_FROM).toBe(
        "GraphOrg <onboarding@resend.dev>",
      );
    }
  });

  it("treats Sentry DSN settings as optional", () => {
    const base = {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
    };

    expect(envSchema.safeParse(base).success).toBe(true);
    const withDsn = envSchema.safeParse({
      ...base,
      NEXT_PUBLIC_SENTRY_DSN: "https://abc@o1.ingest.sentry.io/1",
    });
    expect(withDsn.success).toBe(true);
    expect(
      envSchema.safeParse({ ...base, SENTRY_DSN: "not-a-url" }).success,
    ).toBe(false);
  });

  it("treats PostHog settings as optional", () => {
    const base = {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
    };

    expect(envSchema.safeParse(base).success).toBe(true);
    const withKey = envSchema.safeParse({
      ...base,
      NEXT_PUBLIC_POSTHOG_KEY: "phc_test",
      NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
    });
    expect(withKey.success).toBe(true);
    expect(
      envSchema.safeParse({
        ...base,
        NEXT_PUBLIC_POSTHOG_HOST: "not-a-url",
      }).success,
    ).toBe(false);
  });
});
