"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

export function SidebarNav({
  onNavigate,
  collapsible = false,
}: {
  onNavigate?: () => void;
  /**
   * Inside a `group/sidebar` that is collapsed to icons: labels are hidden
   * until the sidebar is hovered or holds focus.
   */
  collapsible?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {navItems.map((item) => {
        // A section stays selected on its sub-pages (/directory/teams is
        // under Directory); the overview only matches the root.
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              // Collapsed, the highlight is just the icon's square, inside
              // the narrow strip; opened, it spans the row.
              collapsible &&
                "w-10 transition-[width,background-color,color] duration-150 ease-out group-focus-within/sidebar:w-full group-hover/sidebar:w-full motion-reduce:transition-none",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span
              className={cn(
                collapsible &&
                  "opacity-0 transition-opacity duration-150 ease-out group-focus-within/sidebar:opacity-100 group-hover/sidebar:opacity-100 motion-reduce:transition-none",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
