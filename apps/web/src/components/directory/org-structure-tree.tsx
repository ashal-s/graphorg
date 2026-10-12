import Link from "next/link";
import { Building2, Users2 } from "lucide-react";
import type { ReactNode } from "react";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { Badge } from "@/components/ui/badge";
import type {
  OrgStructure,
  StructureDepartment,
  StructurePerson,
  StructureTeam,
} from "@/lib/directory/org-structure";

const CARD =
  "flex w-52 items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** One box in the chart, with its connected children (if any) below it. */
function Node({
  children,
  nested,
}: {
  children: ReactNode;
  nested?: ReactNode[];
}) {
  const filled = nested?.filter(Boolean) ?? [];
  return (
    <li>
      {children}
      {filled.length > 0 && <ul>{filled}</ul>}
    </li>
  );
}

function PersonCard({ person }: { person: StructurePerson }) {
  return (
    <Link href={`/${person.slug}`} className={CARD}>
      <PersonAvatar
        name={person.name}
        photoUrl={person.photoUrl}
        colorKey={person.id}
        textClassName="text-xs"
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {person.name}
        </span>
        {person.title && (
          <span className="block truncate text-xs text-muted-foreground">
            {person.title}
          </span>
        )}
        {person.teamRole === "lead" && (
          <Badge variant="secondary" className="mt-1">
            Lead
          </Badge>
        )}
      </span>
    </Link>
  );
}

function TeamNode({ team }: { team: StructureTeam }) {
  return (
    <Node
      nested={team.members.map((member) => (
        <Node key={member.id}>
          <PersonCard person={member} />
        </Node>
      ))}
    >
      <Link href={`/${team.slug}`} className={CARD}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Users2 className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {team.name}
          </span>
          <span className="block text-xs text-muted-foreground">
            {team.members.length}{" "}
            {team.members.length === 1 ? "person" : "people"}
          </span>
        </span>
      </Link>
    </Node>
  );
}

function DepartmentNode({ department }: { department: StructureDepartment }) {
  const heads = department.heads.map((head) => head.name).join(", ");
  return (
    <Node
      nested={[
        ...department.children.map((child) => (
          <DepartmentNode key={`d-${child.id}`} department={child} />
        )),
        ...department.teams.map((team) => (
          <TeamNode key={`t-${team.id}`} team={team} />
        )),
        ...department.people.map((person) => (
          <Node key={`p-${person.id}`}>
            <PersonCard person={person} />
          </Node>
        )),
      ]}
    >
      <Link
        href={`/directory/departments/${department.id}`}
        className={`${CARD} border-primary/40 bg-primary/5`}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Building2 className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {department.name}
          </span>
          {heads && (
            <span className="block truncate text-xs text-muted-foreground">
              {heads}
            </span>
          )}
        </span>
      </Link>
    </Node>
  );
}

/** A label box that holds things which have no parent of their own. */
function GroupNode({ label, nested }: { label: string; nested: ReactNode[] }) {
  return (
    <Node nested={nested}>
      <span className="flex w-52 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-3 text-center text-sm font-medium text-muted-foreground">
        {label}
      </span>
    </Node>
  );
}

/**
 * Departments (with their sub-departments), the teams in each and the
 * people on each team, drawn top-down like the people chart. Teams outside
 * any department, and people with no team or department, hang off their own
 * labelled boxes so everyone appears.
 */
export function OrgStructureTree({ structure }: { structure: OrgStructure }) {
  const { departments, teamsWithoutDepartment, peopleWithoutPlace } = structure;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max items-start justify-center gap-10">
        {departments.map((department) => (
          <ul key={department.id} className="org-tree">
            <DepartmentNode department={department} />
          </ul>
        ))}
        {teamsWithoutDepartment.length > 0 && (
          <ul className="org-tree">
            <GroupNode
              label="No department"
              nested={teamsWithoutDepartment.map((team) => (
                <TeamNode key={team.id} team={team} />
              ))}
            />
          </ul>
        )}
        {peopleWithoutPlace.length > 0 && (
          <ul className="org-tree">
            <GroupNode
              label="No team or department"
              nested={peopleWithoutPlace.map((person) => (
                <Node key={person.id}>
                  <PersonCard person={person} />
                </Node>
              ))}
            />
          </ul>
        )}
      </div>
    </div>
  );
}
