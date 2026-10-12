import Link from "next/link";
import { Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  flattenDepartmentTree,
  type DepartmentNode,
} from "@/lib/directory/departments";

export interface DepartmentListItem {
  id: string;
  name: string;
  parentId: string | null;
  description: string | null;
  leadNames: string[];
  teamCount: number;
  peopleCount: number;
}

/**
 * Departments as an indented hierarchy: each one under its parent, with its
 * leads and how many teams and people it has.
 */
export function DepartmentTree({
  roots,
}: {
  roots: DepartmentNode<DepartmentListItem>[];
}) {
  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
      {flattenDepartmentTree(roots).map(({ node, depth }) => (
        <li key={node.id}>
          <Link
            href={`/directory/departments/${node.id}`}
            className="flex items-center gap-3 py-3 pr-4 hover:bg-muted/50"
            style={{ paddingLeft: `${1 + depth * 1.5}rem` }}
          >
            <Building2
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {node.name}
              </span>
              {(node.leadNames.length > 0 || node.description) && (
                <span className="block truncate text-xs text-muted-foreground">
                  {node.leadNames.join(", ")}
                  {node.leadNames.length > 0 && node.description ? " · " : null}
                  {node.description}
                </span>
              )}
            </span>
            <span className="flex shrink-0 gap-1.5">
              <Badge variant="outline">
                {node.teamCount} {node.teamCount === 1 ? "team" : "teams"}
              </Badge>
              <Badge variant="outline">
                {node.peopleCount}{" "}
                {node.peopleCount === 1 ? "person" : "people"}
              </Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
