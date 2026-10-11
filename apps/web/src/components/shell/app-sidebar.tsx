import { SidebarNav } from "@/components/shell/sidebar-nav";

/**
 * Navigation only; the app and workspace live in the top bar. It sits
 * collapsed to icons and opens over the page the instant it is hovered or
 * focused (a quick slide that starts at once, no delay), so the content
 * never shifts. The outer box reserves the
 * collapsed width; the sticky inner panel is what grows, over the page.
 */
export function AppSidebar() {
  return (
    <aside className="hidden w-14 shrink-0 md:block">
      <div className="group/sidebar sticky top-14 z-20 h-[calc(100svh-3.5rem)] w-14 overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-150 ease-out focus-within:w-56 hover:w-56 motion-reduce:transition-none">
        <div className="w-56 px-2 py-4">
          <SidebarNav collapsible />
        </div>
      </div>
    </aside>
  );
}
