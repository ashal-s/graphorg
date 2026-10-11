import { MobileNav } from "@/components/shell/mobile-nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { UserMenu } from "@/components/shell/user-menu";
import { WorkspaceBreadcrumb } from "@/components/shell/workspace-breadcrumb";
import type { Session } from "@/lib/auth/session";
import type { Workspace } from "@/lib/shell-workspaces";

/**
 * The top bar, full width: the GraphOrg mark and the workspace as a
 * breadcrumb on the left, theme and account on the right.
 */
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
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <WorkspaceBreadcrumb current={workspace} others={others} />
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu name={session.name} email={session.email} />
      </div>
    </header>
  );
}
