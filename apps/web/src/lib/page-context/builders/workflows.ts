import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { workflows } from "@/db/schema";

import { contextPaths } from "../paths";
import type { PageContext } from "../types";

export async function buildWorkflows(orgId: string): Promise<PageContext> {
  const rows = await getDb().query.workflows.findMany({
    where: eq(workflows.organizationId, orgId),
    columns: { id: true, name: true, status: true, triggerType: true },
    with: { steps: { columns: { id: true } } },
    orderBy: asc(workflows.name),
  });

  return {
    page: "Workflows",
    path: "/workflows",
    data: {
      count: rows.length,
      workflows: rows.map((w) => ({
        name: w.name,
        status: w.status,
        trigger: w.triggerType,
        stepCount: w.steps.length,
        path: contextPaths.workflow(w.id),
      })),
    },
  };
}

/** One workflow in full: trigger, ordered steps and who is assigned. */
export async function buildWorkflow(
  orgId: string,
  id: string,
): Promise<PageContext | null> {
  const workflow = await getDb().query.workflows.findFirst({
    where: and(eq(workflows.id, id), eq(workflows.organizationId, orgId)),
    with: {
      steps: { orderBy: (step, { asc }) => asc(step.stepOrder) },
      people: {
        with: {
          person: { columns: { name: true, slug: true, title: true } },
        },
      },
    },
  });
  if (!workflow) return null;

  return {
    page: workflow.name,
    path: contextPaths.workflow(workflow.id),
    data: {
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      trigger: { type: workflow.triggerType, config: workflow.triggerConfig },
      steps: workflow.steps.map((s) => ({
        order: s.stepOrder,
        kind: s.kind,
        type: s.type,
        config: s.config,
      })),
      people: workflow.people.map((l) => ({
        role: l.role,
        name: l.person.name,
        title: l.person.title,
        path: contextPaths.person(l.person.slug),
      })),
    },
  };
}
