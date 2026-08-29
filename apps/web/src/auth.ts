import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import type { Role } from "@/lib/auth/roles";
import { loginSchema } from "@/lib/auth/schemas";

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
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.organizationSlug = user.organizationSlug;
        token.role = user.role;
      }
      return token;
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
