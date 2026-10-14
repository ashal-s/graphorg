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

  it("rejects an AI_WORKER_URL that isn't a URL", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET,
      AI_WORKER_URL: "not-a-url",
    });

    expect(result.success).toBe(false);
  });
});
