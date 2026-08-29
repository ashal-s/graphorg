import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import type { Role } from "@/lib/auth/roles";
import { loginSchema } from "@/lib/auth/schemas";

/**
 * How long a session's `organizationName`/`organizationSlug` claims are
 * trusted before the `jwt` callback re-checks them against the database.
 * Bounds how stale they can get after an admin renames the workspace
 * (`PATCH /api/organization`) without refetching on literally every
 * request — there's no caching layer yet (planned for WEB-134), so an
 * unconditional refresh here would add a database round trip to every
 * page load and API call across the whole app, not just the rare rename.
 */
const ORG_CLAIMS_TTL_MS = 5 * 60 * 1000;

/**
 * Credentials-only, JWT sessions: no accounts/sessions tables, no adapter.
 * A workspace (organization) is identified by its slug, not guessed from
 * email, since `(organization_id, email)` is the unique key on `users` and
 * the same email can exist in more than one organization.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        workspace: { label: "Workspace" },
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { workspace, email, password } = parsed.data;

        const db = getDb();
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.slug, workspace),
        });
        if (!org) return null;

        const user = await db.query.users.findFirst({
          where: (fields, { and, eq }) =>
            and(eq(fields.organizationId, org.id), eq(fields.email, email)),
        });
        if (!user) return null;

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          organizationId: user.organizationId,
          organizationName: org.name,
          organizationSlug: org.slug,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.organizationSlug = user.organizationSlug;
        token.role = user.role;
        token.organizationRefreshedAt = Date.now();
        return token;
      }

      // Cast, not a bare read: same rough edge as the session() callback
      // below — the JWT type augmentation in src/types/next-auth.d.ts
      // doesn't reach this callback's `token` param type, even though the
      // fields really are present at runtime (set by the branch above at
      // sign-in).
      const jwt = token as typeof token & {
        organizationId: string;
        organizationRefreshedAt: number;
      };

      // Not the initial sign-in: `user` is only populated once, at sign-in,
      // so without this the token would keep whatever
      // organizationName/organizationSlug it had then, even after an admin
      // renames the workspace. Re-check at most once per ORG_CLAIMS_TTL_MS.
      const refreshedAt = jwt.organizationRefreshedAt ?? 0;
      if (jwt.organizationId && Date.now() - refreshedAt > ORG_CLAIMS_TTL_MS) {
        const db = getDb();
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, jwt.organizationId),
          columns: { name: true, slug: true },
        });
        if (org) {
          jwt.organizationName = org.name;
          jwt.organizationSlug = org.slug;
        }
        jwt.organizationRefreshedAt = Date.now();
      }
      return jwt;
    },
    session({ session, token }) {
      // Cast, not a bare read: next-auth/jwt re-exports its JWT type from
      // @auth/core/jwt rather than declaring it locally, so the module
      // augmentation in src/types/next-auth.d.ts doesn't reach the type
      // actually used for this callback's `token` param (a known Auth.js v5
      // beta rough edge). The fields are still set correctly by jwt() above.
      const jwt = token as typeof token & {
        userId: string;
        organizationId: string;
        organizationName: string;
        organizationSlug: string;
        role: Role;
      };
      session.user.id = jwt.userId;
      session.organizationId = jwt.organizationId;
      session.organizationName = jwt.organizationName;
      session.organizationSlug = jwt.organizationSlug;
      session.role = jwt.role;
      return session;
    },
  },
});
