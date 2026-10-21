import type { ReactNode } from "react";

import { PostHogIdentify } from "@/components/analytics/posthog-identify";
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
    <div className="flex min-h-svh flex-col">
      <PostHogIdentify
        userId={session.userId}
        organizationId={session.organizationId}
        organizationName={session.organizationName}
      />
      <AppHeader session={session} workspace={workspace} others={others} />
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        <main className="min-w-0 flex-1 animate-in overflow-y-auto p-4 fade-in duration-200 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
