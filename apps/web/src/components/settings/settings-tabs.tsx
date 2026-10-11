import Link from "next/link";

import { cn } from "@/lib/utils";

export interface SettingsTab {
  id: string;
  label: string;
  href: string;
}

/** Underlined, link-based tabs: each is a real URL, so they're shareable and survive refresh. */
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
      className="flex gap-6 border-b border-border"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 py-2 text-sm font-medium transition-colors",
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
