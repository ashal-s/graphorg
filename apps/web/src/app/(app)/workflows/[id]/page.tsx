import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { fetchWorkflowDetail } from "@/app/api/workflows/detail";
import {
  WorkflowBuilder,
  type WorkflowDetail,
} from "@/components/workflows/workflow-builder";
import { getDb } from "@/db";
import { people } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowDetailPage({ params }: PageProps) {
  const session = await requireSession();
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {workflow.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Edit this workflow&apos;s trigger, steps, and who&apos;s
          responsible.
        </p>
      </div>
      <WorkflowBuilder
        mode="edit"
        workflow={workflow as unknown as WorkflowDetail}
        people={directory}
      />
    </div>
  );
}
