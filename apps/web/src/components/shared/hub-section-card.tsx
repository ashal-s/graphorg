import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { linkCardClass } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Hub tile used on Directory and Catalog landing pages: icon, title, optional
 * count, description, and an optional footer (chips, avatars, or a hint).
 */
export function HubSectionCard({
  href,
  icon: Icon,
  title,
  description,
  stat,
  children,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Count or other short stat shown beside the title. */
  stat?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        linkCardClass,
        "group flex h-full flex-col gap-5 rounded-xl p-5",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
        <ArrowRight
          className="size-4 text-muted-foreground/50 transition-colors group-hover:text-foreground"
          aria-hidden="true"
        />
      </span>
      <span>
        <span className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight">{title}</span>
          {stat && (
            <span className="text-sm font-medium text-muted-foreground">
              {stat}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
      {children && (
        <span className="mt-auto border-t border-border pt-4">{children}</span>
      )}
    </Link>
  );
}

/** Muted name chips for hub footers (departments, services, tools, …). */
export function HubChipList({
  items,
  empty,
  max = 4,
}: {
  items: { id: string; name: string }[];
  empty: string;
  max?: number;
}) {
  if (items.length === 0) {
    return <span className="text-xs text-muted-foreground">{empty}</span>;
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {items.slice(0, max).map((item) => (
        <span
          key={item.id}
          className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
        >
          {item.name}
        </span>
      ))}
      {items.length > max && (
        <span className="px-1 py-0.5 text-xs font-medium text-muted-foreground">
          +{items.length - max} more
        </span>
      )}
    </span>
  );
}
