import { eq } from "drizzle-orm";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import { DepartmentTree } from "@/components/directory/department-tree";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { departments } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { buildDepartmentTree } from "@/lib/directory/departments";

export default async function DepartmentsPage() {
  const session = await requireSession();
  const canEdit = hasRole(session.role, "editor");

  const rows = await getDb().query.departments.findMany({
    where: eq(departments.organizationId, session.organizationId),
    with: {
      heads: { with: { person: { columns: { name: true } } } },
      teams: { columns: { teamId: true } },
      people: { columns: { personId: true } },
    },
  });

  const roots = buildDepartmentTree(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      description: row.description,
      headNames: row.heads.map((h) => h.person.name).sort(),
      teamCount: row.teams.length,
      peopleCount: row.people.length,
    })),
  );

  const newButton = canEdit && (
    <Button
      render={<Link href="/directory/departments/new" />}
      nativeButton={false}
    >
      <Plus aria-hidden="true" />
      New department
    </Button>
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
