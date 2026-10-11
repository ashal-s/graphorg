import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { OrgChartNode } from "@/lib/directory/org-chart";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`
      : (parts[0]?.slice(0, 2) ?? "?");
  return letters.toUpperCase();
}

function Node({ node }: { node: OrgChartNode }) {
  return (
    <li>
      <Link
        href={`/directory/people/${node.id}`}
        className="flex w-52 items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials(node.name)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {node.name}
          </span>
          {node.title && (
            <span className="block truncate text-xs text-muted-foreground">
              {node.title}
            </span>
          )}
          {node.teamName && (
            <span className="block truncate text-xs text-muted-foreground/80">
              {node.teamName}
            </span>
          )}
        </span>
      </Link>
      {node.reports.length > 0 && (
        <ul>
          {node.reports.map((report) => (
            <Node key={report.id} node={report} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** A top-down org chart; connector lines are drawn by `.org-tree` in globals.css. */
export function OrgChartTree({ roots }: { roots: OrgChartNode[] }) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max items-start justify-center gap-10">
        {roots.map((root) => (
          <ul key={root.id} className="org-tree">
            <Node node={root} />
          </ul>
        ))}
      </div>
    </div>
  );
}
