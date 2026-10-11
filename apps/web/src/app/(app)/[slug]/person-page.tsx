import { Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HighlightSection } from "@/components/shell/highlight-section";
import { PersonDialog } from "@/components/directory/person-dialog";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { ResourceStats } from "@/components/shared/resource-stats";
import { TeamChip } from "@/components/shared/team-chip";
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

  const [loaded, terminology, tones] = await Promise.all([
    loadPersonProfile(session.organizationId, id, {
      withAssignOptions: canDelete,
    }),
    getTerminology(session.organizationId),
    loadTones(session.organizationId),
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
        </div>

        {(canEdit || canDelete) && (
          <div className="flex shrink-0 gap-2">
            {canEdit && (
              <PersonDialog
                person={{
                  id: person.id,
                  name: person.name,
                  email: person.email,
                  title: person.title,
                  photoSrc,
                  teamIds: person.teamIds,
                  managerId: person.managerId,
                }}
                teams={teamOptions}
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
        )}
      </header>

      <ResourceStats resources={resources} />
    </div>
  );
}
