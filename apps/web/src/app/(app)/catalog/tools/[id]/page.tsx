import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { RelatedRecordLink } from "@/components/directory/related-record-link";
import { ToolForm } from "@/components/catalog/tool-form";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { serviceTools, tools } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { lowerLabel } from "@/lib/terminology";
import { getTerminology } from "@/lib/terminology-server";

import { loadToolCategories } from "../../categories";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ToolDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const readOnly = !hasRole(session.role, "editor");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const orgId = session.organizationId;
  const [terminology, tool, links, categories] = await Promise.all([
    getTerminology(orgId),
    getDb().query.tools.findFirst({
      where: and(eq(tools.id, id), eq(tools.organizationId, orgId)),
    }),
    getDb().query.serviceTools.findMany({
      where: eq(serviceTools.toolId, id),
      with: {
        service: { columns: { id: true, name: true, organizationId: true } },
      },
    }),
    loadToolCategories(orgId),
  ]);
  if (!tool) notFound();

  const relatedServices = links
    .map((link) => link.service)
    .filter((service) => service.organizationId === orgId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const toolTerms = terminology.tools;
  const serviceTerms = terminology.services;
  const singular = lowerLabel(toolTerms.singular);
  const servicePlural = lowerLabel(serviceTerms.plural);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context={{ kind: "tool", id: tool.id }}
        title={tool.name}
        description={`Edit this ${singular}'s details, or see where it's used below.`}
        align="start"
        actions={
          !readOnly && (
            <DeleteEntityButton
              entityLabel={singular}
              entityName={tool.name}
              apiPath={`/api/tools/${tool.id}`}
              redirectTo="/catalog/tools"
            />
          )
        }
      />

      <ToolForm
        mode="edit"
        tool={tool}
        terms={toolTerms}
        categories={categories}
        readOnly={readOnly}
      />

      <Card>
        <CardHeader>
          <CardTitle>Used by</CardTitle>
          <CardDescription>
            {relatedServices.length === 0
              ? `No ${servicePlural} use this ${singular} yet.`
              : `${relatedServices.length} ${relatedServices.length === 1 ? lowerLabel(serviceTerms.singular) : servicePlural} use this ${singular}.`}
          </CardDescription>
        </CardHeader>
        {relatedServices.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {relatedServices.map((service) => (
              <RelatedRecordLink
                key={service.id}
                href={`/catalog/services/${service.id}`}
              >
                {service.name}
              </RelatedRecordLink>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
