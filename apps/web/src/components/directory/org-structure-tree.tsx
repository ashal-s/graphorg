import Link from "next/link";
import { Building2, Users2 } from "lucide-react";
import type { ReactNode } from "react";

import { PersonAvatar } from "@/components/shared/person-avatar";
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

/**
 * A person's name. Team leads are set in a heavier weight than everyone else,
 * with a screen-reader note, rather than given a label or icon.
 */
function PersonName({ person }: { person: StructurePerson }) {
  const lead = person.teamRole === "lead";
  return (
    <span className={`truncate text-sm ${lead ? "font-bold" : "font-normal"}`}>
      {person.name}
      {lead && <span className="sr-only"> (team lead)</span>}
    </span>
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
        <span className="flex">
          <PersonName person={person} />
        </span>
        {person.title && (
          <span className="block truncate text-xs text-muted-foreground">
            {person.title}
          </span>
        )}
      </span>
    </Link>
  );
}

/**
 * A person inside their team's block: no box of their own. These are divs,
 * not `ul`/`li`, because the chart's connector styles (`.org-tree ul`,
 * `.org-tree li`) would draw lines between them and centre them.
 */
function MemberRow({ person }: { person: StructurePerson }) {
  return (
    <div role="listitem">
      <Link
        href={`/${person.slug}`}
        className="flex items-center justify-start gap-2 rounded-lg text-left px-2 py-1.5 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <PersonAvatar
          name={person.name}
          photoUrl={person.photoUrl}
          colorKey={person.id}
          className="size-7"
          textClassName="text-[0.65rem]"
        />
        <span className="min-w-0">
          <span className="flex">
            <PersonName person={person} />
          </span>
          {person.title && (
            <span className="block truncate text-xs text-muted-foreground">
              {person.title}
            </span>
          )}
        </span>
      </Link>
    </div>
  );
}

/** A team is one block with its people inside it. */
function TeamBlock({
  team,
  className = "w-56",
}: {
  team: StructureTeam;
  className?: string;
}) {
  return (
    <div
      data-slot="team-block"
      className={`rounded-xl border border-border bg-background p-2 ${className}`}
    >
      <Link
        href={`/${team.slug}`}
        className="flex items-center justify-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Users2
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="truncate text-sm font-semibold">{team.name}</span>
      </Link>
      {team.members.length > 0 && (
        <div role="list" className="mt-1 flex flex-col items-stretch">
          {team.members.map((member) => (
            <MemberRow key={member.id} person={member} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A team on its own in the chart (one that isn't in a department). */
function TeamNode({ team }: { team: StructureTeam }) {
  return (
    <Node>
      <TeamBlock team={team} />
    </Node>
  );
}

/**
 * A department is one block with its teams side by side inside it (each
 * team a block with its people stacked), then anyone placed directly in it
 * as one more column. Sub-departments hang below as further blocks.
 */
function DepartmentNode({ department }: { department: StructureDepartment }) {
  const hasContents =
    department.teams.length > 0 || department.people.length > 0;
  return (
    <Node
      nested={department.children.map((child) => (
        <DepartmentNode key={child.id} department={child} />
      ))}
    >
      <div
        data-slot="department-block"
        className="w-max rounded-xl border border-primary/40 bg-primary/5 p-2"
      >
        <Link
          href={`/directory/departments/${department.id}`}
          className="flex items-center justify-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Building2
            className="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="truncate text-sm font-semibold">
            {department.name}
          </span>
        </Link>
        {hasContents && (
          <div className="mt-1 flex flex-row items-start gap-2">
            {department.teams.map((team) => (
              <TeamBlock key={team.id} team={team} className="w-56 shrink-0" />
            ))}
            {department.people.length > 0 && (
              <div
                role="list"
                className="flex w-56 shrink-0 flex-col items-stretch"
              >
                {department.people.map((person) => (
                  <MemberRow key={person.id} person={person} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
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
