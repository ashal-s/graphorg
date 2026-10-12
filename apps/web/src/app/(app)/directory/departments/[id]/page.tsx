import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { DepartmentDialog } from "@/components/directory/department-dialog";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { departments, people, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { departmentSubtreeIds } from "@/lib/directory/departments";

interface PageProps {
  params: Promise<{ id: string }>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** The profile page for one department. Editing happens in a popup. */
export default async function DepartmentPage({ params }: PageProps) {
  const session = await requireSession();
  const canEdit = hasRole(session.role, "editor");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const orgId = session.organizationId;
  const db = getDb();
  const [department, allDepartments, peopleRows, teamRows] = await Promise.all([
    db.query.departments.findFirst({
      where: and(eq(departments.id, id), eq(departments.organizationId, orgId)),
      with: {
        parent: { columns: { id: true, name: true } },
        heads: {
          with: {
            person: {
              columns: { id: true, name: true, slug: true, title: true },
            },
          },
        },
        children: { columns: { id: true, name: true } },
        teams: {
          columns: { isPrimary: true },
          with: { team: { columns: { id: true, name: true, slug: true } } },
        },
        people: {
          columns: { isPrimary: true },
          with: {
            person: {
              columns: { id: true, name: true, slug: true, title: true },
            },
          },
        },
      },
    }),
    db.query.departments.findMany({
      where: eq(departments.organizationId, orgId),
      columns: { id: true, name: true, parentId: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    // The edit popup's pickers; only editors can open it.
    canEdit
      ? db.query.people.findMany({
          where: eq(people.organizationId, orgId),
          columns: { id: true, name: true },
          orderBy: (row, { asc }) => asc(row.name),
        })
      : Promise.resolve([]),
    canEdit
      ? db.query.teams.findMany({
          where: eq(teams.organizationId, orgId),
          columns: { id: true, name: true },
          orderBy: (row, { asc }) => asc(row.name),
        })
      : Promise.resolve([]),
  ]);
  if (!department) notFound();

  // It can't sit under itself or anything beneath it.
  const beneath = departmentSubtreeIds(allDepartments, id);
  const parents = allDepartments.filter((option) => !beneath.has(option.id));

  const byName = <T extends { name: string }>(a: T, b: T) =>
    a.name.localeCompare(b.name);
  const heads = department.heads.map((link) => link.person).sort(byName);
  const memberTeams = department.teams
    .map((link) => ({ ...link.team, isPrimary: link.isPrimary }))
    .sort(byName);
  const memberPeople = department.people
    .map((link) => ({ ...link.person, isPrimary: link.isPrimary }))
    .sort(byName);
  const subDepartments = [...department.children].sort(byName);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context={{ kind: "department", id }}
        title={department.name}
        align="start"
        description={
          department.parent
            ? `Part of ${department.parent.name}.`
            : "A top-level department."
        }
        actions={
          canEdit && (
            <>
              <DepartmentDialog
                variant="outline"
                department={{
                  id,
                  name: department.name,
                  description: department.description,
                  parentId: department.parentId,
                  headPersonIds: heads.map((h) => h.id),
                  teamIds: memberTeams.map((t) => t.id),
                  personIds: memberPeople.map((p) => p.id),
                }}
                parents={parents}
                people={peopleRows}
                teams={teamRows}
              />
              <DeleteEntityButton
                entityLabel="department"
                entityName={department.name}
                apiPath={`/api/departments/${id}`}
                redirectTo="/directory/departments"
                iconOnly
              />
            </>
          )
        }
      />

      <Card>
        <CardContent>
          <dl className="grid max-w-3xl grid-cols-[9rem_1fr] gap-x-4 gap-y-3 text-sm">
            <Field label="Description">
              {department.description ? (
                <span className="whitespace-pre-wrap">
                  {department.description}
                </span>
              ) : (
                <span className="text-muted-foreground">No description</span>
              )}
            </Field>
            <Field label="Parent department">
              {department.parent ? (
                <Link
                  href={`/directory/departments/${department.parent.id}`}
                  className="font-medium hover:underline"
                >
                  {department.parent.name}
                </Link>
              ) : (
                <span className="text-muted-foreground">Top level</span>
              )}
            </Field>
            <Field label={heads.length === 1 ? "Head" : "Heads"}>
              {heads.length === 0 ? (
                <span className="text-muted-foreground">Not assigned</span>
              ) : (
                <ul className="flex flex-col gap-1">
                  {heads.map((head) => (
                    <li key={head.id}>
                      <Link
                        href={`/${head.slug}`}
                        className="font-medium hover:underline"
                      >
                        {head.name}
                      </Link>
                      {head.title && (
                        <span className="ml-2 text-muted-foreground">
                          {head.title}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Field>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sub-departments</CardTitle>
            <CardDescription>
              Departments that sit directly under this one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subDepartments.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {subDepartments.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/directory/departments/${child.id}`}
                      className="font-medium hover:underline"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>
              A badge marks teams whose primary department this is.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {memberTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teams yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {memberTeams.map((team) => (
                  <li key={team.id} className="flex items-center gap-2">
                    <Link
                      href={`/${team.slug}`}
                      className="font-medium hover:underline"
                    >
                      {team.name}
                    </Link>
                    {team.isPrimary && (
                      <Badge variant="secondary">Primary</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>People</CardTitle>
            <CardDescription>
              People assigned to this department directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {memberPeople.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nobody is assigned directly.
              </p>
            ) : (
              <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                {memberPeople.map((person) => (
                  <li key={person.id} className="flex items-center gap-2">
                    <Link
                      href={`/${person.slug}`}
                      className="font-medium hover:underline"
                    >
                      {person.name}
                    </Link>
                    {person.title && (
                      <span className="truncate text-muted-foreground">
                        {person.title}
                      </span>
                    )}
                    {person.isPrimary && (
                      <Badge variant="secondary">Primary</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
