"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavHighlight } from "@/lib/nav-highlight";
import { navItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

export function SidebarNav({
  id,
  onNavigate,
  collapsed = false,
}: {
  id?: string;
  onNavigate?: () => void;
  /** Icon rail: labels stay available to assistive tech and in a tooltip. */
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const highlighted = useNavHighlight();

  const nav = (
    <nav id={id} aria-label="Main" className="flex flex-col gap-1">
      {navItems.map((item) => {
        // A section stays selected on its sub-pages (/directory/teams is
        // under Directory); the overview only matches the root.
        const isActive =
          highlighted !== null
            ? // A page outside the section's URLs (a person or team) said
              // which section it belongs to.
              item.href === highlighted
            : item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        const className = cn(
          "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          collapsed && "w-10",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        );
        const label = (
          <span className={cn(collapsed && "sr-only")}>{item.label}</span>
        );

        if (!collapsed) {
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={className}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        }

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger
              render={
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={className}
                />
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );

  if (!collapsed) return nav;
  return <TooltipProvider>{nav}</TooltipProvider>;
}
