import type { DefaultSession } from "next-auth";

import type { Role } from "@/lib/auth/roles";

/**
 * Extends Auth.js's built-in types with the workspace/tenant fields this
 * app's JWT carries, so `session.organizationId`/`.role` etc. are typed
 * everywhere `auth()` is called, not just in src/auth.ts.
 */
declare module "next-auth" {
  interface User {
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    role: Role;
  }
}
