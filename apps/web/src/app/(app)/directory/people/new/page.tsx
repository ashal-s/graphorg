import { eq } from "drizzle-orm";

import { PersonForm } from "@/components/directory/person-form";
import { PageHeader } from "@/components/shared/page-header";
import { getDb } from "@/db";
import { people, teams } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";

export default async function NewPersonPage() {
  // Creating a person is a write, and POST /api/people requires the editor
  // role: block viewers from this page entirely rather than let them fill
  // in a form that would only 403 on submit.
  const session = await requireRole("editor");
  const orgId = session.organizationId;

  const [teamOptions, managerOptions] = await Promise.all([
    getDb().query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.people.findMany({
      where: eq(people.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New person"
        description="Add someone to your directory."
      />
      <PersonForm mode="create" teams={teamOptions} managers={managerOptions} />
    </div>
  );
}
