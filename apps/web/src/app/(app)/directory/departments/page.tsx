import { eq } from "drizzle-orm";
import { Building2 } from "lucide-react";

import { DepartmentDialog } from "@/components/directory/department-dialog";
import { DepartmentTree } from "@/components/directory/department-tree";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { getDb } from "@/db";
import { departments, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { buildDepartmentTree } from "@/lib/directory/departments";

export default async function DepartmentsPage() {
  const session = await requireSession();
  const canEdit = hasRole(session.role, "editor");

  const orgId = session.organizationId;
  const db = getDb();
  const [rows, teamOptions] = await Promise.all([
    db.query.departments.findMany({
      where: eq(departments.organizationId, orgId),
      with: {
        teams: { columns: { teamId: true } },
        people: {
          columns: { role: true },
          with: { person: { columns: { name: true } } },
        },
      },
    }),
    canEdit
      ? db.query.teams.findMany({
          where: eq(teams.organizationId, orgId),
          columns: { id: true, name: true },
          orderBy: (row, { asc }) => asc(row.name),
        })
      : Promise.resolve([]),
  ]);

  const roots = buildDepartmentTree(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      description: row.description,
      leadNames: row.people
        .filter((link) => link.role === "lead")
        .map((link) => link.person.name)
        .sort(),
      teamCount: row.teams.length,
      peopleCount: row.people.length,
    })),
  );

  const parentOptions = rows
    .map((row) => ({ id: row.id, name: row.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const newButton = canEdit && (
    <DepartmentDialog parents={parentOptions} teams={teamOptions} />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context={{ kind: "departments" }}
        title="Departments"
        icon={Building2}
        description="How teams and people are grouped, with sub-departments nested under their parent."
        actions={newButton}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={
            <Building2
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
          }
          title="No departments yet"
          description={
            canEdit
              ? "Create a department, then put teams and people in it."
              : "Nobody has created a department yet."
          }
          action={newButton}
        />
      ) : (
        <DepartmentTree roots={roots} />
      )}
    </div>
  );
}
