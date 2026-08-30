import { eq } from "drizzle-orm";

import { PageHeader } from "@/components/shared/page-header";
import { WorkflowBuilder } from "@/components/workflows/workflow-builder";
import { getDb } from "@/db";
import { people } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";

export default async function NewWorkflowPage() {
  // Creating a workflow is a write, and the POST /api/workflows route
  // requires the editor role: block viewers from this page entirely rather
  // than let them fill in a form that would only 403 on submit.
  const session = await requireRole("editor");

  const directory = await getDb().query.people.findMany({
    where: eq(people.organizationId, session.organizationId),
    columns: { id: true, name: true, email: true, title: true },
    orderBy: (row, { asc }) => asc(row.name),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New workflow"
        description="Pick a trigger, add steps, and assign who's responsible."
      />
      <WorkflowBuilder mode="create" people={directory} />
    </div>
  );
}
