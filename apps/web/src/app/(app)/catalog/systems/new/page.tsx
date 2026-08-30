import { eq } from "drizzle-orm";

import { SystemForm } from "@/components/catalog/system-form";
import { PageHeader } from "@/components/shared/page-header";
import { getDb } from "@/db";
import { teams } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";

export default async function NewSystemPage() {
  // Creating a system is a write, and POST /api/systems requires the editor
  // role: block viewers from this page entirely rather than let them fill
  // in a form that would only 403 on submit.
  const session = await requireRole("editor");

  const teamOptions = await getDb().query.teams.findMany({
    where: eq(teams.organizationId, session.organizationId),
    columns: { id: true, name: true },
    orderBy: (row, { asc }) => asc(row.name),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New system"
        description="Add a system to your catalog."
      />
      <SystemForm mode="create" teams={teamOptions} />
    </div>
  );
}
