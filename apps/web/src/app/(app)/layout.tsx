import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { requireSession } from "@/lib/auth/session";

/**
 * Everything under this route group is a protected page: Proxy already
 * redirects unauthenticated navigation to /login before this layout ever
 * runs, but requireSession() here is the secure, defense-in-depth check the
 * Next.js auth guide recommends doing close to the render itself.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  return <AppShell session={session}>{children}</AppShell>;
}
