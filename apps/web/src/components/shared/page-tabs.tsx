import Link from "next/link";

import { cn } from "@/lib/utils";

export interface PageTab {
  id: string;
  label: string;
  href: string;
}

/**
 * Tabs along the top of a page's content. Each one is a real URL, so a tab
 * can be linked to and survives a refresh.
 */
export function PageTabs({
  tabs,
  activeId,
  label,
}: {
  tabs: PageTab[];
  activeId: string;
  /** Accessible name for the group, e.g. "Org chart views". */
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex gap-5 border-b border-border text-sm font-medium"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 py-2 transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
