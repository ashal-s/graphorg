"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ResourceItem {
  id: string;
  name: string;
  /** Where "view" goes. */
  href: string;
  /** Shown as small badges beside the name. */
  badges?: string[];
  /** Where "edit" goes; omitted when the item has no edit screen. */
  editHref?: string;
}

export interface Resource {
  key: string;
  label: string;
  singular: string;
  items: ResourceItem[];
  /** Where "add" goes; omitted when there's no create screen or the user can't create. */
  addHref?: string;
  /** Shown when there are no items. */
  emptyText: string;
}

/**
 * A row of clickable stats (a team's resources, a person's relationships).
 * Selecting one lists its items below, each with view and (where it exists)
 * edit, plus an add action when the user can create that kind of thing.
 */
export function ResourceStats({ resources }: { resources: Resource[] }) {
  const firstWithItems = resources.find(
    (resource) => resource.items.length > 0,
  );
  const [activeKey, setActiveKey] = useState(
    (firstWithItems ?? resources[0])?.key,
  );
  const active = resources.find((resource) => resource.key === activeKey);

  return (
    <section className="flex flex-col gap-4">
      <div
        style={
          {
            "--stat-cols": `repeat(${resources.length}, minmax(0, 1fr))`,
          } as React.CSSProperties
        }
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-(--stat-cols)"
      >
        {resources.map((resource) => {
          const selected = resource.key === activeKey;
          return (
            <button
              key={resource.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setActiveKey(resource.key)}
              className={cn(
                "bg-background p-4 text-left transition-colors outline-none",
                "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                selected && "bg-muted/50",
              )}
            >
              <span className="block text-sm text-muted-foreground">
                {resource.label}
              </span>
              <span className="mt-1 block text-2xl font-semibold tracking-tight tabular-nums">
                {resource.items.length}
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold tracking-tight">
              {active.label}
            </h2>
            {active.addHref && (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href={active.addHref} />}
              >
                <Plus aria-hidden="true" />
                Add {active.singular}
              </Button>
            )}
          </div>

          {active.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{active.emptyText}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {active.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2.5 pr-1"
                >
                  <Link
                    href={item.href}
                    className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium hover:underline"
                  >
                    {item.name}
                    {item.badges?.map((badge) => (
                      <Badge key={badge} variant="outline">
                        {badge}
                      </Badge>
                    ))}
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    {item.editHref && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              nativeButton={false}
                              className="text-blue-600 hover:bg-blue-500/10 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400"
                              aria-label={`Edit ${item.name}`}
                              render={<Link href={item.editHref} />}
                            />
                          }
                        >
                          <Pencil aria-hidden="true" />
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            nativeButton={false}
                            aria-label={`View ${item.name}`}
                            render={<Link href={item.href} />}
                          />
                        }
                      >
                        <ExternalLink aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>View</TooltipContent>
                    </Tooltip>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
