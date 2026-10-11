import { SidebarNav } from "@/components/shell/sidebar-nav";

/** Navigation only; the app and workspace live in the top bar. */
export function AppSidebar() {
  return (
    <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar md:text-sidebar-foreground">
      <div className="sticky top-14 flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav />
      </div>
    </aside>
  );
}
