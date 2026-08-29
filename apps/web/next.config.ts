import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@graphorg/types"],
  experimental: {
    // Enables the forbidden() function so src/app/forbidden.tsx renders for
    // the permission-denied state once WEB-133 adds real authorization checks.
    authInterrupts: true,
  },
};

export default nextConfig;
