import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { requireSession } from "@/lib/auth/session";
import { loadWorkspaces } from "@/lib/shell-workspaces";

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
  const { current, others } = await loadWorkspaces(
    session.organizationId,
    session.email,
  );
  const shellSession = current
    ? {
        ...session,
        organizationName: current.name,
        organizationSlug: current.slug,
      }
    : session;
  const workspace = current ?? {
    name: session.organizationName,
    slug: session.organizationSlug,
    logoUrl: null,
  };
  return (
    <AppShell session={shellSession} workspace={workspace} others={others}>
      {children}
    </AppShell>
  );
}
