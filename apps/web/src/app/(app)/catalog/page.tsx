import { eq } from "drizzle-orm";
import { Layers, Wrench } from "lucide-react";

import {
  HubChipList,
  HubSectionCard,
} from "@/components/shared/hub-section-card";
import { PageHeader } from "@/components/shared/page-header";
import { getDb } from "@/db";
import { services, tools } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { lowerLabel } from "@/lib/terminology";
import { getTerminology } from "@/lib/terminology-server";

export default async function CatalogPage() {
  const session = await requireSession();
  const orgId = session.organizationId;

  const [terminology, serviceRows, toolRows] = await Promise.all([
    getTerminology(orgId),
    getDb().query.services.findMany({
      where: eq(services.organizationId, orgId),
      columns: { id: true, name: true, parentId: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.tools.findMany({
      where: eq(tools.organizationId, orgId),
      columns: { id: true, name: true, category: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  const serviceTerms = terminology.services;
  const toolTerms = terminology.tools;
  // Prefer top-level platforms for the preview chips.
  const previewServices = serviceRows.filter((row) => !row.parentId);
  const serviceChips =
    previewServices.length > 0 ? previewServices : serviceRows;

  const categoryChips = Object.entries(
    toolRows.reduce<Record<string, number>>((acc, tool) => {
      acc[tool.category] = (acc[tool.category] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category]) => ({
      id: category,
      name: category.replaceAll("_", " "),
    }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context={{ kind: "catalog" }}
        title="Catalog"
        description={`${serviceTerms.plural} and ${lowerLabel(toolTerms.plural)} across your organization.`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <HubSectionCard
          href="/catalog/services"
          icon={Layers}
          title={serviceTerms.plural}
          stat={String(serviceRows.length)}
          description={serviceTerms.description}
        >
          <HubChipList
            items={serviceChips}
            empty={`No ${lowerLabel(serviceTerms.plural)} have been added yet.`}
          />
        </HubSectionCard>

        <HubSectionCard
          href="/catalog/tools"
          icon={Wrench}
          title={toolTerms.plural}
          stat={String(toolRows.length)}
          description={toolTerms.description}
        >
          <HubChipList
            items={
              categoryChips.length > 0
                ? categoryChips
                : toolRows.map((tool) => ({ id: tool.id, name: tool.name }))
            }
            empty={`No ${lowerLabel(toolTerms.plural)} have been added yet.`}
          />
        </HubSectionCard>
      </div>
    </div>
  );
}
