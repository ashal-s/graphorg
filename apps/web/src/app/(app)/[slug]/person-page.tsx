import { eq } from "drizzle-orm";
import { Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HighlightSection } from "@/components/shell/highlight-section";
import { PersonDialog } from "@/components/directory/person-dialog";
import { CopyContextButton } from "@/components/shared/copy-context-button";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { ResourceStats } from "@/components/shared/resource-stats";
import { TeamChip } from "@/components/shared/team-chip";
import { getDb } from "@/db";
import { departmentPeople, departments, teamMembers } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { loadPersonProfile } from "@/lib/directory/load-person-profile";
import { loadTones } from "@/lib/directory/tones";
import { personPhotoSrc } from "@/lib/person-photo";
import { buildPersonResources } from "@/lib/directory/person-resources";
import { getTerminology } from "@/lib/terminology-server";

/** The profile page for one person, served at `/<their slug>`. */
export async function PersonPage({ id }: { id: string }) {
  const session = await requireSession();
  // Editing someone's details is an owner/admin action; removing a person
  // keeps its existing editor-level access.
  const canEdit = hasRole(session.role, "admin");
  const canDelete = hasRole(session.role, "editor");

  const [
    loaded,
    terminology,
    tones,
    departmentLinks,
    departmentOptions,
    teamLinks,
  ] = await Promise.all([
    loadPersonProfile(session.organizationId, id, {
      withAssignOptions: canDelete,
    }),
    getTerminology(session.organizationId),
    loadTones(session.organizationId),
    getDb().query.departmentPeople.findMany({
      where: eq(departmentPeople.personId, id),
      columns: { isPrimary: true },
      with: { department: { columns: { id: true, name: true } } },
    }),
    getDb().query.departments.findMany({
      where: eq(departments.organizationId, session.organizationId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.teamMembers.findMany({
      where: eq(teamMembers.personId, id),
      columns: { teamId: true, isPrimary: true },
    }),
  ]);
  if (!loaded) notFound();

  const {
    person,
    teamOptions,
    managerOptions,
    workflowOptions,
    serviceOptions,
    profile,
  } = loaded;
  // Assigning someone to teams, workflows and services is editor-level, as
  // it is from the team and workflow pages. Direct reports change another
  // person's manager, so that is admin-level like the rest of person edits.
  const photoSrc = personPhotoSrc(person);
  const primaryTeamId = teamLinks.find((l) => l.isPrimary)?.teamId;
  const primaryTeam =
    profile.teams.find((team) => team.id === primaryTeamId) ?? null;
  const resources = buildPersonResources(
    profile,
    terminology,
    hasRole(session.role, "editor")
      ? {
          personId: person.id,
          canAssign: true,
          canAssignReports: canEdit,
          teams: teamOptions,
          workflows: workflowOptions,
          services: serviceOptions,
          people: managerOptions,
        }
      : undefined,
  );

  return (
    <div className="flex flex-col gap-8">
      <HighlightSection href="/directory" />
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <PersonAvatar
          name={person.name}
          photoUrl={photoSrc}
          className="size-24"
          textClassName="text-3xl"
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {person.name}
          </h1>
          {person.title && (
            <p className="text-base text-muted-foreground">{person.title}</p>
          )}

          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Email</dt>
              <Mail
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <dd>
                <a href={`mailto:${person.email}`} className="hover:underline">
                  {person.email}
                </a>
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Reports to</dt>
              <UserRound
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <dd>
                {profile.manager ? (
                  <>
                    <span className="text-muted-foreground">Reports to </span>
                    <Link
                      href={`/${profile.manager.slug}`}
                      className="font-medium hover:underline"
                    >
                      {profile.manager.name}
                    </Link>
                  </>
                ) : (
                  <span className="text-muted-foreground">No manager set</span>
                )}
              </dd>
            </div>
          </dl>

          {profile.teams.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {profile.teams.map((team) => (
                <li key={team.id}>
                  <TeamChip
                    team={{ ...team, tone: tones.teams[team.id] }}
                    href={`/${team.slug}`}
                  />
                </li>
              ))}
            </ul>
          )}
          {(primaryTeam || departmentLinks.length > 0) && (
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {primaryTeam && profile.teams.length > 1 && (
                <span>
                  <span className="text-muted-foreground">Primary team </span>
                  <Link
                    href={`/${primaryTeam.slug}`}
                    className="font-medium hover:underline"
                  >
                    {primaryTeam.name}
                  </Link>
                </span>
              )}
              {departmentLinks.length > 0 && (
                <span>
                  <span className="text-muted-foreground">
                    {departmentLinks.length === 1
                      ? "Department "
                      : "Departments "}
                  </span>
                  {[...departmentLinks]
                    .sort((a, b) =>
                      a.department.name.localeCompare(b.department.name),
                    )
                    .map((link, index) => (
                      <span key={link.department.id}>
                        {index > 0 && ", "}
                        <Link
                          href={`/directory/departments/${link.department.id}`}
                          className="font-medium hover:underline"
                        >
                          {link.department.name}
                        </Link>
                        {link.isPrimary && departmentLinks.length > 1 && (
                          <span className="text-muted-foreground">
                            {" "}
                            (primary)
                          </span>
                        )}
                      </span>
                    ))}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <CopyContextButton scope={{ kind: "person", id: person.id }} />
          {canEdit && (
            <PersonDialog
              person={{
                id: person.id,
                name: person.name,
                email: person.email,
                title: person.title,
                photoSrc,
                teamIds: person.teamIds,
                primaryTeamId:
                  teamLinks.find((l) => l.isPrimary)?.teamId ?? null,
                departmentIds: departmentLinks.map((l) => l.department.id),
                primaryDepartmentId:
                  departmentLinks.find((l) => l.isPrimary)?.department.id ??
                  null,
                managerId: person.managerId,
              }}
              teams={teamOptions}
              departments={departmentOptions}
              managers={managerOptions}
              variant="outline"
              iconOnly
            />
          )}
          {canDelete && (
            <DeleteEntityButton
              entityLabel="person"
              entityName={person.name}
              apiPath={`/api/people/${person.id}`}
              redirectTo="/directory/people"
              iconOnly
            />
          )}
        </div>
      </header>

      <ResourceStats resources={resources} />
    </div>
  );
}
