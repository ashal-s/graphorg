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
      className="flex shrink-0 gap-5 md:w-44 md:flex-col md:gap-2 md:self-start md:border-l md:border-border"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "py-1.5 text-sm font-medium transition-colors md:-ml-px md:border-l-2 md:py-1 md:pl-3",
              active
                ? "text-foreground md:border-primary"
                : "text-muted-foreground hover:text-foreground md:border-transparent",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
