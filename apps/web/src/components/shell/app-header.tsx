import { MobileNav } from "@/components/shell/mobile-nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { UserMenu } from "@/components/shell/user-menu";
import { WorkspaceBreadcrumb } from "@/components/shell/workspace-breadcrumb";
import type { Session } from "@/lib/auth/session";
import type { Workspace } from "@/lib/shell-workspaces";

export function AppHeader({
  session,
  workspace,
  others,
}: {
  session: Session;
  workspace: Workspace;
  others: Workspace[];
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MobileNav />
        {/* On wide screens the breadcrumb lives in the sidebar. */}
        <div className="min-w-0 md:hidden">
          <WorkspaceBreadcrumb current={workspace} others={others} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu name={session.name} email={session.email} />
      </div>
    </header>
  );
}
