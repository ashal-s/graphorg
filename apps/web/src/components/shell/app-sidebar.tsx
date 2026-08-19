import { SidebarNav } from "@/components/shell/sidebar-nav";
import { WorkspaceSwitcher } from "@/components/shell/workspace-switcher";

export function AppSidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar md:text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center px-4 text-sm font-semibold">
        GraphOrg
      </div>
      <div className="px-3">
        <WorkspaceSwitcher />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav />
      </div>
    </aside>
  );
}
