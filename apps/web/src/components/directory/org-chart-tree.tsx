import Link from "next/link";

import { PersonAvatar } from "@/components/shared/person-avatar";
import type { OrgChartNode } from "@/lib/directory/org-chart";

function Node({ node }: { node: OrgChartNode }) {
  return (
    <li>
      <Link
        href={`/directory/people/${node.id}`}
        className="flex w-52 items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <PersonAvatar
          name={node.name}
          photoUrl={node.photoUrl}
          textClassName="text-xs"
        />
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
