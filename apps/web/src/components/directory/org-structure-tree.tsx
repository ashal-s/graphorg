import Link from "next/link";
import { Building2, ChevronRight, Users2 } from "lucide-react";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { Badge } from "@/components/ui/badge";
import type {
  OrgStructure,
  StructureDepartment,
  StructurePerson,
  StructureTeam,
} from "@/lib/directory/org-structure";

function Chevron() {
  return (
    <ChevronRight
      className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
      aria-hidden="true"
    />
  );
}

function Person({ person }: { person: StructurePerson }) {
  return (
    <li>
      <Link
        href={`/${person.slug}`}
        className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/60"
      >
        <PersonAvatar
          name={person.name}
          photoUrl={person.photoUrl}
          colorKey={person.id}
          className="size-6"
          textClassName="text-[0.6rem]"
        />
        <span className="font-medium">{person.name}</span>
        {person.title && (
          <span className="truncate text-muted-foreground">{person.title}</span>
        )}
        {person.teamRole === "lead" && <Badge variant="secondary">Lead</Badge>}
      </Link>
    </li>
  );
}

/** Children sit under their parent, indented along a guide line. */
function Children({ children }: { children: React.ReactNode }) {
  return (
    <ul className="ml-2 flex flex-col border-l border-border pl-4">
      {children}
    </ul>
  );
}

function Team({ team }: { team: StructureTeam }) {
  return (
    <li>
      <details open className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
          <Chevron />
          <Users2
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <Link
            href={`/${team.slug}`}
            className="text-sm font-medium hover:underline"
          >
            {team.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {team.members.length}
          </span>
        </summary>
        {team.members.length > 0 && (
          <Children>
            {team.members.map((member) => (
              <Person key={member.id} person={member} />
            ))}
          </Children>
        )}
      </details>
    </li>
  );
}

function Department({ department }: { department: StructureDepartment }) {
  const hasContent =
    department.children.length > 0 ||
    department.teams.length > 0 ||
    department.people.length > 0;

  return (
    <li>
      <details open className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
          <Chevron />
          <Building2
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <Link
            href={`/directory/departments/${department.id}`}
            className="font-semibold hover:underline"
          >
            {department.name}
          </Link>
          {department.heads.length > 0 && (
            <span className="truncate text-sm text-muted-foreground">
              {department.heads.map((head) => head.name).join(", ")}
            </span>
          )}
        </summary>
        {hasContent && (
          <Children>
            {department.children.map((child) => (
              <Department key={child.id} department={child} />
            ))}
            {department.teams.map((team) => (
              <Team key={team.id} team={team} />
            ))}
            {department.people.map((person) => (
              <Person key={person.id} person={person} />
            ))}
          </Children>
        )}
      </details>
    </li>
  );
}

/**
 * Departments (with their sub-departments), the teams in each, and the
 * people on each team, as an outline you can fold. Teams outside any
 * department and people with no place are listed after, so everyone shows.
 */
export function OrgStructureTree({ structure }: { structure: OrgStructure }) {
  const { departments, teamsWithoutDepartment, peopleWithoutPlace } = structure;

  return (
    <div className="flex flex-col gap-6">
      {departments.length > 0 && (
        <ul className="flex flex-col gap-1">
          {departments.map((department) => (
            <Department key={department.id} department={department} />
          ))}
        </ul>
      )}

      {teamsWithoutDepartment.length > 0 && (
        <section className="flex flex-col gap-1">
          <h2 className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Teams without a department
          </h2>
          <ul className="flex flex-col">
            {teamsWithoutDepartment.map((team) => (
              <Team key={team.id} team={team} />
            ))}
          </ul>
        </section>
      )}

      {peopleWithoutPlace.length > 0 && (
        <section className="flex flex-col gap-1">
          <h2 className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            People without a team or department
          </h2>
          <ul className="flex flex-col">
            {peopleWithoutPlace.map((person) => (
              <Person key={person.id} person={person} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
