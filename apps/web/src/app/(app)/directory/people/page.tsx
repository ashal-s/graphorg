import { eq } from "drizzle-orm";

import { PeopleDirectory } from "@/components/directory/people-directory";
import { PersonDialog } from "@/components/directory/person-dialog";
import { Users } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { getDb } from "@/db";
import { departments, organizations, people, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { loadTones } from "@/lib/directory/tones";
import { personPhotoSrc } from "@/lib/person-photo";

export default async function PeoplePage() {
  const session = await requireSession();
  const canEdit = hasRole(session.role, "editor");
  const orgId = session.organizationId;

  // Everyone is sent to the page once; searching and filtering happen in
  // the browser, so results update on every keystroke.
  const [rows, teamOptions, departmentOptions, organization, tones] =
    await Promise.all([
      getDb().query.people.findMany({
        where: eq(people.organizationId, orgId),
        columns: {
          id: true,
          slug: true,
          name: true,
          email: true,
          title: true,
          managerId: true,
          photoUrl: true,
          updatedAt: true,
        },
        with: {
          memberships: {
            columns: {},
            with: { team: { columns: { id: true, name: true } } },
          },
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
      getDb().query.organizations.findFirst({
        where: eq(organizations.id, orgId),
        columns: { emailDomain: true },
      }),
      loadTones(orgId),
    ]);

  // The new-person dialog's manager picker offers everyone.
  const managerOptions = canEdit
    ? rows.map((row) => ({ id: row.id, name: row.name }))
    : [];

  const directory = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    email: row.email,
    title: row.title,
    managerId: row.managerId,
    photoSrc: personPhotoSrc(row),
    teams: row.memberships.map((membership) => ({
      ...membership.team,
      tone: tones.teams[membership.team.id],
    })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context={{ kind: "people" }}
        title="People"
        icon={Users}
        description="Everyone in your organisation's directory."
        actions={
          canEdit && (
            <PersonDialog
              departments={departmentOptions}
              teams={teamOptions}
              managers={managerOptions}
              emailDomain={organization?.emailDomain}
            />
          )
        }
      />

      <PeopleDirectory
        people={directory}
        teams={teamOptions}
        canEdit={canEdit}
        emptyAction={
          <PersonDialog
            departments={departmentOptions}
            teams={teamOptions}
            managers={managerOptions}
            emailDomain={organization?.emailDomain}
            size="sm"
            withIcon={false}
          />
        }
      />
    </div>
  );
}
