import type { ReactNode } from "react";

import { eq } from "drizzle-orm";

import { AppShell } from "@/components/shell/app-shell";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";

/**
 * Everything under this route group is a protected page: Proxy already
 * redirects unauthenticated navigation to /login before this layout ever
 * runs, but requireSession() here is the secure, defense-in-depth check the
 * Next.js auth guide recommends doing close to the render itself.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  // The JWT's organization name/slug are frozen at sign-in (see src/auth.ts),
  // so read the live values for the shell; otherwise a rename from Settings
  // wouldn't show in the sidebar until members signed in again.
  const organization = await getDb().query.organizations.findFirst({
    where: eq(organizations.id, session.organizationId),
    columns: { name: true, slug: true },
  });
  const shellSession = organization
    ? {
        ...session,
        organizationName: organization.name,
        organizationSlug: organization.slug,
      }
    : session;
  return <AppShell session={shellSession}>{children}</AppShell>;
}
