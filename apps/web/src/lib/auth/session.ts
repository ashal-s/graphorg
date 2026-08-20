import { forbidden, unauthorized } from "next/navigation";

import { auth } from "@/auth";
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

/** Current session, or null if signed out. Never throws; safe for optional UI. */
export async function getSession(): Promise<Session | null> {
  const raw = await auth();
  if (!raw?.user?.id) return null;
  return {
    userId: raw.user.id,
    organizationId: raw.organizationId,
    organizationName: raw.organizationName,
    organizationSlug: raw.organizationSlug,
    role: raw.role,
    name: raw.user.name ?? "",
    email: raw.user.email ?? "",
  };
}

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
