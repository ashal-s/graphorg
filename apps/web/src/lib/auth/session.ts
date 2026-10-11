import { and, eq } from "drizzle-orm";
import { forbidden, unauthorized } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hasRole, type Role } from "@/lib/auth/roles";

export interface Session {
  userId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: Role;
  name: string;
  email: string;
}

/**
 * Current session, or null if signed out. Never throws; safe for optional UI.
 *
 * The JWT only proves who signed in and when; the user's role, name, email
 * and continued existence are read from the database on every request, so a
 * role change or removal made in Settings takes effect immediately instead
 * of lingering until the token expires. `cache` dedupes the lookup across
 * the components rendered for one request.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const raw = await auth();
  if (!raw?.user?.id) return null;

  const user = await getDb().query.users.findFirst({
    where: and(
      eq(users.id, raw.user.id),
      eq(users.organizationId, raw.organizationId),
    ),
    columns: { name: true, email: true, role: true },
  });
  if (!user) return null;

  return {
    userId: raw.user.id,
    organizationId: raw.organizationId,
    organizationName: raw.organizationName,
    organizationSlug: raw.organizationSlug,
    role: user.role,
    name: user.name,
    email: user.email,
  };
});

/**
 * Current session, for use in Server Components/Actions rendering protected
 * UI. Throws Next's `unauthorized()` interrupt (rendered by
 * src/app/unauthorized.tsx) if signed out, so callers can treat the return
 * value as always present. Proxy already redirects unauthenticated page
 * navigation to /login; this is the defense-in-depth backstop the Next.js
 * auth guide recommends doing close to the data/render itself, not relying
 * on Proxy alone.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) unauthorized();
  return session;
}

/**
 * Current session with at least `minimum` role. Throws Next's `forbidden()`
 * interrupt (rendered by src/app/forbidden.tsx) if the signed-in user's role
 * is too low. This is the "roles ... in the server-side service layer" the
 * ticket calls for: every write path that's role-gated should call this
 * instead of re-implementing the role comparison inline.
 */
export async function requireRole(minimum: Role): Promise<Session> {
  const session = await requireSession();
  if (!hasRole(session.role, minimum)) forbidden();
  return session;
}
