import type { NextConfig } from "next";

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

export default nextConfig;
