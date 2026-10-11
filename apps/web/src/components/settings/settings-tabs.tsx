import Link from "next/link";

import { cn } from "@/lib/utils";

export interface SettingsTab {
  id: string;
  label: string;
  href: string;
}

/**
 * Settings sub-navigation, styled like the main sidebar: a vertical list
 * beside the content on wide screens, a horizontal row on narrow ones. Each
 * item is a real URL, so sections are linkable and survive refresh.
 */
export function SettingsTabs({
  tabs,
  activeId,
}: {
  tabs: SettingsTab[];
  activeId: string;
}) {
  return (
    <nav
      aria-label="Settings sections"
      className="flex shrink-0 gap-1 md:w-44 md:flex-col"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
