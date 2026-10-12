import { eq } from "drizzle-orm";

import { TeamForm } from "@/components/directory/team-form";
import { PageHeader } from "@/components/shared/page-header";
import { getDb } from "@/db";
import { departments } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";

export default async function NewTeamPage() {
  // Creating a team is a write, and POST /api/teams requires the editor
  // role: block viewers from this page entirely rather than let them fill
  // in a form that would only 403 on submit.
  const session = await requireRole("editor");
  const departmentOptions = await getDb().query.departments.findMany({
    where: eq(departments.organizationId, session.organizationId),
    columns: { id: true, name: true },
    orderBy: (row, { asc }) => asc(row.name),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context={null}
        title="New team"
        description="Add a team to your directory."
      />
      <TeamForm mode="create" departments={departmentOptions} />
    </div>
  );
}
