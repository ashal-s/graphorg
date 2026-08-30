import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { fetchWorkflowDetail } from "@/app/api/workflows/detail";
import { PageHeader } from "@/components/shared/page-header";
import {
  WorkflowBuilder,
  type WorkflowDetail,
} from "@/components/workflows/workflow-builder";
import { getDb } from "@/db";
import { people } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const readOnly = !hasRole(session.role, "editor");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const [workflow, directory] = await Promise.all([
    fetchWorkflowDetail(session.organizationId, id),
    getDb().query.people.findMany({
      where: eq(people.organizationId, session.organizationId),
      columns: { id: true, name: true, email: true, title: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  if (!workflow) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={workflow.name}
        description="Edit this workflow's trigger, steps, and who's responsible."
        align="start"
      />
      <WorkflowBuilder
        mode="edit"
        workflow={workflow as unknown as WorkflowDetail}
        people={directory}
        readOnly={readOnly}
      />
    </div>
  );
}
