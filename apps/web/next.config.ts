import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  transpilePackages: ["@graphorg/types"],
  // Pino transports resolve workers at runtime; keep them out of the bundle.
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
  experimental: {
    // Enables forbidden() so src/app/forbidden.tsx renders PermissionDenied
    // when requireRole() rejects the signed-in user's role.
    authInterrupts: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Source maps only when an auth token is present (local/CI without token
  // still builds; stack traces stay minified until you add SENTRY_AUTH_TOKEN).
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Exceptions lane — drop tracing code from the client bundle when possible.
  bundleSizeOptimizations: {
    excludeTracing: true,
  },
  telemetry: false,
});
