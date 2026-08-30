import type { ReactNode } from "react";

import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import type { Session } from "@/lib/auth/session";

export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <AppSidebar session={session} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader session={session} />
        <main className="flex-1 animate-in overflow-y-auto p-4 fade-in duration-200 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
