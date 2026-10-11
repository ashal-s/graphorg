import { SidebarNav } from "@/components/shell/sidebar-nav";
import { WorkspaceBreadcrumb } from "@/components/shell/workspace-breadcrumb";
import type { Workspace } from "@/lib/shell-workspaces";

export function AppSidebar({
  workspace,
  others,
}: {
  workspace: Workspace;
  others: Workspace[];
}) {
  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar md:text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center px-2">
        <WorkspaceBreadcrumb current={workspace} others={others} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav />
      </div>
    </aside>
  );
}
