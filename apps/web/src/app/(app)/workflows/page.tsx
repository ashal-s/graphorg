import { eq } from "drizzle-orm";
import Link from "next/link";
import { Plus, Workflow as WorkflowIcon } from "lucide-react";

import { EntityRow } from "@/components/shared/entity-row";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import { getDb } from "@/db";
import { workflows } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  draft: "outline",
  active: "default",
  archived: "secondary",
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  entity_created: "On entity created",
  entity_updated: "On entity updated",
  scheduled: "Scheduled",
};

export default async function WorkflowsPage() {
  const session = await requireSession();
  const canEdit = hasRole(session.role, "editor");

  const rows = await getDb().query.workflows.findMany({
    where: eq(workflows.organizationId, session.organizationId),
    with: {
      people: { with: { person: { columns: { id: true, name: true } } } },
    },
    orderBy: (row, { asc }) => asc(row.name),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workflows"
        description="Triggers, conditions and actions your organisation runs by hand or on a schedule."
        actions={
          canEdit && (
            <Button
              render={<Link href="/workflows/new" />}
              nativeButton={false}
            >
              <Plus aria-hidden="true" />
              New workflow
            </Button>
          )
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={
            <WorkflowIcon
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
          }
          title="No workflows yet"
          description={
            canEdit
              ? "Create your first workflow to document a trigger, its steps, and who's responsible."
              : "Nobody has created a workflow yet."
          }
          action={
            canEdit && (
              <Button
                size="sm"
                render={<Link href="/workflows/new" />}
                nativeButton={false}
              >
                New workflow
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((workflow) => {
            const owners = workflow.people.filter(
              (assignment) => assignment.role === "owner",
            );
            return (
              <EntityRow
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
                title={workflow.name}
                titleBadge={
                  <Badge variant={STATUS_VARIANT[workflow.status] ?? "outline"}>
                    {workflow.status}
                  </Badge>
                }
                meta={
                  <>
                    {TRIGGER_LABELS[workflow.triggerType] ??
                      workflow.triggerType}
                    {owners.length > 0 &&
                      ` · Owned by ${owners.map((assignment) => assignment.person.name).join(", ")}`}
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
