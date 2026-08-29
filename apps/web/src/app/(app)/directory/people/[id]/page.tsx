import { and, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { PersonForm } from "@/components/directory/person-form";
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {person.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Edit this person&apos;s details, or see who they work with below.
          </p>
        </div>
        {!readOnly && (
          <DeleteEntityButton
            entityLabel="person"
            entityName={person.name}
            apiPath={`/api/people/${person.id}`}
            redirectTo="/directory/people"
          />
        )}
      </div>

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
            <Link
              href={`/directory/teams/${person.team.id}`}
              className="inline-block rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
            >
              {person.team.name}
            </Link>
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
            <Link
              href={`/directory/people/${person.manager.id}`}
              className="inline-block rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
            >
              {person.manager.name}
            </Link>
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
          <CardContent className="flex flex-wrap gap-2">
            {directReports.map((report) => (
              <Link
                key={report.id}
                href={`/directory/people/${report.id}`}
                className="rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
              >
                {report.name}
              </Link>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
