import { and, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PersonForm } from "@/components/directory/person-form";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { EntityChipList } from "@/components/shared/entity-row";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { people, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const readOnly = !hasRole(session.role, "editor");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const orgId = session.organizationId;
  const [person, teamOptions, managerOptions, directReports] =
    await Promise.all([
      getDb().query.people.findFirst({
        where: and(eq(people.id, id), eq(people.organizationId, orgId)),
        with: {
          team: { columns: { id: true, name: true } },
          manager: { columns: { id: true, name: true } },
        },
      }),
      getDb().query.teams.findMany({
        where: eq(teams.organizationId, orgId),
        columns: { id: true, name: true },
        orderBy: (row, { asc }) => asc(row.name),
      }),
      getDb().query.people.findMany({
        // Nobody can manage themselves, so this person is excluded from
        // their own manager picker.
        where: and(eq(people.organizationId, orgId), ne(people.id, id)),
        columns: { id: true, name: true },
        orderBy: (row, { asc }) => asc(row.name),
      }),
      getDb().query.people.findMany({
        where: and(eq(people.managerId, id), eq(people.organizationId, orgId)),
        orderBy: (row, { asc }) => asc(row.name),
      }),
    ]);

  if (!person) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={person.name}
        description="Edit this person's details, or see who they work with below."
        align="start"
        actions={
          !readOnly && (
            <DeleteEntityButton
              entityLabel="person"
              entityName={person.name}
              apiPath={`/api/people/${person.id}`}
              redirectTo="/directory/people"
            />
          )
        }
      />

      <PersonForm
        mode="edit"
        person={person}
        teams={teamOptions}
        managers={managerOptions}
        readOnly={readOnly}
      />

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>
            {person.team ? "This person's team." : "Not on a team."}
          </CardDescription>
        </CardHeader>
        {person.team && (
          <CardContent>
            <EntityChipList
              items={[
                {
                  key: person.team.id,
                  href: `/directory/teams/${person.team.id}`,
                  label: person.team.name,
                },
              ]}
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manager</CardTitle>
          <CardDescription>
            {person.manager ? "Who this person reports to." : "No manager set."}
          </CardDescription>
        </CardHeader>
        {person.manager && (
          <CardContent>
            <EntityChipList
              items={[
                {
                  key: person.manager.id,
                  href: `/directory/people/${person.manager.id}`,
                  label: person.manager.name,
                },
              ]}
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Direct reports</CardTitle>
          <CardDescription>
            {directReports.length === 0
              ? "Nobody reports to this person."
              : `${directReports.length} ${directReports.length === 1 ? "person reports" : "people report"} to this person.`}
          </CardDescription>
        </CardHeader>
        {directReports.length > 0 && (
          <CardContent>
            <EntityChipList
              items={directReports.map((report) => ({
                key: report.id,
                href: `/directory/people/${report.id}`,
                label: report.name,
              }))}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
