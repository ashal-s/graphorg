import { eq } from "drizzle-orm";
import { BookUser, Building2, Network, Users, Users2 } from "lucide-react";

import { AvatarStack } from "@/components/shared/avatar-stack";
import { HubSectionCard } from "@/components/shared/hub-section-card";
import { PageHeader } from "@/components/shared/page-header";
import { TeamChip } from "@/components/shared/team-chip";
import { getDb } from "@/db";
import { departments, people, teams } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { loadTones } from "@/lib/directory/tones";
import { personPhotoSrc } from "@/lib/person-photo";

export default async function DirectoryPage() {
  const session = await requireSession();
  const orgId = session.organizationId;

  const [peopleRows, teamRows, departmentRows, tones] = await Promise.all([
    getDb().query.people.findMany({
      where: eq(people.organizationId, orgId),
      columns: {
        id: true,
        name: true,
        photoUrl: true,
        updatedAt: true,
      },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.departments.findMany({
      where: eq(departments.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    loadTones(orgId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context={{ kind: "directory" }}
        title="Directory"
        icon={BookUser}
        description="Departments, teams and people in your organisation."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <HubSectionCard
          href="/directory/departments"
          icon={Building2}
          title="Departments"
          stat={String(departmentRows.length)}
          description="How teams and people are grouped, and which sit under which."
        >
          {departmentRows.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {departmentRows.slice(0, 4).map((department) => (
                <TeamChip
                  key={department.id}
                  team={{
                    ...department,
                    tone: tones.departments[department.id],
                  }}
                />
              ))}
              {departmentRows.length > 4 && (
                <span className="px-1 py-0.5 text-xs font-medium text-muted-foreground">
                  +{departmentRows.length - 4} more
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              No departments have been created yet.
            </span>
          )}
        </HubSectionCard>

        <HubSectionCard
          href="/directory/teams"
          icon={Users2}
          title="Teams"
          stat={String(teamRows.length)}
          description="The groups people work in, and who leads each one."
        >
          {teamRows.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {teamRows.slice(0, 4).map((team) => (
                <TeamChip
                  key={team.id}
                  team={{ ...team, tone: tones.teams[team.id] }}
                />
              ))}
              {teamRows.length > 4 && (
                <span className="px-1 py-0.5 text-xs font-medium text-muted-foreground">
                  +{teamRows.length - 4} more
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              No teams have been created yet.
            </span>
          )}
        </HubSectionCard>

        <HubSectionCard
          href="/directory/people"
          icon={Users}
          title="People"
          stat={String(peopleRows.length)}
          description="Everyone in your organisation, with their position and teams."
        >
          {peopleRows.length > 0 ? (
            <AvatarStack
              max={6}
              people={peopleRows.map((person) => ({
                id: person.id,
                name: person.name,
                photoSrc: personPhotoSrc(person),
                tone: tones.people[person.id],
              }))}
            />
          ) : (
            <span className="text-xs text-muted-foreground">
              No one has been added yet.
            </span>
          )}
        </HubSectionCard>

        <HubSectionCard
          href="/org-chart"
          icon={Network}
          title="Org chart"
          description="Who reports to whom, laid out from the top down."
        />
      </div>
    </div>
  );
}
