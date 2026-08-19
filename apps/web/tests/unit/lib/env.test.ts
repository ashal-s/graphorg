import { envSchema } from "@/lib/env";

describe("envSchema", () => {
  it("accepts a valid DATABASE_URL and REDIS_URL", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing DATABASE_URL", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "test",
      REDIS_URL: "redis://localhost:6379",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a DATABASE_URL that isn't a URL", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "test",
      DATABASE_URL: "not-a-url",
      REDIS_URL: "redis://localhost:6379",
    });

    expect(result.success).toBe(false);
  });

  it("defaults NODE_ENV to development when omitted", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe("development");
    }
  });
});
