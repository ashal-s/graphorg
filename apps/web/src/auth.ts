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
 *
 * `organizationName`/`organizationSlug` are set once, at sign-in, and are
 * NOT re-checked against the database on later requests: `getSession()`
 * (src/lib/auth/session.ts) always calls the zero-argument `auth()` form,
 * which — per next-auth's own `lib/index.js` — discards any Set-Cookie the
 * `jwt` callback's return value would imply, since a React Server Component
 * (and, transitively, this codebase's Route Handlers, which reuse the same
 * `getSession()`) has no response to attach it to. A `jwt` callback that
 * "refreshes" these claims by mutating and returning the token therefore
 * cannot actually persist that change to the browser's cookie; it only
 * looks like it works if tested against next-auth's own built-in
 * `/api/auth/session` route (which does have real request/response
 * handling), while every other caller keeps re-deriving from the original,
 * unchanged cookie — which, worse, makes a "TTL-bounded" refresh silently
 * degrade into a database lookup on every request once the TTL has passed,
 * since the cookie's own "last refreshed" marker can never advance either.
 * Consequence: after `PATCH /api/organization` renames the workspace,
 * already-signed-in members see the old name/slug until they sign out and
 * back in. Fixing that for real needs either cookie-writing middleware on
 * every request or a server-side session store (e.g. Redis, WEB-134), not
 * a JWT-callback-only change — out of scope here.
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
