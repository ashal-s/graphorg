import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { DepartmentAddDialog } from "@/components/directory/department-add-dialog";
import { DepartmentDialog } from "@/components/directory/department-dialog";
import { TeamMembers } from "@/components/directory/team-members";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/db";
import { departments, people, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { personPhotoSrc } from "@/lib/person-photo";
import {
  departmentAncestorIds,
  departmentSubtreeIds,
} from "@/lib/directory/departments";

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

/** A titled part of the page: heading, count, and actions on the right. */
function Section({
  title,
  count,
  actions,
  children,
}: {
  title: string;
  count: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {title}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {count}
          </span>
        </h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
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
        children: { columns: { id: true, name: true } },
        teams: {
          columns: { isPrimary: true },
          with: { team: { columns: { id: true, name: true, slug: true } } },
        },
        people: {
          columns: { isPrimary: true, role: true },
          with: { person: true },
        },
      },
    }),
    db.query.departments.findMany({
      where: eq(departments.organizationId, orgId),
      columns: { id: true, name: true, parentId: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    // Everyone, with their other departments, for the "Add person" picker.
    // Skipped for viewers, who can't add anyone.
    canEdit
      ? db.query.people.findMany({
          where: eq(people.organizationId, orgId),
          columns: { id: true, name: true, title: true },
          with: {
            departmentLinks: {
              columns: { departmentId: true },
              with: { department: { columns: { name: true } } },
            },
          },
          orderBy: (row, { asc }) => asc(row.name),
        })
      : Promise.resolve([]),
    // The edit popup's team picker; only editors can open it.
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

  // A department can take on anything except itself and what's above it
  // (that would be a loop), and what's already directly under it.
  const above = departmentAncestorIds(allDepartments, id);
  const subDepartmentOptions = allDepartments.filter(
    (option) =>
      option.id !== id && !above.has(option.id) && option.parentId !== id,
  );

  const byName = <T extends { name: string }>(a: T, b: T) =>
    a.name.localeCompare(b.name);
  const memberTeams = department.teams
    .map((link) => ({ ...link.team, isPrimary: link.isPrimary }))
    .sort(byName);
  const members = department.people
    .filter((link) => link.person.organizationId === orgId)
    .map((link) => ({
      id: link.person.id,
      slug: link.person.slug,
      name: link.person.name,
      title: link.person.title,
      email: link.person.email,
      photoUrl: personPhotoSrc(link.person),
      teamRole: link.role,
    }))
    .sort(byName);
  const memberIds = new Set(members.map((member) => member.id));
  // Everyone not already in it, noting the other departments they're in.
  const candidates = peopleRows
    .filter((person) => !memberIds.has(person.id))
    .map((person) => ({
      id: person.id,
      name: person.name,
      title: person.title,
      otherNames: person.departmentLinks
        .map((link) => link.department.name)
        .sort((a, b) => a.localeCompare(b)),
    }));
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
                iconOnly
                department={{
                  id,
                  name: department.name,
                  description: department.description,
                  parentId: department.parentId,
                  teamIds: memberTeams.map((t) => t.id),
                }}
                parents={parents}
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
      </dl>

      <Section
        title="Sub-departments"
        count={subDepartments.length}
        actions={
          canEdit && (
            <>
              <DepartmentAddDialog
                kind="sub-departments"
                departmentId={id}
                departmentName={department.name}
                existingIds={[]}
                options={subDepartmentOptions}
              />
              <DepartmentDialog
                variant="outline"
                size="sm"
                label="New sub-department"
                initialParentId={id}
                parents={allDepartments}
                teams={teamRows}
              />
            </>
          )
        }
      >
        {subDepartments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sub-departments yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {subDepartments.map((child) => (
              <li key={child.id} className="py-2">
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
      </Section>

      <Section
        title="Teams"
        count={memberTeams.length}
        actions={
          canEdit && (
            <DepartmentAddDialog
              kind="teams"
              departmentId={id}
              departmentName={department.name}
              existingIds={memberTeams.map((t) => t.id)}
              options={teamRows.filter(
                (t) => !memberTeams.some((m) => m.id === t.id),
              )}
            />
          )
        }
      >
        {memberTeams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {memberTeams.map((team) => (
              <li key={team.id} className="flex items-center gap-2 py-2">
                <Link
                  href={`/${team.slug}`}
                  className="font-medium hover:underline"
                >
                  {team.name}
                </Link>
                {team.isPrimary && (
                  <Badge variant="secondary">Primary department</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <TeamMembers
        kind="department"
        teamId={id}
        members={members}
        candidates={candidates}
        readOnly={!canEdit}
      />
    </div>
  );
}
