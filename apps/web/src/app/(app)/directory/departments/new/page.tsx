import { eq } from "drizzle-orm";
import { forbidden } from "next/navigation";

import { DepartmentForm } from "@/components/directory/department-form";
import { PageHeader } from "@/components/shared/page-header";
import { getDb } from "@/db";
import { departments, people, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

export default async function NewDepartmentPage() {
  const session = await requireSession();
  if (!hasRole(session.role, "editor")) forbidden();
  const orgId = session.organizationId;
  const db = getDb();

  const [parents, peopleRows, teamRows] = await Promise.all([
    db.query.departments.findMany({
      where: eq(departments.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    db.query.people.findMany({
      where: eq(people.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    db.query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context={null}
        title="New department"
        description="Group teams and people, optionally under a parent department."
      />
      <DepartmentForm
        mode="create"
        parents={parents}
        people={peopleRows}
        teams={teamRows}
      />
    </div>
  );
}
