import type { ReactNode } from "react";

import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import type { Session } from "@/lib/auth/session";
import type { Workspace } from "@/lib/shell-workspaces";

export function AppShell({
  session,
  workspace,
  others,
  children,
}: {
  session: Session;
  workspace: Workspace;
  /** Other workspaces this person has an account in. */
  others: Workspace[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <AppSidebar workspace={workspace} others={others} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader session={session} workspace={workspace} others={others} />
        <main className="flex-1 animate-in overflow-y-auto p-4 fade-in duration-200 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
