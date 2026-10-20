import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";

/**
 * Smoke E2E against a production Next build (`next start`).
 * CI builds first; locally, `test:e2e` builds then starts via webServer.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI
      ? "npm run start"
      : "npm run build && npm run start",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://graphorg:graphorg@127.0.0.1:5433/graphorg",
      REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
      AUTH_SECRET:
        process.env.AUTH_SECRET ?? "e2e-test-auth-secret-at-least-32-chars",
      // Auth.js rejects 127.0.0.1 unless the host is trusted (CI/local e2e).
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "true",
      AUTH_URL: process.env.AUTH_URL ?? baseURL,
    },
  },
});
